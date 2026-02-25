import { Request, Response } from "express";
import InformasiFungsi from "../models/InformasiFungsi";

/* GET ALL */
export const getAllInformasi = async (req: Request, res: Response) => {
  try {
    const data = await InformasiFungsi.find().sort({ createdAt: 1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data" });
  }
};

/* CREATE */
export const createInformasi = async (req: Request, res: Response) => {
  try {
    const data = await InformasiFungsi.create(req.body);

    res.status(201).json({
      message: "Data berhasil ditambahkan",
      data,
    });
  } catch (err) {
    res.status(400).json({ message: "Gagal menambah data" });
  }
};

/* UPDATE */
export const updateInformasi = async (req: Request, res: Response) => {
  try {
    const data = await InformasiFungsi.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.json({
      message: "Data berhasil diupdate",
      data,
    });
  } catch {
    res.status(400).json({ message: "Gagal update data" });
  }
};

/* DELETE */
export const deleteInformasi = async (req: Request, res: Response) => {
  try {
    await InformasiFungsi.findByIdAndDelete(req.params.id);

    res.json({
      message: "Data berhasil dihapus",
    });
  } catch {
    res.status(400).json({ message: "Gagal hapus data" });
  }
};
