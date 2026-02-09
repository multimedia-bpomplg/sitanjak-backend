import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import Logbook from "../models/Logbook";
import User from "../models/User"; // ✅ TAMBAH
import Pendaftaran from "../models/pendaftaran"; // ✅ TAMBAH
import mongoose from "mongoose";

/* ================= DOWNLOAD ALL LOGBOOK PDF ================= */
export const downloadAllLogbookPDF = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const logs = await Logbook.find({ user: userId }).sort({ date: 1 });

    if (!logs.length) {
      return res.status(404).json({
        message: "Belum ada logbook",
      });
    }

    // Header download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=logbook-magang.pdf",
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    doc.pipe(res);

    /* ===== JUDUL ===== */
    doc.fontSize(18).font("Helvetica-Bold").text("LAPORAN LOGBOOK MAGANG", {
      align: "center",
    });

    doc.moveDown(2);

    let no = 1;

    /* ===== ISI ===== */
    for (const log of logs) {
      const date = new Date(log.date);

      const tanggal = date.getDate();
      const bulan = date.toLocaleString("id-ID", { month: "long" });
      const tahun = date.getFullYear();

      const statusMap: any = {
        hadir: "Hadir",
        tidak_hadir_keterangan: "Tidak Hadir (Keterangan)",
        tidak_hadir_tanpa_keterangan: "Tidak Hadir",
      };

      doc
        .fontSize(11)
        .font("Helvetica")

        .text(`Nomor : ${no}`)
        .text(`Tanggal : ${tanggal}`)
        .text(`Bulan : ${bulan}`)
        .text(`Tahun : ${tahun}`)
        .text(`Status : ${statusMap[log.status] || "-"}`)

        .moveDown(0.5)

        .font("Helvetica-Bold")
        .text("Isi Logbook:")

        .font("Helvetica")
        .text(`Judul       : ${log.judul || "-"}`)
        .text(`Pembelajaran: ${log.pengalaman || "-"}`)
        .text(`Kendala     : ${log.kendala || "-"}`)
        .text(`Keterangan  : ${log.keterangan || "-"}`)

        .moveDown(0.5)

        .font("Helvetica-Bold")
        .text("Komentar Mentor:")

        .font("Helvetica-Oblique")
        .text(log.mentorNote || "-")

        .moveDown(1)

        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .stroke()

        .moveDown(1);

      no++;
    }

    doc.end();
  } catch (err) {
    console.error("[DOWNLOAD PDF]", err);

    res.status(500).json({
      message: "Gagal membuat PDF",
    });
  }
};

/* ================= DOWNLOAD LOGBOOK BY USER (ADMIN/SUPERADMIN) ================= */
export const downloadLogbookByUserPDF = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;

    const logs = await Logbook.find({ user: userId }).sort({ date: 1 });

    if (!logs.length) {
      return res.status(404).json({
        message: "Peserta belum punya logbook",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=logbook-${userId}.pdf`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("LAPORAN LOGBOOK PESERTA", {
      align: "center",
    });

    doc.moveDown(2);

    let no = 1;

    for (const log of logs) {
      const date = new Date(log.date);

      const statusMap: any = {
        hadir: "Hadir",
        tidak_hadir_keterangan: "Izin",
        tidak_hadir_tanpa_keterangan: "Tanpa Keterangan",
      };

      doc
        .fontSize(11)
        .font("Helvetica")

        .text(`No : ${no}`)
        .text(`Tanggal : ${date.toLocaleDateString("id-ID")}`)
        .text(`Status : ${statusMap[log.status] || "-"}`)

        .moveDown(0.5)

        .font("Helvetica-Bold")
        .text("Aktivitas:")

        .font("Helvetica")
        .text(`Judul : ${log.judul || "-"}`)
        .text(`Pembelajaran : ${log.pengalaman || "-"}`)
        .text(`Kendala : ${log.kendala || "-"}`)

        .moveDown(1)

        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .stroke()

        .moveDown(1);

      no++;
    }

    doc.end();
  } catch (err) {
    console.error("[DOWNLOAD USER PDF]", err);

    res.status(500).json({
      message: "Gagal membuat PDF",
    });
  }
};

/* ================= DOWNLOAD LOGBOOK PESERTA (MENTOR) ================= */
export const downloadLogbookByMentorPDF = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { userId } = req.params;

    /* ===== VALIDASI OBJECT ID ===== */
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    /* ===== AMBIL USER ===== */
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    /* ===== VALIDASI PESERTA MILIK MENTOR ===== */
    const valid = await Pendaftaran.findOne({
      "peserta.email": user.email,
      "peserta.mentor": new mongoose.Types.ObjectId(mentorId),
    }).lean();

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    /* ===== AMBIL LOGBOOK ===== */
    const logs = await Logbook.find({ user: userId }).sort({ date: 1 }).lean();

    if (!logs.length) {
      return res.status(404).json({
        message: "Logbook masih kosong",
      });
    }

    /* ===== HEADER ===== */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=logbook-${user.name}.pdf`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
    });

    doc.pipe(res);

    /* ===== HEADER PDF ===== */
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("LAPORAN LOGBOOK PESERTA", { align: "center" });

    doc.moveDown();

    doc.fontSize(11).font("Helvetica");

    doc.text(`Nama   : ${user.name}`);
    doc.text(`Email  : ${user.email}`);
    doc.text(`Tanggal Cetak : ${new Date().toLocaleDateString("id-ID")}`);

    doc.moveDown(2);

    /* ===== ISI ===== */
    let no = 1;

    const statusMap: any = {
      hadir: "Hadir",
      tidak_hadir_keterangan: "Izin",
      tidak_hadir_tanpa_keterangan: "Tanpa Keterangan",
    };

    for (const log of logs) {
      doc
        .fontSize(11)
        .font("Helvetica")

        .text(`No : ${no}`)
        .text(`Tanggal : ${new Date(log.date).toLocaleDateString("id-ID")}`)
        .text(`Status : ${statusMap[log.status] || "-"}`)
        .text(`Approval : ${log.approvalStatus || "-"}`)

        .moveDown(0.5)

        .font("Helvetica-Bold")
        .text("Aktivitas:")

        .font("Helvetica")
        .text(log.judul || "-", { indent: 20 })

        .moveDown(0.3)

        .font("Helvetica-Bold")
        .text("Pembelajaran:")

        .font("Helvetica")
        .text(log.pengalaman || "-", { indent: 20 })

        .moveDown(0.3)

        .font("Helvetica-Bold")
        .text("Kendala:")

        .font("Helvetica")
        .text(log.kendala || "-", { indent: 20 });

      if (log.mentorNote) {
        doc.moveDown(0.3);

        doc.font("Helvetica-Bold").text("Catatan Mentor:");
        doc.font("Helvetica").text(log.mentorNote, { indent: 20 });
      }

      doc.moveDown(1);

      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

      doc.moveDown(1);

      no++;
    }

    doc.end();
  } catch (err) {
    console.error("🔥 MENTOR PDF ERROR:", err);

    res.status(500).json({
      message: "Server error saat membuat PDF",
      error: err.message,
    });
  }
};
