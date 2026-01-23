// controllers/LaporanAkhirController.ts
import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import LaporanAkhir from "../models/LaporanAkhir";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";

/* ================= GET LAPORAN AKHIR (PESERTA) ================= */
export const getLaporanAkhir = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const laporan = await LaporanAkhir.findOne({ user: userId });

    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir belum ada" });
    }

    res.json(laporan);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil laporan akhir" });
  }
};

/* ================= CREATE LAPORAN AKHIR (1x ONLY) ================= */
export const createLaporanAkhir = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const exists = await LaporanAkhir.findOne({ user: userId });
    if (exists) {
      return res.status(400).json({
        message: "Laporan akhir sudah dikirim dan tidak dapat diubah",
      });
    }

    const laporan = await LaporanAkhir.create({
      user: userId,
      status: "Menunggu",
      ...req.body,
    });

    res.status(201).json(laporan);
  } catch (err) {
    res.status(500).json({ message: "Gagal menyimpan laporan akhir" });
  }
};

/* ================= DOWNLOAD PDF (PUBLIC) ================= */
export const downloadLaporanAkhirPdf = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const laporan = await LaporanAkhir.findOne({ user: userId });
    if (!laporan) {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Laporan_Akhir_Magang.pdf",
    );

    doc.pipe(res);

    doc.fontSize(18).text("LAPORAN AKHIR MAGANG", { align: "center" });
    doc.moveDown(2);

    section(doc, "Judul Laporan", laporan.judul);
    section(doc, "Ringkasan", laporan.ringkasan);
    section(doc, "Hasil & Pencapaian", laporan.hasil);
    section(doc, "Kendala", laporan.kendala);
    section(doc, "Kesimpulan", laporan.kesimpulan);
    section(doc, "Saran", laporan.saran || "-");

    // Tambahkan status
    doc.moveDown();
    doc.fontSize(11).text(`Status: ${laporan.status}`, { align: "right" });

    if (laporan.mentorNote) {
      doc.moveDown();
      doc
        .fontSize(11)
        .text(`Catatan Mentor: ${laporan.mentorNote}`, { align: "right" });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal membuat PDF laporan akhir",
    });
  }
};

/* ================= GET ALL LAPORAN AKHIR PESERTA BIMBINGAN (UNTUK MENTOR) ================= */
export const getAllLaporanAkhirPesertaBimbingan = async (
  req: any,
  res: Response,
) => {
  try {
    const mentorId = req.user.id;

    // Ambil semua pendaftaran yang disetujui dengan mentor ini
    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.mentor": mentorId,
    });

    // Kumpulkan semua email peserta
    const pesertaEmails: string[] = [];

    pendaftaranList.forEach((pendaftaran) => {
      pendaftaran.peserta.forEach((ps: any) => {
        if (ps.mentor && ps.mentor.toString() === mentorId) {
          pesertaEmails.push(ps.email);
        }
      });
    });

    // Cari user berdasarkan email
    const users = await User.find({ email: { $in: pesertaEmails } });
    const userIds = users.map((user) => user._id);

    // Ambil semua laporan akhir
    const laporanList = await LaporanAkhir.find({
      user: { $in: userIds },
    })
      .populate("user", "name email")
      .populate("approvedByMentor", "name email")
      .sort({ createdAt: -1 });

    res.json(laporanList);
  } catch (err: any) {
    console.error("Error getAllLaporanAkhirPesertaBimbingan:", err);
    res.status(500).json({
      message: "Gagal mengambil laporan akhir peserta",
      error: err.message,
    });
  }
};

/* ================= GET LAPORAN AKHIR PESERTA BY EMAIL (UNTUK MENTOR) ================= */
export const getLaporanAkhirPesertaByEmail = async (
  req: any,
  res: Response,
) => {
  try {
    const mentorId = req.user.id;
    const { pesertaEmail } = req.params;

    // Verifikasi bahwa mentor adalah mentor dari peserta ini
    const validasi = await Pendaftaran.findOne({
      "peserta.email": pesertaEmail,
      "peserta.mentor": mentorId,
      status: "Disetujui",
    });

    if (!validasi) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke laporan akhir peserta ini",
      });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({ email: pesertaEmail });

    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    // Cari laporan akhir
    const laporan = await LaporanAkhir.findOne({
      user: user._id,
    })
      .populate("user", "name email")
      .populate("approvedByMentor", "name email");

    if (!laporan) {
      return res.status(404).json({
        message: "Laporan akhir tidak ditemukan",
      });
    }

    res.json(laporan);
  } catch (err: any) {
    console.error("Error getLaporanAkhirPesertaByEmail:", err);
    res.status(500).json({
      message: "Gagal mengambil laporan akhir peserta",
      error: err.message,
    });
  }
};

/* ================= UPDATE STATUS LAPORAN AKHIR (UNTUK MENTOR) ================= */
export const updateStatusLaporanAkhir = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { status, mentorNote } = req.body;

    // Validasi status
    const validStatus = ["Menunggu", "Disetujui", "Ditolak", "Revisi"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Status tidak valid",
      });
    }

    const laporan = await LaporanAkhir.findById(id)
      .populate("user", "email")
      .lean();

    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir tidak ditemukan" });
    }

    // Verifikasi bahwa mentor adalah mentor dari peserta ini
    const valid = await Pendaftaran.findOne({
      "peserta.email": (laporan.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    // Update laporan akhir
    const updated = await LaporanAkhir.findByIdAndUpdate(
      id,
      {
        status,
        mentorNote: mentorNote || "",
        approvedByMentor: status === "Disetujui" ? mentorId : null,
        approvedAt: status === "Disetujui" ? new Date() : null,
      },
      { new: true },
    )
      .populate("user", "name email")
      .populate("approvedByMentor", "name email");

    res.json({
      message: `Status laporan berhasil diubah menjadi "${status}"`,
      data: updated,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengupdate status laporan" });
  }
};

/* ================= APPROVE LAPORAN AKHIR (OLD VERSION - KEEP FOR COMPATIBILITY) ================= */
export const approveLaporanAkhir = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { id } = req.params;
    const { mentorNote } = req.body;

    const laporan = await LaporanAkhir.findById(id).populate("user");
    if (!laporan) {
      return res.status(404).json({ message: "Laporan akhir tidak ditemukan" });
    }

    const valid = await Pendaftaran.findOne({
      "peserta.email": (laporan.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    laporan.status = "Disetujui";
    laporan.approvedByMentor = mentorId;
    laporan.mentorNote = mentorNote;
    laporan.approvedAt = new Date();
    await laporan.save();

    res.json({ message: "Disetujui", data: laporan });
  } catch {
    res.status(500).json({ message: "Gagal approve laporan akhir" });
  }
};

/* ================= HELPER FUNCTION ================= */
function section(doc: PDFKit.PDFDocument, title: string, content: string) {
  doc.fontSize(13).text(title, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(content);
  doc.moveDown(1.5);
}
