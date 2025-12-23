import { Request, Response } from "express";
import Pendaftaran from "../models/Pendaftaran";

/* ================= CREATE ================= */
export const createPendaftaran = async (req: Request, res: Response) => {
  try {
    const { kategori, jumlahPeserta, peserta } = req.body;

    if (!kategori || !jumlahPeserta || !peserta) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Surat pengantar wajib diupload",
      });
    }

    const parsedPeserta = JSON.parse(peserta);

    const data = await Pendaftaran.create({
      kategori,
      jumlahPeserta,
      peserta: parsedPeserta,
      suratPengantar: req.file.filename,
    });

    res.status(201).json({
      message: "Pendaftaran berhasil",
      data,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Gagal menyimpan pendaftaran",
      error: err.message,
    });
  }
};

/* ================= GET ALL ================= */
export const getAllPendaftaran = async (_req: Request, res: Response) => {
  const data = await Pendaftaran.find().sort({ createdAt: -1 });
  res.json(data);
};

/* ================= CEK EMAIL ================= */
export const cekPendaftaran = async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi" });
  }

  const data = await Pendaftaran.findOne({
    "peserta.email": email,
  });

  if (!data) {
    return res.status(404).json({ message: "Data tidak ditemukan" });
  }

  res.json(data);
};

/* ================= UPDATE STATUS ================= */
export const updateStatus = async (req: Request, res: Response) => {
  const { status, jawabanAdmin } = req.body;

  const data = await Pendaftaran.findByIdAndUpdate(
    req.params.id,
    { status, jawabanAdmin },
    { new: true }
  );

  res.json({
    message: "Status diperbarui",
    data,
  });
};
