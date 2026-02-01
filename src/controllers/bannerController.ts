// controllers/bannerController.ts
import { Request, Response } from "express";
import BannerConfig from "../models/BannerConfig";
import fs from "fs";
import path from "path";

const BANNER_UPLOAD_DIR = "public/uploads/banners";

/* ================= GET ALL BANNERS ================= */
export const getAllBanners = async (req: Request, res: Response) => {
  try {
    const banners = await BannerConfig.find().sort({ updatedAt: -1 });

    const formatted = banners.map((banner) => ({
      id: banner._id,
      type: banner.type,
      title: banner.title,
      description: banner.description,
      image: banner.image ? `/uploads/banners/${banner.image}` : "",
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      isActive: banner.isActive,
      showDelay: banner.showDelay,
      hideAfterDays: banner.hideAfterDays,
      startDate: banner.startDate,
      endDate: banner.endDate,
      updatedAt: banner.updatedAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("[GET BANNERS ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil data banner" });
  }
};

/* ================= GET ACTIVE BANNERS ================= */
export const getActiveBanners = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const banners = await BannerConfig.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ updatedAt: -1 });

    const formatted = banners.map((banner) => ({
      id: banner._id,
      type: banner.type,
      title: banner.title,
      description: banner.description,
      image: banner.image ? `/uploads/banners/${banner.image}` : "",
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink,
      backgroundColor: banner.backgroundColor,
      textColor: banner.textColor,
      showDelay: banner.showDelay,
      hideAfterDays: banner.hideAfterDays,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("[GET ACTIVE BANNERS ERROR]", error);
    res.status(500).json({ message: "Gagal mengambil banner aktif" });
  }
};

/* ================= CREATE BANNER ================= */
export const createBanner = async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      description,
      buttonText,
      buttonLink,
      backgroundColor,
      textColor,
      isActive,
      showDelay,
      hideAfterDays,
      startDate,
      endDate,
    } = req.body;

    // Handle file upload
    const imageFile = req.file;
    const image = imageFile ? imageFile.filename : "";

    const banner = await BannerConfig.create({
      type,
      title,
      description,
      image,
      buttonText,
      buttonLink,
      backgroundColor,
      textColor,
      isActive: isActive !== undefined ? isActive : true,
      showDelay: showDelay || 1500,
      hideAfterDays: hideAfterDays || 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate
        ? new Date(endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      message: "Banner berhasil dibuat",
      banner: {
        id: banner._id,
        type: banner.type,
        title: banner.title,
        description: banner.description,
        image: banner.image ? `/uploads/banners/${banner.image}` : "",
        buttonText: banner.buttonText,
        buttonLink: banner.buttonLink,
        backgroundColor: banner.backgroundColor,
        textColor: banner.textColor,
        isActive: banner.isActive,
        showDelay: banner.showDelay,
        hideAfterDays: banner.hideAfterDays,
        startDate: banner.startDate,
        endDate: banner.endDate,
        updatedAt: banner.updatedAt,
      },
    });
  } catch (error) {
    console.error("[CREATE BANNER ERROR]", error);
    res.status(500).json({ message: "Gagal membuat banner" });
  }
};

/* ================= UPDATE BANNER ================= */
export const updateBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const banner = await BannerConfig.findById(id);

    if (!banner) {
      return res.status(404).json({ message: "Banner tidak ditemukan" });
    }

    // Handle file upload
    if (req.file) {
      // Delete old image if exists
      if (banner.image) {
        const oldImagePath = path.join(BANNER_UPLOAD_DIR, banner.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updates.image = req.file.filename;
    }

    // Parse dates
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const updatedBanner = await BannerConfig.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true },
    );

    res.json({
      message: "Banner berhasil diperbarui",
      banner: {
        id: updatedBanner?._id,
        type: updatedBanner?.type,
        title: updatedBanner?.title,
        description: updatedBanner?.description,
        image: updatedBanner?.image
          ? `/uploads/banners/${updatedBanner?.image}`
          : "",
        buttonText: updatedBanner?.buttonText,
        buttonLink: updatedBanner?.buttonLink,
        backgroundColor: updatedBanner?.backgroundColor,
        textColor: updatedBanner?.textColor,
        isActive: updatedBanner?.isActive,
        showDelay: updatedBanner?.showDelay,
        hideAfterDays: updatedBanner?.hideAfterDays,
        startDate: updatedBanner?.startDate,
        endDate: updatedBanner?.endDate,
        updatedAt: updatedBanner?.updatedAt,
      },
    });
  } catch (error) {
    console.error("[UPDATE BANNER ERROR]", error);
    res.status(500).json({ message: "Gagal memperbarui banner" });
  }
};

/* ================= DELETE BANNER ================= */
export const deleteBanner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await BannerConfig.findById(id);

    if (!banner) {
      return res.status(404).json({ message: "Banner tidak ditemukan" });
    }

    // Delete image file
    if (banner.image) {
      const imagePath = path.join(BANNER_UPLOAD_DIR, banner.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await BannerConfig.findByIdAndDelete(id);

    res.json({ message: "Banner berhasil dihapus" });
  } catch (error) {
    console.error("[DELETE BANNER ERROR]", error);
    res.status(500).json({ message: "Gagal menghapus banner" });
  }
};

/* ================= TOGGLE BANNER ACTIVE ================= */
export const toggleBannerActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const banner = await BannerConfig.findById(id);

    if (!banner) {
      return res.status(404).json({ message: "Banner tidak ditemukan" });
    }

    const updatedBanner = await BannerConfig.findByIdAndUpdate(
      id,
      { isActive: !banner.isActive, updatedAt: new Date() },
      { new: true },
    );

    res.json({
      message: `Banner ${updatedBanner?.isActive ? "diaktifkan" : "dinonaktifkan"}`,
      banner: {
        id: updatedBanner?._id,
        isActive: updatedBanner?.isActive,
      },
    });
  } catch (error) {
    console.error("[TOGGLE BANNER ERROR]", error);
    res.status(500).json({ message: "Gagal mengubah status banner" });
  }
};
