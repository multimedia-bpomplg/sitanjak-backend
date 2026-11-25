// D:\Projek BPOM\backend-bpom\src\controllers\superadminLaporanAkhirController.ts
import { Request, Response } from "express";
import fs from "fs";
import LaporanAkhir from "../models/LaporanAkhir";
import Pendaftaran from "../models/pendaftaran";

/* ================= GET ALL LAPORAN AKHIR (SUPERADMIN & ADMIN) ================= */
export const getAllLaporanAkhir = async (req: any, res: Response) => {
  try {
    const [laporanList, pendaftaranList] = await Promise.all([
      LaporanAkhir.find()
        .populate("user", "name email")
        .populate("approvedByMentor", "name email")
        .sort({ createdAt: -1 }),
      Pendaftaran.find({ status: "Disetujui" })
        .select(
          "peserta.user peserta.email peserta.mentor peserta.posisi peserta.jurusan peserta.asal",
        )
        .populate("peserta.mentor", "name email")
        .lean(),
    ]);

    type PesertaLaporanMeta = {
      mentor: { _id: string; name: string; email?: string } | null;
      posisi?: string;
      jurusan?: string;
      asal?: { jenis?: string; nama?: string } | null;
    };

    const metaByUserId = new Map<string, PesertaLaporanMeta>();
    const metaByEmail = new Map<string, PesertaLaporanMeta>();

    for (const pendaftaran of pendaftaranList as any[]) {
      for (const ps of pendaftaran.peserta || []) {
        const mentorInfo = ps?.mentor?.name
          ? {
              _id: ps.mentor._id?.toString() || "",
              name: ps.mentor.name,
              email: ps.mentor.email || "",
            }
          : null;

        const meta: PesertaLaporanMeta = {
          mentor: mentorInfo,
          posisi: ps?.posisi || undefined,
          jurusan: ps?.jurusan || undefined,
          asal: ps?.asal || null,
        };

        if (ps?.user) metaByUserId.set(ps.user.toString(), meta);
        if (ps?.email) {
          metaByEmail.set(String(ps.email).trim().toLowerCase(), meta);
        }
      }
    }

    // Tambahkan fileUrl, mentor pembimbing, serta posisi/jurusan/asal peserta untuk filter di frontend
    const laporanWithUrl = laporanList.map((laporan) => {
      const laporanObj: any = laporan.toObject();
      const userId = laporanObj.user?._id?.toString() || "";
      const userEmail = String(laporanObj.user?.email || "")
        .trim()
        .toLowerCase();
      const matchedMeta =
        (userId && metaByUserId.get(userId)) ||
        (userEmail && metaByEmail.get(userEmail)) ||
        null;

      return {
        ...laporanObj,
        fileUrl: laporan.filePdf, // path file untuk akses
        mentor: matchedMeta?.mentor || laporanObj.approvedByMentor || null,
        posisi: matchedMeta?.posisi,
        jurusan: matchedMeta?.jurusan,
        asal: matchedMeta?.asal || null,
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
