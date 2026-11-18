import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Panduan, { PanduanTarget } from "../models/Panduan";
import { AuthRequest } from "../middlewares/auth.middleware";

const VALID_TARGETS: PanduanTarget[] = [
  "peserta",
  "mentor",
  "admin",
  "pendaftaran",
  "format-laporan-reguler",
  "format-laporan-pkpa",
];

const DEFAULT_TITLES: Record<PanduanTarget, string> = {
  peserta: "Buku Panduan Peserta Magang",
  mentor: "Buku Panduan Mentor Pembimbing",
  admin: "Buku Panduan Administrator",
  pendaftaran: "Buku Panduan Pendaftaran Magang",
  "format-laporan-reguler": "Format Laporan Akhir Magang (Reguler)",
  "format-laporan-pkpa": "Format Laporan Akhir Magang (PKPA)",
};

function isValidTarget(value: string): value is PanduanTarget {
  return VALID_TARGETS.includes(value as PanduanTarget);
}

function removeDiskFile(fileName?: string | null) {
  if (!fileName) return;
  const fullPath = path.join(process.cwd(), "uploads", "panduan", fileName);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn("[PANDUAN CLEANUP WARN]", err);
  }
}

/* ================= GET ALL PANDUAN ================= */
export const getAllPanduan = async (_req: Request, res: Response) => {
  try {
    const docs = await Panduan.find()
      .populate("uploadedBy", "name email")
      .lean();

    const byTarget: Record<PanduanTarget, any> = {
      peserta: null,
      mentor: null,
      admin: null,
      pendaftaran: null,
      "format-laporan-reguler": null,
      "format-laporan-pkpa": null,
    };

    for (const doc of docs as Array<{
      target?: string;
      title?: string;
      fileName?: string;
      originalName?: string;
      fileSize?: number;
      uploadedBy?: unknown;
      updatedAt?: Date;
      createdAt?: Date;
    }>) {
      const targetKey = String(doc.target || "");
      if (isValidTarget(targetKey) && doc.fileName) {
        byTarget[targetKey] = {
          target: targetKey,
          title: doc.title,
          fileName: doc.fileName,
          originalName: doc.originalName,
          fileSize: doc.fileSize,
          fileUrl: `/uploads/panduan/${doc.fileName}`,
          uploadedBy: doc.uploadedBy || null,
          updatedAt: doc.updatedAt,
          createdAt: doc.createdAt,
        };
      }
    }

    return res.json({
      success: true,
      data: byTarget,
    });
  } catch (error) {
    console.error("[GET PANDUAN ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data panduan",
    });
  }
};

/* ================= GET PUBLIC PANDUAN (LANDING PAGE) ================= */
export const getPublicPanduan = async (_req: Request, res: Response) => {
  try {
    const doc = (await Panduan.findOne({ target: "pendaftaran" }).lean()) as {
      target?: string;
      title?: string;
      fileName?: string;
      originalName?: string;
      fileSize?: number;
      updatedAt?: Date;
    } | null;

    return res.json({
      success: true,
      data: {
        pendaftaran: doc?.fileName
          ? {
              target: "pendaftaran",
              title: doc.title,
              fileName: doc.fileName,
              originalName: doc.originalName,
              fileSize: doc.fileSize,
              fileUrl: `/uploads/panduan/${doc.fileName}`,
              updatedAt: doc.updatedAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[GET PUBLIC PANDUAN ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data panduan pendaftaran",
    });
  }
};

/* ================= UPLOAD / REPLACE PANDUAN ================= */
export const uploadPanduanByTarget = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const rawTarget = String(req.params.target || "").toLowerCase();
    if (!isValidTarget(rawTarget)) {
      if (req.file?.filename) removeDiskFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message:
          "Target panduan harus 'peserta', 'mentor', 'admin', 'pendaftaran', 'format-laporan-reguler', atau 'format-laporan-pkpa'",
      });
    }

    if (
      rawTarget === "admin" &&
      !(Array.isArray(req.user?.roles) && req.user.roles.includes("superadmin"))
    ) {
      if (req.file?.filename) removeDiskFile(req.file.filename);
      return res.status(403).json({
        success: false,
        message: "Hanya Superadmin yang dapat mengelola panduan Admin",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File PDF panduan wajib diunggah",
      });
    }

    const customTitle = String(req.body?.title || "").trim();
    const title = customTitle || DEFAULT_TITLES[rawTarget];

    const existing = await Panduan.findOne({ target: rawTarget });
    const oldFileName = existing?.fileName;

    const updated = await Panduan.findOneAndUpdate(
      { target: rawTarget },
      {
        target: rawTarget,
        title,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: req.user?.id || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("uploadedBy", "name email");

    if (oldFileName && oldFileName !== req.file.filename) {
      removeDiskFile(oldFileName);
    }

    return res.json({
      success: true,
      message: `Panduan ${rawTarget} berhasil diperbarui`,
      data: {
        target: updated.target,
        title: updated.title,
        fileName: updated.fileName,
        originalName: updated.originalName,
        fileSize: updated.fileSize,
        fileUrl: `/uploads/panduan/${updated.fileName}`,
        uploadedBy: updated.uploadedBy || null,
        updatedAt: updated.updatedAt,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    if (req.file?.filename) removeDiskFile(req.file.filename);
    console.error("[UPLOAD PANDUAN ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengunggah file panduan",
    });
  }
};

/* ================= DELETE / RESET PANDUAN ================= */
export const deletePanduanByTarget = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const rawTarget = String(req.params.target || "").toLowerCase();
    if (!isValidTarget(rawTarget)) {
      return res.status(400).json({
        success: false,
        message:
          "Target panduan harus 'peserta', 'mentor', 'admin', 'pendaftaran', 'format-laporan-reguler', atau 'format-laporan-pkpa'",
      });
    }

    if (
      rawTarget === "admin" &&
      !(Array.isArray(req.user?.roles) && req.user.roles.includes("superadmin"))
    ) {
      return res.status(403).json({
        success: false,
        message: "Hanya Superadmin yang dapat menghapus panduan Admin",
      });
    }

    const existing = await Panduan.findOne({ target: rawTarget });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `File panduan ${rawTarget} belum diunggah`,
      });
    }

    const fileNameToDelete = existing.fileName;
    await Panduan.deleteOne({ _id: existing._id });
    removeDiskFile(fileNameToDelete);

    return res.json({
      success: true,
      message: `Panduan ${rawTarget} berhasil dihapus dan dikembalikan ke default`,
    });
  } catch (error) {
    console.error("[DELETE PANDUAN ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus file panduan",
    });
  }
};
