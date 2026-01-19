import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import LaporanAkhir from "../models/LaporanAkhir";

/* ================= GET ================= */
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

/* ================= CREATE (1x ONLY) ================= */
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

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal membuat PDF laporan akhir",
    });
  }
};

function section(doc: PDFKit.PDFDocument, title: string, content: string) {
  doc.fontSize(13).text(title, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).text(content);
  doc.moveDown(1.5);
}

/* =================ACC Laporan AKhir================= */
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

    laporan.approvedByMentor = true;
    laporan.mentorNote = mentorNote;
    laporan.approvedAt = new Date();
    await laporan.save();

    res.json({ message: "Disetujui", data: laporan });
  } catch {
    res.status(500).json({ message: "Gagal approve laporan akhir" });
  }
};
