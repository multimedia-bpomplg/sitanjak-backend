// D:\Projek BPOM\backend-bpom\src\controllers\superadminLaporanAkhirController.ts
import { Request, Response } from "express";
import fs from "fs";
import LaporanAkhir from "../models/LaporanAkhir";

/* ================= GET ALL LAPORAN AKHIR (SUPERADMIN) ================= */
export const getAllLaporanAkhir = async (req: any, res: Response) => {
  try {
    const laporanList = await LaporanAkhir.find()
      .populate("user", "name email")
      .populate("approvedByMentor", "name email")
      .sort({ createdAt: -1 });

    // Tambahkan fileUrl untuk akses di frontend
    const laporanWithUrl = laporanList.map((laporan) => {
      const laporanObj = laporan.toObject();
      return {
        ...laporanObj,
        fileUrl: laporan.filePdf, // path file untuk akses
      };
    });

    res.json(laporanWithUrl);
  } catch (err) {
    console.error("[GET ALL LAPORAN AKHIR]", err);
    res.status(500).json({ message: "Gagal mengambil laporan akhir" });
  }
};

/* ================= GET LAPORAN AKHIR BY ID ================= */
export const getLaporanAkhirById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const laporan = await LaporanAkhir.findById(id)
      .populate("user", "name email")
      .populate("approvedByMentor", "name email");

    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir tidak ditemukan" });
    }

    const laporanObj = laporan.toObject();
    res.json({
      ...laporanObj,
      fileUrl: laporan.filePdf,
    });
  } catch (err) {
    console.error("[GET LAPORAN AKHIR BY ID]", err);
    res.status(500).json({ message: "Gagal mengambil laporan akhir" });
  }
};

/* ================= DOWNLOAD PDF LAPORAN AKHIR (SUPERADMIN) ================= */
export const downloadLaporanAkhirPdf = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const laporan = await LaporanAkhir.findById(id);

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    if (!fs.existsSync(laporan.filePdf)) {
      return res.status(404).json({ message: "File PDF tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Laporan_Akhir_${laporan.fileName}"`,
    );

    const fileStream = fs.createReadStream(laporan.filePdf);
    fileStream.pipe(res);
  } catch (err) {
    console.error("[DOWNLOAD LAPORAN AKHIR PDF]", err);
    res.status(500).json({ message: "Gagal mengunduh PDF" });
  }
};

/* ================= VIEW PDF DI BROWSER (SUPERADMIN) ================= */
export const viewLaporanAkhirPdf = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const laporan = await LaporanAkhir.findById(id);

    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    if (!fs.existsSync(laporan.filePdf)) {
      return res.status(404).json({ message: "File PDF tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${laporan.fileName}"`,
    );

    const fileStream = fs.createReadStream(laporan.filePdf);
    fileStream.pipe(res);
  } catch (err) {
    console.error("[VIEW LAPORAN AKHIR PDF]", err);
    res.status(500).json({ message: "Gagal menampilkan PDF" });
  }
};
