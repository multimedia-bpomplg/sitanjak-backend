import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Announcement from "../models/Announcement";
import { AuthRequest } from "../middlewares/auth.middleware";

function removeAnnouncementFile(fileName?: string | null) {
  if (!fileName) return;
  const trimmed = String(fileName).trim();
  if (!trimmed || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return;
  }
  const safeName = path.basename(trimmed);
  if (!safeName) return;
  const fullPath = path.join(process.cwd(), "uploads", "announcements", safeName);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn("[ANNOUNCEMENT IMAGE CLEANUP WARN]", err);
  }
}

/* ================= CREATE ================= */
export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, content, type } = req.body;

    const image = req.file?.filename;

    const data = await Announcement.create({
      title,
      subtitle,
      content,
      type,
      image,
      isActive: true,
      createdBy: req.user?.id,
    });

    res.status(201).json(data);
  } catch (err) {
    removeAnnouncementFile(req.file?.filename);
    console.error(err);
    res.status(500).json({ message: "Gagal membuat pengumuman" });
  }
};

/* ================= GET BY TYPE ================= */
export const getAnnouncementByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    const data = await Announcement.find({
      type,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil pengumuman" });
  }
};

/* ================= LIST ALL ================= */
export const getAllAnnouncements = async (_req: Request, res: Response) => {
  const data = await Announcement.find().sort({ createdAt: -1 });

  res.json(data);
};

/* ================= DELETE ================= */
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    removeAnnouncementFile(deleted.image);

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus pengumuman" });
  }
};

/* ================= UPDATE ================= */
export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  const newImage = req.file?.filename;
  try {
    const existing = await Announcement.findById(req.params.id);
    if (!existing) {
      removeAnnouncementFile(newImage);
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    const { title, subtitle, content, type, isActive, removeImage } = req.body;
    const shouldRemoveImage = removeImage === "true" || removeImage === true;
    const previousImage = existing.image;

    const updateData: any = {
      title,
      subtitle,
      content,
      type,
      isActive,
      updatedAt: new Date(),
    };

    if (newImage) {
      updateData.image = newImage;
    } else if (shouldRemoveImage) {
      updateData.image = null;
    }

    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (previousImage && newImage && previousImage !== newImage) {
      removeAnnouncementFile(previousImage);
    } else if (previousImage && !newImage && shouldRemoveImage) {
      removeAnnouncementFile(previousImage);
    }

    res.json(updated);
  } catch (err) {
    removeAnnouncementFile(newImage);
    console.error(err);
    res.status(500).json({ message: "Gagal update pengumuman" });
  }
};

/* ================= TOGGLE ACTIVE ================= */
export const toggleAnnouncementStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const data = await Announcement.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    data.isActive = !data.isActive;

    await data.save();

    res.json({
      message: "Status berhasil diubah",
      isActive: data.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengubah status" });
  }
};
