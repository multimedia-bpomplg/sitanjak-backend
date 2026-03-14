// controllers/LaporanAkhir.Controller.ts

import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import LaporanAkhir from "../models/LaporanAkhir";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { uploadLaporanAkhir } from "../middlewares/upload.middleware";

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
  try {
    const userId = req.user.id;

    const exists = await LaporanAkhir.findOne({ user: userId });

    if (exists) {
      return res.status(400).json({
        message: "Laporan akhir sudah dikirim",
      });
    }

    const file = req.files?.file?.[0];
    const lampiran1 = req.files?.lampiran1?.[0];
    const lampiran2 = req.files?.lampiran2?.[0];

    if (!file) {
      return res.status(400).json({
        message: "File laporan wajib diupload",
      });
    }

    if (lampiran1 && lampiran1.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        message: "Lampiran 1 maksimal 2MB",
      });
    }

    if (lampiran2 && lampiran2.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        message: "Lampiran 2 maksimal 2MB",
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
    const validStatus = ["Menunggu", "Disetujui", "Ditolak"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Status tidak valid" });
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
      mentorNote: mentorNote || "",
    };

    if (status === "Disetujui") {
      updateData.approvedByMentor = mentorId;
      updateData.approvedAt = new Date();

      // Validasi penilaian
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
      } else {
        return res.status(400).json({
          message: "Penilaian wajib diisi untuk menyetujui laporan",
        });
      }
    }

    const updated = await LaporanAkhir.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("user", "name email")
      .populate("approvedByMentor", "name email");

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
