import { Request, Response } from "express";
import Announcement from "../models/Announcement";
import { AuthRequest } from "../middlewares/auth.middleware";

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
  await Announcement.findByIdAndDelete(req.params.id);

  res.json({ message: "Deleted" });
};

/* ================= UPDATE ================= */
export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, content, type, isActive } = req.body;

    const image = req.file?.filename;

    const updateData: any = {
      title,
      subtitle,
      content,
      type,
      isActive,
      updatedAt: new Date(),
    };

    // kalau upload gambar baru
    if (image) {
      updateData.image = image;
    }

    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
    }

    res.json(updated);
  } catch (err) {
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
