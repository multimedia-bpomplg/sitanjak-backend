import { Response } from "express";
import LaporanBulanan from "../models/LaporanBulanan";

/* ================= CREATE ================= */
export const createLaporanBulanan = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const exists = await LaporanBulanan.findOne({
      user: userId,
      month: req.body.month,
    });

    if (exists) {
      return res.status(400).json({
        message: "Laporan bulanan untuk periode ini sudah diisi",
      });
    }

    const laporan = await LaporanBulanan.create({
      user: userId,
      ...req.body,
    });

    res.status(201).json(laporan);
  } catch (err) {
    res.status(500).json({ message: "Gagal menyimpan laporan bulanan" });
  }
};

/* ================= GET BY MONTH ================= */
export const getLaporanByMonth = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { month } = req.params;

    const laporan = await LaporanBulanan.findOne({
      user: userId,
      month,
    });

    if (!laporan) {
      return res.status(404).json({
        message: "Laporan bulanan tidak ditemukan",
      });
    }

    res.json(laporan);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil laporan bulanan",
    });
  }
};

/* ================= RIWAYAT ================= */
export const getRiwayatLaporanBulanan = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const laporan = await LaporanBulanan.find({ user: userId })
      .sort({ month: -1 })
      .select("month approvedByMentor createdAt");

    res.json(laporan);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil riwayat laporan bulanan",
    });
  }
};
