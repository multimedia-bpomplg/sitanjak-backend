import fs from "fs";
import path from "path";
import { Response } from "express";
import PDFDocument from "pdfkit";
import { resolveKategoriMagang } from "../utils/pesertaKategori";

function getExistingImagePath(fileName: string): string | null {
  const candidate = path.join(process.cwd(), "public", "images", fileName);
  return fs.existsSync(candidate) ? candidate : null;
}

function formatTanggalIndo(dateStr?: string | Date | null): string {
  if (!dateStr || dateStr === "-") return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function formatTanggalPanjangWib(dateStr?: string | Date | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function formatWaktuCetakWib(dateStr?: string | Date | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })} WIB`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type StatusPalette = {
  label: string;
  fill: string;
  border: string;
  text: string;
};

function getStatusPalette(status?: string): StatusPalette {
  switch (status) {
    case "Disetujui":
      return {
        label: "DISETUJUI",
        fill: "#ECFDF5",
        border: "#A7F3D0",
        text: "#047857",
      };
    case "Revisi":
      return {
        label: "REVISI",
        fill: "#FFFBEB",
        border: "#FDE68A",
        text: "#B45309",
      };
    case "Ditolak":
      return {
        label: "DITOLAK",
        fill: "#FFF1F2",
        border: "#FECDD3",
        text: "#BE123C",
      };
    default:
      return {
        label: "MENUNGGU",
        fill: "#F0F9FF",
        border: "#BAE6FD",
        text: "#0369A1",
      };
  }
}

export const downloadAllLaporanAkhirPDF = async (req: any, res: Response) => {
  try {
    const { laporanList, date, filterSummary, printedByLabel } = req.body;

    if (
      !laporanList ||
      !Array.isArray(laporanList) ||
      laporanList.length === 0
    ) {
      return res.status(400).json({
        message: "Tidak ada data laporan akhir untuk diunduh",
      });
    }

    const dateStamp = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Laporan-Akhir-Peserta-Magang-${dateStamp}.pdf`,
    );

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 36,
      bufferPages: true,
      info: {
        Title: "Laporan Rekapitulasi Laporan Akhir Magang - BBPOM di Palembang",
        Author: "SITANJAK BBPOM di Palembang",
      },
    });

    doc.pipe(res);

    const pageWidth = doc.page.width; // 841.89
    const pageHeight = doc.page.height; // 595.28
    const marginX = 36;
    const contentWidth = pageWidth - marginX * 2; // 769.89
    const bottomLimit = pageHeight - 48;

    const logoBPOM = getExistingImagePath("BPOM.png");
    const logoSitanjak = getExistingImagePath("sitanjak.png");

    /* ================= KOP SURAT RESMI ================= */
    let y = 26;

    if (logoBPOM) {
      try {
        doc.image(logoBPOM, marginX + 4, y + 2, { fit: [48, 48] });
      } catch {
        // Abaikan bila file tidak terbaca
      }
    }
    if (logoSitanjak) {
      try {
        doc.image(logoSitanjak, pageWidth - marginX - 62, y + 4, {
          fit: [58, 44],
        });
      } catch {
        // Abaikan bila file tidak terbaca
      }
    }

    const kopTextLeft = marginX + 64;
    const kopTextWidth = contentWidth - 128;

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#475569")
      .text(
        "BADAN PENGAWAS OBAT DAN MAKANAN REPUBLIK INDONESIA",
        kopTextLeft,
        y + 2,
        { width: kopTextWidth, align: "center" },
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#0F172A")
      .text(
        "BALAI BESAR PENGAWAS OBAT DAN MAKANAN DI PALEMBANG",
        kopTextLeft,
        y + 15,
        { width: kopTextWidth, align: "center" },
      );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748B")
      .text(
        "Jl. Pangeran Ratu, 5 Ulu, Kec. Seberang Ulu I, Kota Palembang, Sumatera Selatan 30254",
        kopTextLeft,
        y + 32,
        { width: kopTextWidth, align: "center" },
      );

    doc
      .font("Helvetica-Oblique")
      .fontSize(7.8)
      .fillColor("#0284C7")
      .text(
        "Sistem Informasi Tahapan dan Jangkauan Magang Akademik (SITANJAK) • Rekapitulasi Laporan Akhir Magang",
        kopTextLeft,
        y + 44,
        { width: kopTextWidth, align: "center" },
      );

    y += 58;
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
      .strokeColor("#0284C7")
      .stroke();

    y += 14;

    /* ================= JUDUL & METADATA ================= */
    doc
      .font("Helvetica-Bold")
      .fontSize(12.5)
      .fillColor("#0F172A")
      .text(
        "LAPORAN REKAPITULASI LAPORAN AKHIR PESERTA MAGANG",
        marginX,
        y,
        { width: contentWidth, align: "center" },
      );
    y += 16;

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#475569")
      .text(
        "Balai Besar Pengawas Obat dan Makanan di Palembang",
        marginX,
        y,
        { width: contentWidth, align: "center" },
      );
    y += 15;

    const rolesArr: string[] = Array.isArray(req.user?.roles)
      ? req.user.roles
      : [];
    const defaultRoleLabel = rolesArr.includes("superadmin")
      ? "Superadmin"
      : "Admin";
    const resolvedPrintedBy =
      typeof printedByLabel === "string" && printedByLabel.trim()
        ? printedByLabel.trim()
        : `${defaultRoleLabel}${req.user?.name ? `: ${req.user.name}` : req.user?.email ? `: ${req.user.email}` : ""}`;
    const resolvedFilter =
      typeof filterSummary === "string" && filterSummary.trim()
        ? filterSummary.trim()
        : "Semua Data Laporan Akhir";

    const metaLeftX = marginX + 12;
    const metaRightX = marginX + contentWidth / 2 + 12;
    const metaValW = contentWidth / 2 - 96;

    doc.font("Helvetica").fontSize(8);
    const printedLinesH = doc.heightOfString(resolvedPrintedBy, {
      width: metaValW,
    });
    const filterLinesH = doc.heightOfString(resolvedFilter, {
      width: metaValW,
    });
    const metaBoxH =
      Math.max(12, printedLinesH) + Math.max(12, filterLinesH) + 18;

    doc
      .roundedRect(marginX, y, contentWidth, metaBoxH, 6)
      .fillAndStroke("#F0F9FF", "#BAE6FD");

    const row1Y = y + 9;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#0369A1")
      .text("Dicetak Oleh", metaLeftX, row1Y)
      .text("Tanggal Cetak", metaRightX, row1Y);

    doc
      .font("Helvetica")
      .fillColor("#0F172A")
      .text(resolvedPrintedBy, metaLeftX + 68, row1Y, { width: metaValW })
      .text(formatWaktuCetakWib(date), metaRightX + 72, row1Y, {
        width: metaValW,
      });

    const row2Y = row1Y + Math.max(12, printedLinesH) + 5;
    doc
      .font("Helvetica-Bold")
      .fillColor("#0369A1")
      .text("Filter Aktif", metaLeftX, row2Y)
      .text("Jumlah Data", metaRightX, row2Y);

    doc
      .font("Helvetica")
      .fillColor("#0F172A")
      .text(resolvedFilter, metaLeftX + 68, row2Y, { width: metaValW });
    doc
      .font("Helvetica-Bold")
      .text(
        `${laporanList.length} Laporan Ditampilkan`,
        metaRightX + 72,
        row2Y,
        { width: metaValW },
      );

    y += metaBoxH + 10;

    /* ================= RINGKASAN EKSEKUTIF KPI ================= */
    const totalCount = laporanList.length;
    const approvedCount = laporanList.filter(
      (l: any) => l.status === "Disetujui",
    ).length;
    const revisionCount = laporanList.filter(
      (l: any) => l.status === "Revisi",
    ).length;
    const rejectedCount = laporanList.filter(
      (l: any) => l.status === "Ditolak",
    ).length;
    const pendingCount =
      totalCount - approvedCount - revisionCount - rejectedCount;

    const kpiGap = 9;
    const kpiW = (contentWidth - kpiGap * 4) / 5;
    const kpiH = 38;
    const kpis = [
      {
        label: "Total Laporan",
        value: totalCount,
        sub: "Sesuai filter aktif",
        fill: "#F8FAFC",
        border: "#CBD5E1",
        accent: "#0F172A",
      },
      {
        label: "Disetujui",
        value: approvedCount,
        sub: "Terverifikasi mentor",
        fill: "#ECFDF5",
        border: "#A7F3D0",
        accent: "#047857",
      },
      {
        label: "Menunggu",
        value: pendingCount,
        sub: "Antrean review mentor",
        fill: "#F0F9FF",
        border: "#BAE6FD",
        accent: "#0369A1",
      },
      {
        label: "Revisi",
        value: revisionCount,
        sub: "Perlu perbaikan peserta",
        fill: "#FFFBEB",
        border: "#FDE68A",
        accent: "#B45309",
      },
      {
        label: "Ditolak",
        value: rejectedCount,
        sub: "Ditolak oleh mentor",
        fill: "#FFF1F2",
        border: "#FECDD3",
        accent: "#BE123C",
      },
    ];

    kpis.forEach((kpi, idx) => {
      const kx = marginX + idx * (kpiW + kpiGap);
      doc
        .roundedRect(kx, y, kpiW, kpiH, 5)
        .fillAndStroke(kpi.fill, kpi.border);

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor("#475569")
        .text(kpi.label, kx + 9, y + 8, { width: kpiW - 44 });

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(kpi.accent)
        .text(String(kpi.value), kx + kpiW - 42, y + 6.5, {
          width: 33,
          align: "right",
        });

      doc
        .font("Helvetica")
        .fontSize(6.8)
        .fillColor("#64748B")
        .text(kpi.sub, kx + 9, y + 23, { width: kpiW - 18 });
    });

    y += kpiH + 12;

    /* ================= TABEL DAFTAR LAPORAN AKHIR ================= */
    // Total contentWidth = 769.89
    const cols: Array<{
      label: string;
      width: number;
      align: "left" | "center";
    }> = [
      { label: "No", width: 32, align: "center" },
      { label: "Peserta & Program", width: 145, align: "left" },
      { label: "Instansi, Formasi & Jurusan", width: 150, align: "left" },
      { label: "Judul / Dokumen Laporan", width: 185, align: "left" },
      { label: "Mentor Pembimbing", width: 100, align: "left" },
      { label: "Status", width: 78, align: "center" },
      { label: "Tanggal Unggah", width: contentWidth - 690, align: "center" },
    ];

    const drawTableHeader = (startY: number): number => {
      const headerH = 24;
      doc.rect(marginX, startY, contentWidth, headerH).fill("#0369A1");

      let cx = marginX;
      cols.forEach((col, i) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(7.8)
          .fillColor("#FFFFFF")
          .text(col.label, cx + 6, startY + 8, {
            width: col.width - 12,
            align: col.align,
            lineBreak: false,
          });

        if (i < cols.length - 1) {
          doc
            .moveTo(cx + col.width, startY + 4)
            .lineTo(cx + col.width, startY + headerH - 4)
            .lineWidth(0.5)
            .strokeColor("#0EA5E9")
            .stroke();
        }
        cx += col.width;
      });

      return startY + headerH;
    };

    y = drawTableHeader(y);

    laporanList.forEach((item: any, idx: number) => {
      const kategoriTag =
        resolveKategoriMagang(item.jurusan, item.kategoriMagang) === "PKPA"
          ? "PKPA"
          : "Reguler";

      const namaText = `${item.user?.name || "-"} (${kategoriTag})`;
      const emailText = item.user?.email || "-";

      const asalText = item.asal?.nama || "-";
      const posJurusan = [
        item.posisi || "-",
        item.jurusan && item.jurusan !== "-" ? item.jurusan : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const judulText =
        item.judul || item.fileName || "Laporan Akhir Magang";
      const fileSub = [
        item.fileName && item.judul && item.fileName !== item.judul
          ? item.fileName
          : "",
        formatFileSize(item.fileSize),
      ]
        .filter(Boolean)
        .join(" • ");

      const mentorName =
        item.mentor?.name ||
        item.approvedByMentor?.name ||
        "Belum ditetapkan";

      const uploadDateText = formatTanggalIndo(item.createdAt);

      doc.font("Helvetica-Bold").fontSize(8);
      const hNama = doc.heightOfString(namaText, {
        width: cols[1].width - 12,
      });
      const hAsal = doc.heightOfString(asalText, {
        width: cols[2].width - 12,
      });
      const hJudul = doc.heightOfString(judulText, {
        width: cols[3].width - 12,
      });

      doc.font("Helvetica").fontSize(7.2);
      const hEmail = doc.heightOfString(emailText, {
        width: cols[1].width - 12,
      });
      const hPosJur = doc.heightOfString(posJurusan, {
        width: cols[2].width - 12,
      });
      const hFileSub = fileSub
        ? doc.heightOfString(fileSub, { width: cols[3].width - 12 })
        : 0;
      const hMentor = doc.heightOfString(mentorName, {
        width: cols[4].width - 12,
      });

      const rowH = Math.max(
        34,
        hNama + hEmail + 16,
        hAsal + hPosJur + 16,
        hJudul + (hFileSub ? hFileSub + 3 : 0) + 16,
        hMentor + 16,
      );

      if (y + rowH > bottomLimit) {
        doc.addPage();
        y = 32;
        y = drawTableHeader(y);
      }

      const rowBg = idx % 2 === 1 ? "#F8FAFC" : "#FFFFFF";
      doc
        .rect(marginX, y, contentWidth, rowH)
        .fillAndStroke(rowBg, "#E2E8F0");

      let divX = marginX;
      for (let i = 0; i < cols.length - 1; i++) {
        divX += cols[i].width;
        doc
          .moveTo(divX, y)
          .lineTo(divX, y + rowH)
          .lineWidth(0.5)
          .strokeColor("#E2E8F0")
          .stroke();
      }

      const padY = y + 8;
      let cx = marginX;

      // 1. No
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#475569")
        .text(String(idx + 1), cx + 4, padY + 2, {
          width: cols[0].width - 8,
          align: "center",
        });
      cx += cols[0].width;

      // 2. Peserta & Program
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#0F172A")
        .text(namaText, cx + 6, padY, { width: cols[1].width - 12 });
      doc
        .font("Helvetica")
        .fontSize(7.1)
        .fillColor("#64748B")
        .text(emailText, cx + 6, padY + hNama + 2, {
          width: cols[1].width - 12,
        });
      cx += cols[1].width;

      // 3. Instansi, Formasi & Jurusan
      doc
        .font("Helvetica-Bold")
        .fontSize(7.8)
        .fillColor("#0369A1")
        .text(asalText, cx + 6, padY, { width: cols[2].width - 12 });
      doc
        .font("Helvetica")
        .fontSize(7.1)
        .fillColor("#475569")
        .text(posJurusan, cx + 6, padY + hAsal + 2, {
          width: cols[2].width - 12,
        });
      cx += cols[2].width;

      // 4. Judul / Dokumen Laporan
      doc
        .font("Helvetica-Bold")
        .fontSize(7.8)
        .fillColor("#0F172A")
        .text(judulText, cx + 6, padY, { width: cols[3].width - 12 });
      if (fileSub) {
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#64748B")
          .text(fileSub, cx + 6, padY + hJudul + 2, {
            width: cols[3].width - 12,
          });
      }
      cx += cols[3].width;

      // 5. Mentor Pembimbing
      doc
        .font("Helvetica")
        .fontSize(7.6)
        .fillColor(mentorName === "Belum ditetapkan" ? "#94A3B8" : "#334155")
        .text(mentorName, cx + 6, padY, { width: cols[4].width - 12 });
      cx += cols[4].width;

      // 6. Status Badge
      const sp = getStatusPalette(item.status);
      const bW = cols[5].width - 14;
      const bH = 16;
      const bX = cx + 7;
      const bY = y + (rowH - bH) / 2;
      doc
        .roundedRect(bX, bY, bW, bH, 4)
        .fillAndStroke(sp.fill, sp.border);
      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(sp.text)
        .text(sp.label, bX, bY + 4.5, {
          width: bW,
          align: "center",
          lineBreak: false,
        });
      cx += cols[5].width;

      // 7. Tanggal Unggah
      doc
        .font("Helvetica")
        .fontSize(7.6)
        .fillColor("#334155")
        .text(uploadDateText, cx + 4, y + (rowH - 9) / 2, {
          width: cols[6].width - 8,
          align: "center",
          lineBreak: false,
        });

      y += rowH;
    });

    /* ================= BLOK PENGESAHAN ================= */
    const signBlockH = 74;
    if (y + signBlockH + 14 > bottomLimit) {
      doc.addPage();
      y = 42;
    } else {
      y += 18;
    }

    const signX = pageWidth - marginX - 210;
    const todayLong = formatTanggalPanjangWib(date);
    const signerName =
      req.user?.name || req.user?.email || "Tim Pengelola Magang SITANJAK";

    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor("#334155")
      .text(`Palembang, ${todayLong}`, signX, y)
      .text(`${defaultRoleLabel} Program Magang,`, signX, y + 12)
      .text("BBPOM di Palembang", signX, y + 23);

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor("#0F172A")
      .text(signerName, signX, y + 58);

    doc
      .moveTo(signX, y + 70)
      .lineTo(signX + 190, y + 70)
      .lineWidth(0.6)
      .strokeColor("#94A3B8")
      .stroke();

    /* ================= FOOTER HALAMAN ================= */
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const footerLineY = pageHeight - 34;
      doc
        .moveTo(marginX, footerLineY)
        .lineTo(pageWidth - marginX, footerLineY)
        .lineWidth(0.5)
        .strokeColor("#CBD5E1")
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#64748B")
        .text(
          "Dokumen resmi dihasilkan oleh SITANJAK — Balai Besar POM di Palembang",
          marginX,
          footerLineY + 7,
          { lineBreak: false },
        );

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor("#475569")
        .text(
          `Halaman ${i + 1} dari ${totalPages}`,
          marginX,
          footerLineY + 7,
          {
            width: contentWidth,
            align: "right",
            lineBreak: false,
          },
        );

      doc.page.margins.bottom = savedBottom;
    }

    doc.end();
  } catch (err) {
    console.error("[DOWNLOAD ALL LAPORAN AKHIR PDF]", err);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Gagal membuat PDF laporan akhir",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
};
