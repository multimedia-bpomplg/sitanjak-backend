// controllers/LaporanAkhir.Controller.ts

import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import LaporanAkhir from "../models/LaporanAkhir";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { uploadLaporanAkhir } from "../middlewares/upload.middleware";
import { createNotification } from "../services/notificationService";

/* ================= DATE HELPERS (WIB) ================= */
function getNowWIB(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateIso(raw?: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

function shiftIsoDate(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + deltaDays));
}

function formatIsoToIndo(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanupUploadedFiles(files: Array<{ path?: string } | undefined>) {
  for (const f of files) {
    if (!f?.path) continue;
    try {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch {
      // ignore cleanup error
    }
  }
}

/* ================= GET LAPORAN AKHIR (PESERTA) ================= */
export const getLaporanAkhir = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const laporan = await LaporanAkhir.findOne({ user: userId }).populate(
      "approvedByMentor",
      "name email",
    );

    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir belum ada" });
    }

    res.json(laporan);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil laporan akhir" });
  }
};

/* ================= UPLOAD LAPORAN AKHIR PDF ================= */
export const uploadLaporanAkhirPdf = async (req: any, res: Response) => {
  const file = req.files?.file?.[0];
  const lampiran1 = req.files?.lampiran1?.[0];
  const lampiran2 = req.files?.lampiran2?.[0];

  try {
    const userId = req.user.id;
    const email = (req.user.email || "").toLowerCase();

    const exists = await LaporanAkhir.findOne({ user: userId });

    if (exists && exists.status !== "Revisi") {
      cleanupUploadedFiles([file, lampiran1, lampiran2]);
      return res.status(400).json({
        message: "Laporan akhir sudah dikirim",
      });
    }

    // Validasi H-10 sebelum magang selesai
    const emailRegex = email ? new RegExp(`^${escapeRegex(email)}$`, "i") : null;
    const pendaftaran = await Pendaftaran.findOne({
      status: "Disetujui",
      $or: [
        { "peserta.user": userId },
        ...(emailRegex ? [{ "peserta.email": emailRegex }] : []),
      ],
    }).sort({ createdAt: -1 });

    const peserta = pendaftaran?.peserta.find(
      (p: any) =>
        p.user?.toString() === userId ||
        (email && p.email?.toLowerCase() === email),
    );

    if (peserta?.statusMagang === "Tidak Magang") {
      cleanupUploadedFiles([file, lampiran1, lampiran2]);
      return res.status(403).json({
        message: "Status magang Anda tidak aktif.",
      });
    }

    const endIso = parseDateIso(peserta?.tanggalSelesaiMagang);
    if (!exists && endIso) {
      const todayIso = toIsoDate(getNowWIB());
      const openUploadIso = shiftIsoDate(endIso, -10);
      if (todayIso < openUploadIso) {
        cleanupUploadedFiles([file, lampiran1, lampiran2]);
        return res.status(403).json({
          message: `Unggah Laporan Akhir hanya dibuka mulai H-10 sebelum magang selesai (${formatIsoToIndo(openUploadIso)}).`,
        });
      }
    }

    if (!file) {
      cleanupUploadedFiles([lampiran1, lampiran2]);
      return res.status(400).json({
        message: "File laporan wajib diupload",
      });
    }

    if (lampiran1 && lampiran1.size > 2 * 1024 * 1024) {
      cleanupUploadedFiles([file, lampiran1, lampiran2]);
      return res.status(400).json({
        message: "Lampiran 1 maksimal 2MB",
      });
    }

    if (lampiran2 && lampiran2.size > 2 * 1024 * 1024) {
      cleanupUploadedFiles([file, lampiran1, lampiran2]);
      return res.status(400).json({
        message: "Lampiran 2 maksimal 2MB",
      });
    }

    if (exists && exists.status === "Revisi") {
      const prevPaths = [
        exists.filePdf ? { path: exists.filePdf } : undefined,
        lampiran1 && exists.lampiran1Pdf ? { path: exists.lampiran1Pdf } : undefined,
        lampiran2 && exists.lampiran2Pdf ? { path: exists.lampiran2Pdf } : undefined,
      ];

      exists.filePdf = file.path;
      exists.fileName = file.originalname;
      exists.fileSize = file.size;

      if (lampiran1) {
        exists.lampiran1Pdf = lampiran1.path;
        exists.lampiran1Name = lampiran1.originalname;
        exists.lampiran1Size = lampiran1.size;
      }
      if (lampiran2) {
        exists.lampiran2Pdf = lampiran2.path;
        exists.lampiran2Name = lampiran2.originalname;
        exists.lampiran2Size = lampiran2.size;
      }

      exists.status = "Menunggu";
      exists.mentorNote = "";
      exists.set("approvedByMentor", null);
      exists.approvedAt = undefined;
      exists.submittedAt = new Date();
      await exists.save();

      cleanupUploadedFiles(prevPaths);

      if ((peserta as any)?.mentor) {
        createNotification({
          recipientId: (peserta as any).mentor,
          title: "Revisi Laporan Akhir Dikirim",
          message: `${peserta?.nama || "Peserta"} telah mengunggah ulang revisi laporan akhir magang untuk ditinjau.`,
          type: "info",
          linkUrl: "/dashboard/mentor/ViewLaporanAkhir",
        });
      }

      return res.status(200).json({
        message: "Revisi laporan akhir berhasil diunggah",
        laporan: exists,
      });
    }

    const laporan = await LaporanAkhir.create({
      user: userId,

      filePdf: file.path,
      fileName: file.originalname,
      fileSize: file.size,

      lampiran1Pdf: lampiran1?.path || null,
      lampiran1Name: lampiran1?.originalname || null,
      lampiran1Size: lampiran1?.size || null,

      lampiran2Pdf: lampiran2?.path || null,
      lampiran2Name: lampiran2?.originalname || null,
      lampiran2Size: lampiran2?.size || null,
    });

    if ((peserta as any)?.mentor) {
      await createNotification({
        recipientId: (peserta as any).mentor,
        title: "Laporan Akhir Diunggah",
        message: `${peserta?.nama || "Peserta"} telah mengunggah laporan akhir magang untuk ditinjau.`,
        type: "info",
        linkUrl: "/dashboard/mentor/ViewLaporanAkhir",
      });
    }

    res.status(201).json({
      message: "Upload berhasil",
      laporan,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal upload laporan",
    });
  }
};

/* ================= DOWNLOAD PDF LAPORAN AKHIR ================= */
export const downloadLaporanAkhirPdf = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.roles;

    let laporan;

    if (userRole.includes("mentor")) {
      laporan = await LaporanAkhir.findById(id);
    } else {
      laporan = await LaporanAkhir.findOne({ user: userId });
    }

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    if (!fs.existsSync(laporan.filePdf)) {
      return res.status(404).json({ message: "File PDF tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Laporan_Akhir_${laporan.fileName}"`,
    );

    const fileStream = fs.createReadStream(laporan.filePdf);
    fileStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengunduh PDF" });
  }
};

/* ================= VIEW PDF DI BROWSER ================= */
export const viewLaporanAkhirPdf = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.roles;

    let laporan;

    if (userRole.includes("mentor")) {
      laporan = await LaporanAkhir.findById(id);
    } else {
      laporan = await LaporanAkhir.findOne({ user: userId });
    }

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    if (!fs.existsSync(laporan.filePdf)) {
      return res.status(404).json({ message: "File PDF tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${laporan.fileName}"`,
    );

    const fileStream = fs.createReadStream(laporan.filePdf);
    fileStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menampilkan PDF" });
  }
};

/* ================= GET ALL LAPORAN AKHIR PESERTA BIMBINGAN ================= */
export const getAllLaporanAkhirPesertaBimbingan = async (
  req: any,
  res: Response,
) => {
  try {
    const mentorId = req.user.id;

    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.mentor": mentorId,
    });

    const pesertaEmails: string[] = [];

    pendaftaranList.forEach((pendaftaran) => {
      pendaftaran.peserta.forEach((ps: any) => {
        if (ps.mentor && ps.mentor.toString() === mentorId) {
          pesertaEmails.push(ps.email);
        }
      });
    });

    const users = await User.find({ email: { $in: pesertaEmails } });
    const userIds = users.map((user) => user._id);

    const laporanList = await LaporanAkhir.find({
      user: { $in: userIds },
    })
      .populate("user", "name email")
      .populate("approvedByMentor", "name email")
      .sort({ createdAt: -1 });

    res.json(laporanList);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil laporan akhir peserta" });
  }
};

/* ================= GET LAPORAN AKHIR PESERTA BY EMAIL ================= */
export const getLaporanAkhirPesertaByEmail = async (
  req: any,
  res: Response,
) => {
  try {
    const mentorId = req.user.id;
    const { pesertaEmail } = req.params;

    const validasi = await Pendaftaran.findOne({
      "peserta.email": pesertaEmail,
      "peserta.mentor": mentorId,
      status: "Disetujui",
    });

    if (!validasi) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke laporan akhir peserta ini",
      });
    }

    const user = await User.findOne({ email: pesertaEmail });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const laporan = await LaporanAkhir.findOne({
      user: user._id,
    })
      .populate("user", "name email")
      .populate("approvedByMentor", "name email");

    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir tidak ditemukan" });
    }

    res.json(laporan);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil laporan akhir peserta" });
  }
};

/* ================= UPDATE STATUS & PENILAIAN LAPORAN AKHIR (HANYA 1x) ================= */
export const updateStatusDanPenilaian = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { status, mentorNote, penilaian } = req.body;

    // Validasi status
    const validStatus = ["Menunggu", "Revisi", "Disetujui", "Ditolak"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
    }

    const cleanNote = typeof mentorNote === "string" ? mentorNote.trim() : "";
    if (status === "Revisi" && !cleanNote) {
      return res.status(400).json({
        message:
          "Catatan revisi wajib diisi agar peserta mengetahui hal yang harus diperbaiki",
      });
    }

    const laporan = await LaporanAkhir.findById(id).populate("user", "email");

    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir tidak ditemukan" });
    }

    // 🔥 CEK APAKAH SUDAH PERNAH DIREVIEW
    if (laporan.status === "Disetujui" || laporan.status === "Ditolak") {
      return res.status(400).json({
        message: `Laporan ini sudah ${laporan.status === "Disetujui" ? "disetujui" : "ditolak"} dan tidak dapat diubah lagi`,
      });
    }

    // Verifikasi mentor
    const valid = await Pendaftaran.findOne({
      "peserta.email": (laporan.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    // Update data
    const updateData: any = {
      status,
      mentorNote: cleanNote,
    };

    if (status === "Revisi" || status === "Ditolak") {
      updateData.approvedByMentor = mentorId;
      updateData.approvedAt = new Date();
    }

    if (status === "Disetujui") {
      updateData.approvedByMentor = mentorId;
      updateData.approvedAt = new Date();

      // Validasi penilaian (opsional: hanya divalidasi bila dikirim)
      if (penilaian) {
        const requiredFields = [
          "kehadiranDisiplin",
          "sikapPerilaku",
          "kemampuanKomunikasi",
          "inisiatifTanggungJawab",
          "kemampuanAdaptasi",
          "pengetahuanTeknis",
          "produktivitasKetepatanWaktu",
          "kerjaSamaTim",
        ];

        const isValid = requiredFields.every(
          (field) =>
            penilaian[field] &&
            ["sangat buruk", "buruk", "baik", "sangat baik"].includes(
              penilaian[field],
            ),
        );

        if (!isValid) {
          return res.status(400).json({
            message: "Semua penilaian harus diisi dengan valid",
          });
        }

        updateData.penilaian = penilaian;
      }
    }

    const updated = await LaporanAkhir.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("user", "name email")
      .populate("approvedByMentor", "name email");

    const recipientUserId =
      (updated?.user as any)?._id ||
      (laporan.user as any)?._id ||
      (typeof laporan.user === "string" || laporan.user ? laporan.user : null);

    if (
      recipientUserId &&
      (status === "Disetujui" || status === "Ditolak" || status === "Revisi")
    ) {
      await createNotification({
        recipientId: recipientUserId,
        title:
          status === "Disetujui"
            ? "Laporan Akhir Disetujui"
            : status === "Revisi"
              ? "Revisi Laporan Akhir Diminta"
              : "Laporan Akhir Ditolak",
        message:
          status === "Disetujui"
            ? "Laporan akhir magang Anda telah disetujui oleh Mentor."
            : status === "Revisi"
              ? `Mentor meminta revisi laporan akhir Anda: "${cleanNote}"`
              : `Laporan akhir magang Anda ditolak oleh Mentor${cleanNote ? `: "${cleanNote}"` : "."}`,
        type:
          status === "Disetujui"
            ? "success"
            : status === "Revisi"
              ? "warning"
              : "alert",
        linkUrl: "/dashboard/peserta/laporan-akhir",
      });
    }

    res.json({
      message: `Status laporan berhasil diubah menjadi "${status}"`,
      data: updated,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengupdate status laporan" });
  }
};

/* ================= GET PENILAIAN PESERTA ================= */
export const getPenilaianPeserta = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const laporan = await LaporanAkhir.findOne({ user: userId }).populate(
      "approvedByMentor",
      "name email",
    );

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    if (laporan.status !== "Disetujui") {
      return res.status(400).json({
        message: "Penilaian hanya tersedia setelah laporan disetujui",
      });
    }

    res.json({
      status: laporan.status,
      approvedAt: laporan.approvedAt,
      approvedBy: laporan.approvedByMentor,
      mentorNote: laporan.mentorNote,
      penilaian: laporan.penilaian || {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil penilaian" });
  }
};
