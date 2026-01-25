import { Request, Response } from "express";
import LaporanAkhir from "../models/LaporanAkhir";

/* ================= GET ALL LAPORAN AKHIR (SUPERADMIN) ================= */
export const getAllLaporanAkhir = async (req: any, res: Response) => {
  try {
    const laporanList = await LaporanAkhir.find()
      .populate("user", "name email")
      .populate("approvedByMentor", "name email")
      .sort({ createdAt: -1 });

    res.json(laporanList);
  } catch (err) {
    console.error("[GET ALL LAPORAN AKHIR]", err);
    res.status(500).json({ message: "Gagal mengambil laporan akhir" });
  }
};
