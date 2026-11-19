import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import HeroSetting from "../models/HeroSetting";
import { AuthRequest } from "../middlewares/auth.middleware";

const HERO_SETTING_KEY = "landing-hero";

function removeHeroDiskFile(fileName?: string | null) {
  if (!fileName) return;
  const fullPath = path.join(process.cwd(), "uploads", "hero", fileName);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn("[HERO IMAGE CLEANUP WARN]", err);
  }
}

/* ================= GET HERO SETTING (PUBLIC) ================= */
export const getHeroSetting = async (_req: Request, res: Response) => {
  try {
    const doc = (await HeroSetting.findOne({ key: HERO_SETTING_KEY })
      .populate("updatedBy", "name email")
      .lean()) as {
      fileName?: string;
      originalName?: string;
      fileSize?: number;
      updatedBy?: unknown;
      updatedAt?: Date;
    } | null;

    if (!doc?.fileName) {
      return res.json({
        success: true,
        data: {
          isCustom: false,
          fileName: null,
          originalName: "orang_landingpage.png",
          fileSize: 0,
          imageUrl: null,
          defaultPath: "/images/assets-new/orang_landingpage.png",
          updatedBy: null,
          updatedAt: null,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        isCustom: true,
        fileName: doc.fileName,
        originalName: doc.originalName || doc.fileName,
        fileSize: doc.fileSize || 0,
        imageUrl: `/uploads/hero/${doc.fileName}`,
        defaultPath: "/images/assets-new/orang_landingpage.png",
        updatedBy: doc.updatedBy || null,
        updatedAt: doc.updatedAt || null,
      },
    });
  } catch (error) {
    console.error("[GET HERO SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pengaturan gambar hero",
    });
  }
};

/* ================= UPLOAD / REPLACE HERO IMAGE (ADMIN & SUPERADMIN) ================= */
export const uploadHeroImageSetting = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File gambar hero wajib dipilih terlebih dahulu",
      });
    }

    const existing = await HeroSetting.findOne({ key: HERO_SETTING_KEY });
    const oldFileName = existing?.fileName;

    const updated = await HeroSetting.findOneAndUpdate(
      { key: HERO_SETTING_KEY },
      {
        key: HERO_SETTING_KEY,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        updatedBy: req.user?.id || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("updatedBy", "name email");

    if (oldFileName && oldFileName !== req.file.filename) {
      removeHeroDiskFile(oldFileName);
    }

    return res.json({
      success: true,
      message: "Gambar hero landing page berhasil diperbarui",
      data: {
        isCustom: true,
        fileName: updated.fileName,
        originalName: updated.originalName,
        fileSize: updated.fileSize,
        imageUrl: `/uploads/hero/${updated.fileName}`,
        defaultPath: "/images/assets-new/orang_landingpage.png",
        updatedBy: updated.updatedBy || null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (req.file?.filename) removeHeroDiskFile(req.file.filename);
    console.error("[UPLOAD HERO IMAGE ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengunggah gambar hero landing page",
    });
  }
};

/* ================= RESET HERO IMAGE KE DEFAULT ================= */
export const resetHeroSetting = async (_req: AuthRequest, res: Response) => {
  try {
    const existing = await HeroSetting.findOne({ key: HERO_SETTING_KEY });
    if (!existing || !existing.fileName) {
      return res.json({
        success: true,
        message: "Gambar hero sudah menggunakan gambar default",
      });
    }

    const oldFileName = existing.fileName;
    await HeroSetting.deleteOne({ _id: existing._id });
    removeHeroDiskFile(oldFileName);

    return res.json({
      success: true,
      message:
        "Gambar hero dikembalikan ke gambar default (orang_landingpage.png)",
    });
  } catch (error) {
    console.error("[RESET HERO SETTING ERROR]", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengembalikan gambar hero ke default",
    });
  }
};
