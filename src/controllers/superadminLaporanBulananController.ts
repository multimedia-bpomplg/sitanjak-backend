import { Request, Response } from "express";
import LaporanBulanan from "../models/LaporanBulanan";

/* ================= GET ALL LAPORAN BULANAN (SUPERADMIN) ================= */
export const getAllLaporanBulanan = async (req: any, res: Response) => {
  try {
    const laporanList = await LaporanBulanan.find()
      .populate("user", "name email")
      .populate("approvedByMentor", "name email")
      .sort({ month: -1 });

    res.json(laporanList);
  } catch (err) {
    console.error("[GET ALL LAPORAN BULANAN]", err);
    res.status(500).json({ message: "Gagal mengambil laporan bulanan" });
  }
};
