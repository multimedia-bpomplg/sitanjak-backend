import { Request, Response } from "express";
import SuratSelesaiMagang from "../models/SuratSelesaiMagang";
import LaporanAkhir from "../models/LaporanAkhir";
import Feedback from "../models/Feedback";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { createNotification } from "../services/notificationService";
import path from "path";
import fs from "fs";

/* ================= UPLOAD SURAT SELESAI MAGANG ================= */
export const uploadSuratSelesaiMagang = async (req: any, res: Response) => {
  try {
    const { email } = req.body;
    const file = req.file;

    if (!email || !file) {
      return res.status(400).json({
        message: "Email dan file surat wajib diisi",
      });
    }

    // Cek apakah peserta sudah pernah menerima surat selesai
    const existingSurat = await SuratSelesaiMagang.findOne({
      email,
    });

    if (existingSurat && existingSurat.file) {
      return res.status(400).json({
        message: "Surat selesai magang sudah pernah dikirimkan",
      });
    }

    // Cari data pendaftaran peserta
    const pendaftaran = await Pendaftaran.findOne({
      "peserta.email": email,
    });

    if (!pendaftaran) {
      return res.status(404).json({
        message: "Data peserta tidak ditemukan",
      });
    }

    // Pastikan peserta ada
    if (!pendaftaran.peserta || pendaftaran.peserta.length === 0) {
      return res.status(404).json({
        message: "Data peserta tidak ditemukan di pendaftaran",
      });
    }

    const peserta = pendaftaran.peserta.find((p: any) => p.email === email);

    if (!peserta) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    // Buat record surat selesai magang
    const surat = await SuratSelesaiMagang.create({
      email,
      nama: peserta.nama,
      file: `surat-selesai/${file.filename}`,
      tanggalKirim: new Date(),
    });

    let recipientUserId = (peserta as any)?.user;
    if (!recipientUserId) {
      const escaped = String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const userDoc = await User.findOne({
        email: new RegExp(`^${escaped}$`, "i"),
      })
        .select("_id")
        .lean();
      recipientUserId = userDoc?._id;
    }

    if (recipientUserId) {
      await createNotification({
        recipientId: recipientUserId,
        title: "Surat Selesai Magang Tersedia",
        message: "Surat selesai magang Anda telah diunggah oleh Admin.",
        type: "success",
        linkUrl: "/dashboard/peserta/laporan-akhir",
      });
    }

    res.status(201).json({
      message: "Surat selesai magang berhasil dikirim",
      data: surat,
    });
  } catch (error: any) {
    console.error("[UPLOAD SURAT SELESAI]", error);
    res.status(500).json({
      message: "Gagal mengirim surat selesai magang",
      error: error.message,
    });
  }
};

/* ================= GET SURAT SELESAI MAGANG BY EMAIL ================= */
export const getSuratSelesaiMagangByEmail = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        message: "Email wajib diisi",
      });
    }

    const surat = await SuratSelesaiMagang.findOne({ email });

    if (!surat) {
      return res.status(200).json(null);
    }

    res.json(surat);
  } catch (error: any) {
    console.error("[GET SURAT SELESAI]", error);
    res.status(500).json({
      message: "Gagal mengambil data surat",
      error: error.message,
    });
  }
};

/* ================= GET ALL SURAT SELESAI MAGANG ================= */
export const getAllSuratSelesaiMagang = async (req: Request, res: Response) => {
  try {
    const surat = await SuratSelesaiMagang.find().sort({ tanggalKirim: -1 });
    res.json(surat);
  } catch (error: any) {
    console.error("[GET ALL SURAT SELESAI]", error);
    res.status(500).json({
      message: "Gagal mengambil semua data surat",
    });
  }
};

/* ================= DOWNLOAD SURAT SELESAI MAGANG (TERPROTEKSI) ================= */
export const downloadSuratSelesaiMagang = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const roles: string[] = req.user.roles || [];
    const isAdminOrSuper =
      roles.includes("admin") || roles.includes("superadmin");

    const targetEmail =
      isAdminOrSuper && req.query.email
        ? String(req.query.email).trim()
        : String(req.user.email || "").trim();

    if (!targetEmail) {
      return res.status(400).json({ message: "Email peserta tidak valid" });
    }

    if (!isAdminOrSuper) {
      const [laporan, feedback] = await Promise.all([
        LaporanAkhir.findOne({ user: userId }),
        Feedback.findOne({ user: userId }),
      ]);

      if (!laporan || laporan.status !== "Disetujui" || !feedback) {
        return res.status(403).json({
          message:
            "Surat Selesai Magang hanya dapat diunduh setelah Laporan Akhir disetujui dan Survei/Feedback selesai diisi.",
        });
      }
    }

    const escaped = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const surat = await SuratSelesaiMagang.findOne({
      email: new RegExp(`^${escaped}$`, "i"),
    });

    if (!surat || !surat.file) {
      return res.status(404).json({
        message: "Surat Selesai Magang belum tersedia",
      });
    }

    const fullPath = path.join(process.cwd(), "uploads", surat.file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        message: "File Surat Selesai Magang tidak ditemukan di server",
      });
    }

    const mode = req.query.inline === "1" ? "inline" : "attachment";
    const safeName = `Surat_Selesai_Magang_${(surat.nama || "Peserta").replace(/\s+/g, "_")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${mode}; filename="${safeName}"`);

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error: any) {
    console.error("[DOWNLOAD SURAT SELESAI]", error);
    res.status(500).json({
      message: "Gagal mengunduh Surat Selesai Magang",
    });
  }
};
