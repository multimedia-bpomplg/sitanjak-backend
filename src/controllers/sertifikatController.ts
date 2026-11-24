import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import SertifikatMagang from "../models/SertifikatMagang";
import LaporanAkhir from "../models/LaporanAkhir";
import Feedback from "../models/Feedback";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { createNotification } from "../services/notificationService";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeFileIfExists(relativeFileInUploads?: string) {
  if (!relativeFileInUploads) return;
  try {
    const fullPath = path.join(process.cwd(), "uploads", relativeFileInUploads);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // ignore cleanup error
  }
}

/* ================= UPLOAD SERTIFIKAT MAGANG (ADMIN / SUPERADMIN) ================= */
export const uploadSertifikatMagangController = async (
  req: any,
  res: Response,
) => {
  const file = req.file as Express.Multer.File | undefined;
  const newRelativeFile = file ? `sertifikat/${file.filename}` : undefined;

  try {
    const emailRaw = String(req.body?.email || "").trim().toLowerCase();
    const nomorSertifikat = String(req.body?.nomorSertifikat || "").trim();

    if (!emailRaw || !file || !newRelativeFile) {
      removeFileIfExists(newRelativeFile);
      return res.status(400).json({
        message: "Email peserta dan file sertifikat PDF wajib diisi",
      });
    }

    const emailRegex = new RegExp(`^${escapeRegex(emailRaw)}$`, "i");
    const pendaftaran = await Pendaftaran.findOne({
      "peserta.email": emailRegex,
    }).sort({ createdAt: -1 });

    if (!pendaftaran || !pendaftaran.peserta?.length) {
      removeFileIfExists(newRelativeFile);
      return res.status(404).json({
        message: "Data peserta tidak ditemukan",
      });
    }

    const peserta = pendaftaran.peserta.find(
      (p: any) => p.email?.toLowerCase() === emailRaw,
    );

    if (!peserta) {
      removeFileIfExists(newRelativeFile);
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    const existing = await SertifikatMagang.findOne({ email: emailRegex });
    const prevFile = existing?.file;

    const sertifikat = await SertifikatMagang.findOneAndUpdate(
      { email: existing ? existing.email : emailRaw },
      {
        $set: {
          email: emailRaw,
          nama: peserta.nama || "Peserta Magang",
          nomorSertifikat,
          file: newRelativeFile,
          tanggalKirim: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    if (prevFile && prevFile !== newRelativeFile) {
      removeFileIfExists(prevFile);
    }

    let recipientUserId = (peserta as any)?.user;
    if (!recipientUserId) {
      const userDoc = await User.findOne({ email: emailRegex })
        .select("_id")
        .lean();
      recipientUserId = userDoc?._id;
    }

    if (recipientUserId) {
      createNotification({
        recipientId: recipientUserId,
        title: existing
          ? "Sertifikat Magang Diperbarui"
          : "Sertifikat Magang Tersedia",
        message: existing
          ? "Sertifikat magang Anda telah diperbarui oleh Admin."
          : "Sertifikat magang Anda telah diunggah oleh Admin dan siap diunduh.",
        type: "success",
        linkUrl: "/dashboard/peserta/ganti-password",
      });
    }

    return res.status(existing ? 200 : 201).json({
      message: existing
        ? "Sertifikat magang berhasil diperbarui"
        : "Sertifikat magang berhasil dikirim",
      data: sertifikat,
    });
  } catch (error: any) {
    removeFileIfExists(newRelativeFile);
    console.error("[UPLOAD SERTIFIKAT ERROR]", error);
    return res.status(500).json({
      message: "Gagal mengunggah sertifikat magang",
      error: error.message,
    });
  }
};

/* ================= GET SERTIFIKAT BY EMAIL ================= */
export const getSertifikatByEmail = async (req: Request, res: Response) => {
  try {
    const emailRaw = String(req.query.email || "").trim().toLowerCase();
    if (!emailRaw) {
      return res.status(400).json({ message: "Email wajib diisi" });
    }

    const sertifikat = await SertifikatMagang.findOne({
      email: new RegExp(`^${escapeRegex(emailRaw)}$`, "i"),
    });

    return res.json(sertifikat || null);
  } catch (error: any) {
    console.error("[GET SERTIFIKAT BY EMAIL]", error);
    return res.status(500).json({
      message: "Gagal mengambil data sertifikat",
      error: error.message,
    });
  }
};

/* ================= GET ALL SERTIFIKAT (ADMIN / SUPERADMIN) ================= */
export const getAllSertifikat = async (_req: Request, res: Response) => {
  try {
    const list = await SertifikatMagang.find().sort({ tanggalKirim: -1 });
    return res.json(list);
  } catch (error: any) {
    console.error("[GET ALL SERTIFIKAT]", error);
    return res.status(500).json({
      message: "Gagal mengambil semua data sertifikat",
    });
  }
};

/* ================= DOWNLOAD SERTIFIKAT (TERPROTEKSI) ================= */
export const downloadSertifikat = async (req: any, res: Response) => {
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
      const [laporan, feedbackList] = await Promise.all([
        LaporanAkhir.findOne({ user: userId }),
        Feedback.find({ user: userId }).select("status mentorResponse").lean(),
      ]);

      const hasFeedback = feedbackList.length > 0;
      const isFeedbackResponded = feedbackList.some(
        (fb: any) =>
          fb.status === "Direspon" ||
          (fb.status !== "Revisi" &&
            Boolean(fb.mentorResponse && String(fb.mentorResponse).trim())),
      );

      if (
        !laporan ||
        laporan.status !== "Disetujui" ||
        !hasFeedback ||
        !isFeedbackResponded
      ) {
        return res.status(403).json({
          message:
            !laporan || laporan.status !== "Disetujui"
              ? "Sertifikat Magang hanya dapat diakses setelah Laporan Akhir disetujui oleh Mentor."
              : !hasFeedback
                ? "Sertifikat Magang hanya dapat diakses setelah Survei & Feedback diisi dan direspon oleh Mentor."
                : "Sertifikat Magang hanya dapat diakses setelah Survei & Feedback Anda direspon oleh Mentor.",
        });
      }
    }

    const sertifikat = await SertifikatMagang.findOne({
      email: new RegExp(`^${escapeRegex(targetEmail)}$`, "i"),
    });

    if (!sertifikat || !sertifikat.file) {
      return res.status(404).json({
        message: "Sertifikat Magang belum diunggah oleh Admin",
      });
    }

    const fullPath = path.join(process.cwd(), "uploads", sertifikat.file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        message: "File Sertifikat Magang tidak ditemukan di server",
      });
    }

    const mode = req.query.inline === "1" ? "inline" : "attachment";
    const safeName = `Sertifikat_${(sertifikat.nama || "Peserta").replace(/\s+/g, "_")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${mode}; filename="${safeName}"`);

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error: any) {
    console.error("[DOWNLOAD SERTIFIKAT ERROR]", error);
    return res.status(500).json({
      message: "Gagal mengunduh Sertifikat Magang",
    });
  }
};
