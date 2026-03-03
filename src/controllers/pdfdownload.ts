import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import Logbook from "../models/Logbook";
import User from "../models/User"; // ✅ TAMBAH
import Pendaftaran from "../models/pendaftaran"; // ✅ TAMBAH
import mongoose from "mongoose";

import path from "path";

const addCoverPage = async (
  doc: PDFKit.PDFDocument,
  userData: any,
  mentorData: any,
  periode: any
) => {
  const logoBPOM = path.join(
    process.cwd(),
    "public",
    "images",
    "BPOM.png"
  );

  const logoSitanjak = path.join(
    process.cwd(),
    "public",
    "images",
    "sitanjak.png"
  );

  const pageWidth = doc.page.width;
  const centerX = pageWidth / 2;

  /* ================= HEADER ================= */

  const headerTop = 60;
  const contentLeft = 60;
  const contentWidth = pageWidth - 120; // 60 kiri + 60 kanan
  const adjustRight = 5; // bisa ubah 3–8 untuk fine tuning

  // Logo BPOM (center)
  doc.image(logoBPOM, centerX - 35, headerTop, { width: 70 });

  // Nama instansi utama
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(
      "BALAI BESAR PENGAWAS OBAT DAN MAKANAN",
      contentLeft + adjustRight,
      140,
      {
        width: contentWidth,
        align: "center",
      }
    );

  // Sub instansi
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(
      "DI PALEMBANG",
      contentLeft + adjustRight,
      162,
      {
        width: contentWidth,
        align: "center",
      }
    );

  // Alamat
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      "Jl. Pangeran Ratu Seberang Ulu I, Jakabaring, Kota Palembang, Sumatera Selatan",
      contentLeft + adjustRight,
      185,
      {
        width: contentWidth,
        align: "center",
      }
    );
  /* ===== Garis Kop Surat (Double Line Elegan) ===== */

  doc
    .moveTo(60, 210)
    .lineTo(pageWidth - 60, 210)
    .lineWidth(2)
    .stroke();

  doc
    .moveTo(60, 216)
    .lineTo(pageWidth - 60, 216)
    .lineWidth(0.8)
    .stroke();

  /* ================= PROGRAM ================= */

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("PROGRAM MAGANG", contentLeft + adjustRight, 235, {
      width: contentWidth,
      align: "center",
    });
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("SITANJAK", contentLeft + adjustRight, 255, {
      width: contentWidth,
      align: "center",
    });

  doc
    .fontSize(10)
    .font("Helvetica-Oblique")
    .text(
      "(Sistem Informasi Tahapan dan Jangkauan Magang Akademik)",
      contentLeft + adjustRight,
      275,
      {
        width: contentWidth,
        align: "center",
      }
    );

  /* ================= JUDUL ================= */

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(
      "LAPORAN LOGBOOK MAGANG",
      contentLeft + adjustRight,
      305,
      {
        width: contentWidth,
        align: "center",
      }
    );

  const afterTitleY = doc.y + 10;

  doc
    .moveTo(180, afterTitleY)
    .lineTo(pageWidth - 180, afterTitleY)
    .lineWidth(1)
    .stroke();

  /* ================= DATA ================= */

  const startY = afterTitleY + 25;

  const left = 130;

  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("DATA PESERTA", left, startY);

  doc.font("Helvetica").fontSize(11);

  let y = startY + 25;

  const row = (label: string, value: string) => {
    doc.text(label, left, y);
    doc.text(": " + value, left + 140, y);
    y += 22;
  };

  row("Nama Lengkap", userData?.nama || userData?.name || "-");
  row("Email", userData?.email || "-");
  row("Asal Instansi", userData?.asal?.nama || "-");
  row("Jurusan", userData?.jurusan || "-");
  row(
    "Periode Magang",
    `${periode.mulai} s/d ${periode.selesai}`
  );

  y += 15;

  doc.font("Helvetica-Bold").text("DATA MENTOR", left, y);
  y += 25;

  doc.font("Helvetica");

  row("Nama Mentor", mentorData?.name || "-");
  row("Email Mentor", mentorData?.email || "-");
  row("Posisi", mentorData?.posisiMentor || "-");

  /* ================= FOOTER ================= */

  doc
    .fontSize(10)
    .text(
      `Dicetak pada : ${new Date().toLocaleDateString("id-ID")}`,
      0,
      700,
      { align: "right" }
    );

  doc.image(logoSitanjak, centerX - 25, 730, { width: 50 });

  doc
    .fontSize(9)
    .font("Helvetica-Oblique")
    .text(
      "Dokumen resmi ini dihasilkan oleh Sistem Informasi Tahapan dan Jangkauan Magang Akademik (SITANJAK)",
      0,
      770,
      { align: "center" }
    );

  doc.addPage();
};


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

    /* ===== AMBIL DATA USER ===== */
    const user = await User.findById(userId).lean();

    const pendaftaran = await Pendaftaran.findOne({
      "peserta.email": user?.email,
    }).lean();

    const pesertaData = pendaftaran?.peserta.find(
      (p: any) => p.email === user?.email
    );

    const mentor = pesertaData?.mentor
      ? await User.findById(pesertaData.mentor).lean()
      : null;

    /* ===== TAMBAH COVER ===== */
    await addCoverPage(
      doc,
      pesertaData || user,
      mentor,
      {
        mulai: pesertaData?.tanggalMulaiMagang || "-",
        selesai: pesertaData?.tanggalSelesaiMagang || "-",
      }
    );

    /* ===== JUDUL ===== */
    doc.fontSize(18).font("Helvetica-Bold").text("LAPORAN LOGBOOK MAGANG", {
      align: "center",
    });

    doc.moveDown(2);

    let no = 1;

    /* ===== ISI ===== */
    for (const log of logs) {

      const tanggal = new Date(log.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const statusMap: any = {
        hadir: "HADIR",
        tidak_hadir_keterangan: "IZIN",
        tidak_hadir_tanpa_keterangan: "TANPA KETERANGAN",
      };

      /* ================= HEADER LOGBOOK ================= */

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`LOGBOOK KE-${no}`, { align: "left" });

      doc.moveDown(0.5);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Tanggal : ${tanggal}`)
        .text(`Status  : ${statusMap[log.status] || "-"}`);

      doc.moveDown(1);

      /* ================= AKTIVITAS ================= */

      doc
        .font("Helvetica-Bold")
        .text("A. Aktivitas yang Dilakukan");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.judul || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      doc.moveDown(0.8);

      /* ================= PEMBELAJARAN ================= */

      doc
        .font("Helvetica-Bold")
        .text("B. Pembelajaran yang Diperoleh");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.pengalaman || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      doc.moveDown(0.8);

      /* ================= KENDALA ================= */

      doc
        .font("Helvetica-Bold")
        .text("C. Kendala yang Dihadapi");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.kendala || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      /* ================= CATATAN MENTOR ================= */

      if (log.mentorNote) {
        doc.moveDown(0.8);

        doc
          .font("Helvetica-Bold")
          .text("Catatan Mentor:");

        doc.moveDown(0.3);

        doc
          .font("Helvetica-Oblique")
          .text(
            log.mentorNote,
            {
              align: "justify",
              indent: 20,
              lineGap: 4,
            }
          );
      }

      doc.moveDown(1.5);

      doc
        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .lineWidth(0.7)
        .stroke();

      doc.moveDown(1.5);

      no++;
    }

    doc.end();
  } catch (err: unknown) {
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

    const user = await User.findById(userId).lean();

    const pendaftaran = await Pendaftaran.findOne({
      "peserta.email": user?.email,
    }).lean();

    const pesertaData = pendaftaran?.peserta.find(
      (p: any) => p.email === user?.email
    );

    const mentor = pesertaData?.mentor
      ? await User.findById(pesertaData.mentor).lean()
      : null;

    await addCoverPage(
      doc,
      pesertaData || user,
      mentor,
      {
        mulai: pesertaData?.tanggalMulaiMagang || "-",
        selesai: pesertaData?.tanggalSelesaiMagang || "-",
      }
    );

    doc.fontSize(18).font("Helvetica-Bold").text("LAPORAN LOGBOOK PESERTA", {
      align: "center",
    });

    doc.moveDown(2);

    let no = 1;

    for (const log of logs) {

      const tanggal = new Date(log.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const statusMap: any = {
        hadir: "HADIR",
        tidak_hadir_keterangan: "IZIN",
        tidak_hadir_tanpa_keterangan: "TANPA KETERANGAN",
      };

      /* ================= HEADER LOGBOOK ================= */

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`LOGBOOK KE-${no}`, { align: "left" });

      doc.moveDown(0.5);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Tanggal : ${tanggal}`)
        .text(`Status  : ${statusMap[log.status] || "-"}`);

      doc.moveDown(1);

      /* ================= AKTIVITAS ================= */

      doc
        .font("Helvetica-Bold")
        .text("A. Aktivitas yang Dilakukan");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.judul || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      doc.moveDown(0.8);

      /* ================= PEMBELAJARAN ================= */

      doc
        .font("Helvetica-Bold")
        .text("B. Pembelajaran yang Diperoleh");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.pengalaman || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      doc.moveDown(0.8);

      /* ================= KENDALA ================= */

      doc
        .font("Helvetica-Bold")
        .text("C. Kendala yang Dihadapi");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.kendala || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      /* ================= CATATAN MENTOR ================= */

      if (log.mentorNote) {
        doc.moveDown(0.8);

        doc
          .font("Helvetica-Bold")
          .text("Catatan Mentor:");

        doc.moveDown(0.3);

        doc
          .font("Helvetica-Oblique")
          .text(
            log.mentorNote,
            {
              align: "justify",
              indent: 20,
              lineGap: 4,
            }
          );
      }

      doc.moveDown(1.5);

      doc
        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .lineWidth(0.7)
        .stroke();

      doc.moveDown(1.5);

      no++;
    }

    doc.end();
  } catch (err: unknown) {
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

    const pendaftaran = await Pendaftaran.findOne({
      "peserta.email": user.email,
    }).lean();

    const pesertaData = pendaftaran?.peserta.find(
      (p: any) => p.email === user.email
    );

    const mentorData = await User.findById(mentorId).lean();

    await addCoverPage(
      doc,
      pesertaData || user,
      mentorData,
      {
        mulai: pesertaData?.tanggalMulaiMagang || "-",
        selesai: pesertaData?.tanggalSelesaiMagang || "-",
      }
    );

    /* ===== HEADER PDF ===== */
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("LAPORAN LOGBOOK PESERTA", { align: "center" });

    doc.moveDown(2);

    /* ===== ISI ===== */
    let no = 1;

    const statusMap: any = {
      hadir: "Hadir",
      tidak_hadir_keterangan: "Izin",
      tidak_hadir_tanpa_keterangan: "Tanpa Keterangan",
    };

    for (const log of logs) {

      const tanggal = new Date(log.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const statusMap: any = {
        hadir: "HADIR",
        tidak_hadir_keterangan: "IZIN",
        tidak_hadir_tanpa_keterangan: "TANPA KETERANGAN",
      };

      /* ================= HEADER LOGBOOK ================= */

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(`LOGBOOK KE-${no}`, { align: "left" });

      doc.moveDown(0.5);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Tanggal : ${tanggal}`)
        .text(`Status  : ${statusMap[log.status] || "-"}`);

      doc.moveDown(1);

      /* ================= AKTIVITAS ================= */

      doc
        .font("Helvetica-Bold")
        .text("A. Aktivitas yang Dilakukan");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.judul || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      doc.moveDown(0.8);

      /* ================= PEMBELAJARAN ================= */

      doc
        .font("Helvetica-Bold")
        .text("B. Pembelajaran yang Diperoleh");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.pengalaman || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      doc.moveDown(0.8);

      /* ================= KENDALA ================= */

      doc
        .font("Helvetica-Bold")
        .text("C. Kendala yang Dihadapi");

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .text(
          log.kendala || "-",
          {
            align: "justify",
            indent: 20,
            lineGap: 4,
          }
        );

      /* ================= CATATAN MENTOR ================= */

      if (log.mentorNote) {
        doc.moveDown(0.8);

        doc
          .font("Helvetica-Bold")
          .text("Catatan Mentor:");

        doc.moveDown(0.3);

        doc
          .font("Helvetica-Oblique")
          .text(
            log.mentorNote,
            {
              align: "justify",
              indent: 20,
              lineGap: 4,
            }
          );
      }

      doc.moveDown(1.5);

      doc
        .moveTo(40, doc.y)
        .lineTo(550, doc.y)
        .lineWidth(0.7)
        .stroke();

      doc.moveDown(1.5);

      no++;
    }

    doc.end();
  } catch (err: unknown) {
    console.error("🔥 MENTOR PDF ERROR:", err);

    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    res.status(500).json({
      message: "Server error saat membuat PDF",
      error: errorMessage,
    });
  }
};
