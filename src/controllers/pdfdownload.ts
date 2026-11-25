import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";

/* ================= HELPERS: FORMAT & PATH ================= */

function getExistingImagePath(fileName: string): string | null {
  const candidate = path.join(process.cwd(), "public", "images", fileName);
  return fs.existsSync(candidate) ? candidate : null;
}

function formatTanggalIndo(
  dateStr?: string | Date | null,
  withWeekday = false,
): string {
  if (!dateStr || dateStr === "-") return "-";
  let dateObj: Date;
  if (dateStr instanceof Date) {
    dateObj = dateStr;
  } else {
    const trimmed = String(dateStr).trim();
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    dateObj = ymdMatch
      ? new Date(`${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}T00:00:00+07:00`)
      : new Date(trimmed);
  }
  if (Number.isNaN(dateObj.getTime())) return String(dateStr);

  return dateObj.toLocaleDateString("id-ID", {
    ...(withWeekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function formatWaktuCetakWib(): string {
  return `${new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })} WIB`;
}

function sanitizeDownloadFilename(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "peserta"
  );
}

type BadgePalette = {
  label: string;
  bg: string;
  border: string;
  text: string;
};

function getKehadiranBadge(status?: string): BadgePalette {
  switch (status) {
    case "hadir":
      return {
        label: "HADIR",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        text: "#047857",
      };
    case "tidak_hadir_keterangan":
      return {
        label: "IZIN / SAKIT",
        bg: "#FFFBEB",
        border: "#FDE68A",
        text: "#B45309",
      };
    case "tidak_hadir_tanpa_keterangan":
      return {
        label: "TANPA KETERANGAN",
        bg: "#FFF1F2",
        border: "#FECDD3",
        text: "#BE123C",
      };
    default:
      return {
        label: "-",
        bg: "#F8FAFC",
        border: "#E2E8F0",
        text: "#475569",
      };
  }
}

function getApprovalBadge(approvalStatus?: string): BadgePalette {
  switch (approvalStatus) {
    case "disetujui":
      return {
        label: "DISETUJUI",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        text: "#047857",
      };
    case "revisi":
      return {
        label: "REVISI",
        bg: "#F5F3FF",
        border: "#DDD6FE",
        text: "#6D28D9",
      };
    case "ditolak":
      return {
        label: "DITOLAK",
        bg: "#FFF1F2",
        border: "#FECDD3",
        text: "#BE123C",
      };
    default:
      return {
        label: "MENUNGGU",
        bg: "#FFFBEB",
        border: "#FDE68A",
        text: "#B45309",
      };
  }
}

/* ================= SHARED DATA LOADER ================= */

async function resolvePesertaAndMentorContext(
  userId: string,
  mentorOverride?: any,
) {
  const user = await User.findById(userId).lean();
  const emailLower = (user?.email || "").trim().toLowerCase();

  let pendaftaran: any = null;
  if (emailLower) {
    pendaftaran = await Pendaftaran.findOne({
      status: "Disetujui",
      "peserta.email": { $regex: `^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();

    if (!pendaftaran) {
      pendaftaran = await Pendaftaran.findOne({
        "peserta.email": { $regex: `^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      }).lean();
    }
  }

  const pesertaData = pendaftaran?.peserta?.find(
    (p: any) => (p.email || "").trim().toLowerCase() === emailLower,
  );

  let mentorData = mentorOverride || null;
  if (!mentorData && pesertaData?.mentor) {
    mentorData = await User.findById(pesertaData.mentor).lean();
  }

  return {
    user,
    pesertaData,
    mentorData,
  };
}

/* ================= CORE PDF RENDERER ================= */

async function renderLogbookReportPdf(params: {
  res: Response;
  fileName: string;
  logs: any[];
  user: any;
  pesertaData: any;
  mentorData: any;
  printedByLabel: string;
}) {
  const { res, fileName, logs, user, pesertaData, mentorData, printedByLabel } =
    params;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    bufferPages: true,
    info: {
      Title: "Laporan Logbook Harian Magang - BBPOM di Palembang",
      Author: "SITANJAK BBPOM di Palembang",
    },
  });

  doc.pipe(res);

  const pageWidth = doc.page.width; // 595.28
  const pageHeight = doc.page.height; // 841.89
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2; // 515.28
  const bottomLimit = pageHeight - 54;

  const logoBPOM = getExistingImagePath("BPOM.png");
  const logoSitanjak = getExistingImagePath("sitanjak.png");

  const pesertaNama = pesertaData?.nama || user?.name || "Peserta Magang";
  const pesertaEmail = pesertaData?.email || user?.email || "-";
  const pesertaWa = pesertaData?.wa || "-";
  const asalJenis = pesertaData?.asal?.jenis || "";
  const asalNama = pesertaData?.asal?.nama || "-";
  const asalLengkap = asalJenis ? `${asalJenis} - ${asalNama}` : asalNama;
  const jurusan = pesertaData?.jurusan || "-";
  const posisi = pesertaData?.posisi || "-";
  const tglMulai = pesertaData?.tanggalMulaiMagang
    ? formatTanggalIndo(pesertaData.tanggalMulaiMagang)
    : "-";
  const tglSelesai = pesertaData?.tanggalSelesaiMagang
    ? formatTanggalIndo(pesertaData.tanggalSelesaiMagang)
    : "-";
  const periodeText =
    tglMulai !== "-" || tglSelesai !== "-"
      ? `${tglMulai} s.d. ${tglSelesai}`
      : "-";

  const mentorNama = mentorData?.name || "Belum Ditentukan";
  const mentorEmail = mentorData?.email || "-";
  const mentorPosisi = mentorData?.posisiMentor || "-";

  // Statistik
  let countHadir = 0;
  let countIzin = 0;
  let countAlpa = 0;
  let countApproved = 0;
  let countPending = 0;
  let countRevisiOrRejected = 0;

  for (const log of logs) {
    if (log.status === "hadir") countHadir += 1;
    else if (log.status === "tidak_hadir_keterangan") countIzin += 1;
    else countAlpa += 1;

    if (log.approvalStatus === "disetujui") countApproved += 1;
    else if (
      log.approvalStatus === "revisi" ||
      log.approvalStatus === "ditolak"
    ) {
      countRevisiOrRejected += 1;
    } else {
      countPending += 1;
    }
  }

  /* =========================================================
   * HALAMAN 1 : KOP SURAT + SAMPUL IDENTITAS + RINGKASAN
   * ========================================================= */
  let y = 34;

  // Logo Kiri (BPOM) & Kanan (SITANJAK)
  if (logoBPOM) {
    try {
      doc.image(logoBPOM, marginX, y + 2, { fit: [46, 46] });
    } catch {
      // Abaikan bila file tidak terbaca
    }
  }
  if (logoSitanjak) {
    try {
      doc.image(logoSitanjak, pageWidth - marginX - 54, y + 3, {
        fit: [54, 44],
      });
    } catch {
      // Abaikan bila file tidak terbaca
    }
  }

  const kopTextLeft = marginX + 56;
  const kopTextWidth = contentWidth - 116;

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#475569")
    .text("BADAN PENGAWAS OBAT DAN MAKANAN REPUBLIK INDONESIA", kopTextLeft, y + 2, {
      width: kopTextWidth,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(12.2)
    .fillColor("#0F172A")
    .text(
      "BALAI BESAR PENGAWAS OBAT DAN MAKANAN DI PALEMBANG",
      kopTextLeft,
      y + 15,
      {
        width: kopTextWidth,
        align: "center",
      },
    );

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748B")
    .text(
      "Jl. Pangeran Ratu, 5 Ulu, Kec. Seberang Ulu I, Kota Palembang, Sumatera Selatan 30254",
      kopTextLeft,
      y + 32,
      {
        width: kopTextWidth,
        align: "center",
      },
    );

  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor("#0284C7")
    .text(
      "Sistem Informasi Tahapan dan Jangkauan Magang Akademik (SITANJAK)",
      kopTextLeft,
      y + 44,
      {
        width: kopTextWidth,
        align: "center",
      },
    );

  y += 60;
  // Garis ganda Kop Surat
  doc
    .moveTo(marginX, y)
    .lineTo(pageWidth - marginX, y)
    .lineWidth(1.8)
    .strokeColor("#0F172A")
    .stroke();
  doc
    .moveTo(marginX, y + 3)
    .lineTo(pageWidth - marginX, y + 3)
    .lineWidth(0.6)
    .strokeColor("#0369A1")
    .stroke();

  y += 18;

  // Banner Judul Laporan
  const bannerH = 66;
  doc
    .roundedRect(marginX, y, contentWidth, bannerH, 8)
    .fillAndStroke("#F0F9FF", "#BAE6FD");
  doc.rect(marginX, y, 5, bannerH).fill("#0284C7");

  doc
    .font("Helvetica-Bold")
    .fontSize(8.2)
    .fillColor("#0369A1")
    .text("DOKUMEN REKAPITULASI KEGIATAN MAGANG", marginX + 18, y + 12, {
      width: contentWidth - 32,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(15.5)
    .fillColor("#0F172A")
    .text("LAPORAN LOGBOOK HARIAN PESERTA MAGANG", marginX + 18, y + 25, {
      width: contentWidth - 32,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#475569")
    .text(
      `Balai Besar POM di Palembang  •  Periode Magang: ${periodeText}`,
      marginX + 18,
      y + 46,
      {
        width: contentWidth - 32,
      },
    );

  y += bannerH + 16;

  // Helper menggambar Card Key-Value
  const drawInfoCard = (
    title: string,
    rows: Array<[string, string]>,
  ) => {
    const headerH = 26;
    const rowLineGap = 18;
    const labelW = 135;
    const valW = contentWidth - labelW - 36;

    // Hitung tinggi tiap row
    doc.font("Helvetica").fontSize(9.5);
    const measured = rows.map(([label, val]) => {
      const safeVal = val && val.trim() ? val.trim() : "-";
      const h = Math.max(
        13,
        doc.heightOfString(safeVal, { width: valW }),
      );
      return { label, val: safeVal, h };
    });

    const bodyH =
      measured.reduce((acc, r) => acc + r.h + 7, 0) + 12;
    const cardH = headerH + bodyH;

    doc
      .roundedRect(marginX, y, contentWidth, cardH, 6)
      .fillAndStroke("#FFFFFF", "#CBD5E1");

    // Strip header card
    doc.roundedRect(marginX, y, contentWidth, headerH, 6).fill("#E0F2FE");
    doc.rect(marginX, y + headerH - 6, contentWidth, 6).fill("#E0F2FE");
    doc
      .moveTo(marginX, y + headerH)
      .lineTo(pageWidth - marginX, y + headerH)
      .lineWidth(0.7)
      .strokeColor("#BAE6FD")
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor("#0C4A6E")
      .text(title, marginX + 14, y + 8);

    let rowY = y + headerH + 10;
    measured.forEach((r, idx) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#475569")
        .text(r.label, marginX + 14, rowY, { width: labelW - 8 });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#0F172A")
        .text(":", marginX + 14 + labelW - 6, rowY);

      doc
        .font(idx === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9.5)
        .fillColor("#0F172A")
        .text(r.val, marginX + 14 + labelW + 6, rowY, { width: valW });

      rowY += Math.max(rowLineGap, r.h + 7);
    });

    y += cardH + 14;
  };

  drawInfoCard("DATA PESERTA MAGANG", [
    ["Nama Lengkap", pesertaNama],
    ["Email", pesertaEmail],
    ["No. WhatsApp", pesertaWa],
    ["Asal Institusi", asalLengkap],
    ["Jurusan / Program Studi", jurusan],
    ["Penempatan / Formasi", posisi],
    ["Periode Magang", periodeText],
  ]);

  drawInfoCard("DATA MENTOR PEMBIMBING & INFORMASI DOKUMEN", [
    ["Nama Mentor Pembimbing", mentorNama],
    ["Email Mentor", mentorEmail],
    ["Formasi / Bidang Mentor", mentorPosisi],
    ["Dicetak Oleh", printedByLabel],
    ["Tanggal & Waktu Cetak", formatWaktuCetakWib()],
  ]);

  // 4 Ringkasan KPI Cards
  const kpiGap = 10;
  const kpiW = (contentWidth - kpiGap * 3) / 4;
  const kpiH = 58;
  const kpis = [
    {
      label: "Total Entri Logbook",
      value: `${logs.length} Hari`,
      sub: "Catatan terekam",
      bg: "#F8FAFC",
      border: "#CBD5E1",
      accent: "#0F172A",
    },
    {
      label: "Kehadiran",
      value: `${countHadir} Hadir`,
      sub: `${countIzin} Izin • ${countAlpa} Alpa`,
      bg: "#F0F9FF",
      border: "#BAE6FD",
      accent: "#0369A1",
    },
    {
      label: "Terverifikasi",
      value: `${countApproved}`,
      sub: "Logbook disetujui",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      accent: "#047857",
    },
    {
      label: "Menunggu / Revisi",
      value: `${countPending + countRevisiOrRejected}`,
      sub: `${countPending} Tunggu • ${countRevisiOrRejected} Revisi/Tolak`,
      bg: "#FFFBEB",
      border: "#FDE68A",
      accent: "#B45309",
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = marginX + idx * (kpiW + kpiGap);
    doc
      .roundedRect(x, y, kpiW, kpiH, 6)
      .fillAndStroke(kpi.bg, kpi.border);

    doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor("#475569")
      .text(kpi.label, x + 10, y + 9, { width: kpiW - 20 });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(kpi.accent)
      .text(kpi.value, x + 10, y + 22, { width: kpiW - 20 });

    doc
      .font("Helvetica")
      .fontSize(7.2)
      .fillColor("#64748B")
      .text(kpi.sub, x + 10, y + 42, { width: kpiW - 20 });
  });

  /* =========================================================
   * HALAMAN 2+ : DAFTAR CATATAN LOGBOOK HARIAN
   * ========================================================= */
  doc.addPage();
  y = 54;

  // Judul Bagian Logbook Harian
  doc
    .font("Helvetica-Bold")
    .fontSize(13.5)
    .fillColor("#0F172A")
    .text("CATATAN AKTIVITAS HARIAN LOGBOOK", marginX, y);
  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor("#64748B")
    .text(
      `Menampilkan ${logs.length} entri catatan kegiatan harian atas nama ${pesertaNama}.`,
      marginX,
      y + 17,
    );
  y += 38;

  const drawBadge = (x: number, badgeY: number, badge: BadgePalette): number => {
    doc.font("Helvetica-Bold").fontSize(7.2);
    const textW = doc.widthOfString(badge.label);
    const pillW = textW + 14;
    const pillH = 16;

    doc
      .roundedRect(x, badgeY, pillW, pillH, 8)
      .fillAndStroke(badge.bg, badge.border);
    doc
      .fillColor(badge.text)
      .text(badge.label, x + 7, badgeY + 4.5, { lineBreak: false });
    return pillW;
  };

  let no = 1;
  for (const log of logs) {
    const tanggalLabel = formatTanggalIndo(log.date, true);
    const hadirBadge = getKehadiranBadge(log.status);
    const approvalBadge = getApprovalBadge(log.approvalStatus);

    const aktivitasText = (log.judul || "-").trim() || "-";
    const pembelajaranText = (log.pengalaman || "-").trim() || "-";
    const kendalaText = (log.kendala || "-").trim() || "-";
    const keteranganText =
      log.status !== "hadir" && log.keterangan
        ? String(log.keterangan).trim()
        : "";
    const mentorNoteText = log.mentorNote ? String(log.mentorNote).trim() : "";
    const approvedDateText =
      log.approvalStatus === "disetujui" && log.approvedAt
        ? `Disetujui pada ${formatTanggalIndo(log.approvedAt)}`
        : "";

    const bodyTextWidth = contentWidth - 28;
    const noteTextWidth = bodyTextWidth - 18;

    doc.font("Helvetica").fontSize(9.2);
    const aktivitasH = doc.heightOfString(aktivitasText, {
      width: bodyTextWidth,
      lineGap: 2.5,
    });
    const pembelajaranH = doc.heightOfString(pembelajaranText, {
      width: bodyTextWidth,
      lineGap: 2.5,
    });
    const kendalaH = doc.heightOfString(kendalaText, {
      width: bodyTextWidth,
      lineGap: 2.5,
    });

    const ketBoxH = keteranganText
      ? doc.heightOfString(keteranganText, {
          width: noteTextWidth,
          lineGap: 2,
        }) + 24
      : 0;

    let mentorBoxH = 0;
    if (mentorNoteText || approvedDateText) {
      doc.font("Helvetica-Oblique").fontSize(8.8);
      const noteOnlyH = mentorNoteText
        ? doc.heightOfString(mentorNoteText, {
            width: noteTextWidth,
            lineGap: 2,
          })
        : 0;
      mentorBoxH = 22 + noteOnlyH + (approvedDateText ? 12 : 0);
    }

    const cardHeaderH = 30;
    const sectionHeadingH = 14;
    const cardBodyH =
      12 +
      (ketBoxH > 0 ? ketBoxH + 10 : 0) +
      (sectionHeadingH + aktivitasH + 10) +
      (sectionHeadingH + pembelajaranH + 10) +
      (sectionHeadingH + kendalaH + 8) +
      (mentorBoxH > 0 ? mentorBoxH + 10 : 0) +
      6;
    const cardTotalH = cardHeaderH + cardBodyH;

    // Pastikan kartu utuh tidak terpotong antar halaman (jika masih muat dalam 1 halaman penuh)
    const maxSinglePageH = bottomLimit - 54;
    if (cardTotalH <= maxSinglePageH && y + cardTotalH > bottomLimit) {
      doc.addPage();
      y = 54;
    } else if (y + 90 > bottomLimit) {
      doc.addPage();
      y = 54;
    }

    const drawCardTopY = y;
    const fitsOnePage = y + cardTotalH <= bottomLimit;

    if (fitsOnePage) {
      doc
        .roundedRect(marginX, drawCardTopY, contentWidth, cardTotalH, 6)
        .fillAndStroke("#FFFFFF", "#CBD5E1");
      doc
        .roundedRect(marginX, drawCardTopY, contentWidth, cardHeaderH, 6)
        .fill("#F8FAFC");
      doc
        .rect(marginX, drawCardTopY + cardHeaderH - 6, contentWidth, 6)
        .fill("#F8FAFC");
      doc
        .moveTo(marginX, drawCardTopY + cardHeaderH)
        .lineTo(pageWidth - marginX, drawCardTopY + cardHeaderH)
        .lineWidth(0.7)
        .strokeColor("#E2E8F0")
        .stroke();
    } else {
      doc
        .roundedRect(marginX, drawCardTopY, contentWidth, cardHeaderH, 6)
        .fillAndStroke("#F8FAFC", "#CBD5E1");
    }

    // Nomor & Tanggal di header kartu
    doc
      .font("Helvetica-Bold")
      .fontSize(9.8)
      .fillColor("#0F172A")
      .text(`Logbook #${no}  •  ${tanggalLabel}`, marginX + 12, drawCardTopY + 9, {
        width: 280,
      });

    // Badges kanan (Kehadiran & Approval)
    doc.font("Helvetica-Bold").fontSize(7.2);
    const appPillW = doc.widthOfString(approvalBadge.label) + 14;
    const hadPillW = doc.widthOfString(hadirBadge.label) + 14;
    const appX = pageWidth - marginX - 10 - appPillW;
    const hadX = appX - 6 - hadPillW;
    drawBadge(hadX, drawCardTopY + 7, hadirBadge);
    drawBadge(appX, drawCardTopY + 7, approvalBadge);

    let innerY = drawCardTopY + cardHeaderH + 12;
    const bodyX = marginX + 14;

    const ensureSpaceOrBreak = (neededH: number) => {
      if (!fitsOnePage && innerY + neededH > bottomLimit) {
        doc.addPage();
        innerY = 54;
      }
    };

    if (keteranganText) {
      ensureSpaceOrBreak(ketBoxH + 8);
      doc
        .roundedRect(bodyX, innerY, bodyTextWidth, ketBoxH, 4)
        .fillAndStroke("#FFFBEB", "#FDE68A");
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#B45309")
        .text("KETERANGAN KETIDAKHADIRAN", bodyX + 9, innerY + 6);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#78350F")
        .text(keteranganText, bodyX + 9, innerY + 18, {
          width: noteTextWidth,
          lineGap: 2,
        });
      innerY += ketBoxH + 10;
    }

    const renderSection = (heading: string, content: string) => {
      doc.font("Helvetica").fontSize(9.2);
      const textH = doc.heightOfString(content, {
        width: bodyTextWidth,
        lineGap: 2.5,
      });
      ensureSpaceOrBreak(sectionHeadingH + textH + 10);

      doc
        .font("Helvetica-Bold")
        .fontSize(8.3)
        .fillColor("#0369A1")
        .text(heading, bodyX, innerY);
      innerY += sectionHeadingH;

      doc
        .font("Helvetica")
        .fontSize(9.2)
        .fillColor("#1E293B")
        .text(content, bodyX, innerY, {
          width: bodyTextWidth,
          align: "left",
          lineGap: 2.5,
        });
      innerY += textH + 10;
    };

    renderSection("A. Aktivitas yang Dilakukan", aktivitasText);
    renderSection("B. Pembelajaran yang Diperoleh", pembelajaranText);
    renderSection("C. Kendala yang Dihadapi", kendalaText);

    if (mentorNoteText || approvedDateText) {
      ensureSpaceOrBreak(mentorBoxH + 8);
      doc
        .roundedRect(bodyX, innerY, bodyTextWidth, mentorBoxH, 4)
        .fillAndStroke("#F0F9FF", "#BAE6FD");
      doc.rect(bodyX, innerY, 3.5, mentorBoxH).fill("#0284C7");

      let noteCursorY = innerY + 6;
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#0369A1")
        .text("CATATAN VERIFIKASI MENTOR", bodyX + 10, noteCursorY);
      noteCursorY += 12;

      if (mentorNoteText) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(8.8)
          .fillColor("#0F172A")
          .text(mentorNoteText, bodyX + 10, noteCursorY, {
            width: noteTextWidth,
            lineGap: 2,
          });
        noteCursorY +=
          doc.heightOfString(mentorNoteText, {
            width: noteTextWidth,
            lineGap: 2,
          }) + 2;
      }

      if (approvedDateText) {
        doc
          .font("Helvetica")
          .fontSize(7.8)
          .fillColor("#047857")
          .text(approvedDateText, bodyX + 10, noteCursorY);
      }

      innerY += mentorBoxH + 6;
    }

    y = fitsOnePage ? drawCardTopY + cardTotalH + 12 : innerY + 12;
    no += 1;
  }

  /* =========================================================
   * BLOK PENGESAHAN / TANDA TANGAN
   * ========================================================= */
  const signBlockH = 108;
  if (y + signBlockH > bottomLimit) {
    doc.addPage();
    y = 58;
  } else {
    y += 10;
  }

  const colLeftX = marginX + 12;
  const colRightX = pageWidth - marginX - 200;
  const todayIndo = formatTanggalIndo(new Date());

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor("#334155")
    .text(`Palembang, ${todayIndo}`, colRightX, y, { width: 190 });

  doc
    .font("Helvetica")
    .fontSize(9.2)
    .fillColor("#334155")
    .text("Peserta Magang,", colLeftX, y + 16, { width: 190 })
    .text("Mentor Pembimbing,", colRightX, y + 16, { width: 190 });

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor("#0F172A")
    .text(pesertaNama, colLeftX, y + 72, { width: 190 })
    .text(mentorNama, colRightX, y + 72, { width: 190 });

  doc
    .moveTo(colLeftX, y + 85)
    .lineTo(colLeftX + 170, y + 85)
    .lineWidth(0.6)
    .strokeColor("#94A3B8")
    .stroke();
  doc
    .moveTo(colRightX, y + 85)
    .lineTo(colRightX + 170, y + 85)
    .lineWidth(0.6)
    .strokeColor("#94A3B8")
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748B")
    .text(asalNama !== "-" ? asalNama : "Peserta SITANJAK", colLeftX, y + 88, {
      width: 190,
    })
    .text("BBPOM di Palembang", colRightX, y + 88, { width: 190 });

  /* =========================================================
   * RUNNING HEADER & FOOTER DI SELURUH HALAMAN
   * ========================================================= */
  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i += 1) {
    doc.switchToPage(i);
    const savedBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Running Header untuk halaman ke-2 dst
    if (i > 0) {
      doc
        .font("Helvetica-Bold")
        .fontSize(7.8)
        .fillColor("#0369A1")
        .text(
          `SITANJAK • Laporan Logbook Harian — ${pesertaNama}`,
          marginX,
          24,
          { lineBreak: false },
        );
      doc
        .font("Helvetica")
        .fontSize(7.8)
        .fillColor("#64748B")
        .text("BBPOM di Palembang", marginX, 24, {
          width: contentWidth,
          align: "right",
          lineBreak: false,
        });
      doc
        .moveTo(marginX, 37)
        .lineTo(pageWidth - marginX, 37)
        .lineWidth(0.6)
        .strokeColor("#CBD5E1")
        .stroke();
    }

    // Footer di semua halaman
    const footerLineY = pageHeight - 38;
    doc
      .moveTo(marginX, footerLineY)
      .lineTo(pageWidth - marginX, footerLineY)
      .lineWidth(0.6)
      .strokeColor("#E2E8F0")
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7.8)
      .fillColor("#64748B")
      .text(
        "Dokumen resmi dihasilkan oleh SITANJAK — Balai Besar POM di Palembang",
        marginX,
        footerLineY + 7,
        { lineBreak: false },
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(7.8)
      .fillColor("#475569")
      .text(
        `Halaman ${i + 1} dari ${pageRange.count}`,
        marginX,
        footerLineY + 7,
        {
          width: contentWidth,
          align: "right",
          lineBreak: false,
        },
      );

    doc.page.margins.bottom = savedBottomMargin;
  }

  doc.end();
}

/* ================= DOWNLOAD ALL LOGBOOK PDF (PESERTA) ================= */
export const downloadAllLogbookPDF = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const logs = await Logbook.find({ user: userId }).sort({ date: 1 }).lean();

    if (!logs.length) {
      return res.status(404).json({
        message: "Belum ada logbook",
      });
    }

    const { user, pesertaData, mentorData } =
      await resolvePesertaAndMentorContext(userId);

    const safeName = sanitizeDownloadFilename(
      pesertaData?.nama || user?.name || "peserta",
    );

    await renderLogbookReportPdf({
      res,
      fileName: `logbook-${safeName}.pdf`,
      logs,
      user,
      pesertaData,
      mentorData,
      printedByLabel: `Peserta (${pesertaData?.nama || user?.name || "-"})`,
    });
  } catch (err: unknown) {
    console.error("[DOWNLOAD PDF]", err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Gagal membuat PDF",
      });
    }
  }
};

/* ================= DOWNLOAD LOGBOOK BY USER (ADMIN/SUPERADMIN) ================= */
export const downloadLogbookByUserPDF = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    const logs = await Logbook.find({ user: userId }).sort({ date: 1 }).lean();

    if (!logs.length) {
      return res.status(404).json({
        message: "Peserta belum punya logbook",
      });
    }

    const { user, pesertaData, mentorData } =
      await resolvePesertaAndMentorContext(userId);
    const requesterRole = Array.isArray(req.user?.roles)
      ? req.user.roles.includes("superadmin")
        ? "Superadmin"
        : "Admin"
      : "Admin";
    const safeName = sanitizeDownloadFilename(
      pesertaData?.nama || user?.name || userId,
    );

    await renderLogbookReportPdf({
      res,
      fileName: `logbook-${safeName}.pdf`,
      logs,
      user,
      pesertaData,
      mentorData,
      printedByLabel: `${requesterRole} (${req.user?.name || req.user?.email || "BBPOM Palembang"})`,
    });
  } catch (err: unknown) {
    console.error("[DOWNLOAD USER PDF]", err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Gagal membuat PDF",
      });
    }
  }
};

/* ================= DOWNLOAD LOGBOOK PESERTA (MENTOR) ================= */
export const downloadLogbookByMentorPDF = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    const emailLower = (user.email || "").trim().toLowerCase();
    const valid = await Pendaftaran.findOne({
      "peserta.email": {
        $regex: `^${emailLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
      "peserta.mentor": new mongoose.Types.ObjectId(mentorId),
    }).lean();

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    const logs = await Logbook.find({ user: userId }).sort({ date: 1 }).lean();

    if (!logs.length) {
      return res.status(404).json({
        message: "Logbook masih kosong",
      });
    }

    const mentorDoc = await User.findById(mentorId).lean();
    const { pesertaData, mentorData } = await resolvePesertaAndMentorContext(
      userId,
      mentorDoc,
    );
    const safeName = sanitizeDownloadFilename(
      pesertaData?.nama || user.name || userId,
    );

    await renderLogbookReportPdf({
      res,
      fileName: `logbook-${safeName}.pdf`,
      logs,
      user,
      pesertaData,
      mentorData,
      printedByLabel: `Mentor Pembimbing (${mentorData?.name || "-"})`,
    });
  } catch (err: unknown) {
    console.error("MENTOR PDF ERROR:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({
        message: "Server error saat membuat PDF",
        error: errorMessage,
      });
    }
  }
};
