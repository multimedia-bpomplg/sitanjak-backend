import { Request, Response } from "express";
import SuratSelesaiMagang from "../models/SuratSelesaiMagang";
import Pendaftaran from "../models/pendaftaran";
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
