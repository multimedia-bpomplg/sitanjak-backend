// D:\Projek BPOM\backend-bpom\src\controllers\superadminLaporanAkhirPDFController.ts
import { Request, Response } from "express";
import PDFDocument from "pdfkit";

export const downloadAllLaporanAkhirPDF = async (req: any, res: Response) => {
  try {
    const { laporanList, totalPeserta, date } = req.body;

    if (
      !laporanList ||
      !Array.isArray(laporanList) ||
      laporanList.length === 0
    ) {
      return res.status(400).json({
        message: "Tidak ada data laporan untuk diunduh",
      });
    }

    // Header download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-akhir-all-${new Date().toISOString().split("T")[0]}.pdf`,
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });

    doc.pipe(res);

    // ================= HEADER =================
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#7F1D1D")
      .text("LAPORAN AKHIR PESERTA MAGANG", {
        align: "center",
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#333333")
      .text(
        `Tanggal Cetak: ${new Date(date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        {
          align: "center",
        },
      );

    doc.moveDown(2);

    // ================= STATISTIK =================
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#7F1D1D")
      .text("RINGKASAN STATISTIK", {
        underline: true,
      });

    doc.moveDown(0.5);

    const stats = [
      { label: "Total Laporan", value: laporanList.length },
      {
        label: "Disetujui",
        value: laporanList.filter((l: any) => l.status === "Disetujui").length,
      },
      {
        label: "Ditolak",
        value: laporanList.filter((l: any) => l.status === "Ditolak").length,
      },
      {
        label: "Revisi",
        value: laporanList.filter((l: any) => l.status === "Revisi").length,
      },
      {
        label: "Menunggu",
        value: laporanList.filter((l: any) => l.status === "Menunggu").length,
      },
    ];

    let startY = doc.y;

    stats.forEach((stat, index) => {
      const x = index % 2 === 0 ? 50 : 300;
      const y = startY + Math.floor(index / 2) * 40;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#333333")
        .text(stat.label, x, y, { width: 200 });

      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#7F1D1D")
        .text(stat.value.toString(), x, y + 15, { width: 200 });
    });

    doc.moveDown(4);

    // ================= DETAIL LAPORAN =================
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#7F1D1D")
      .text("DAFTAR LAPORAN AKHIR", {
        underline: true,
      });

    doc.moveDown(1);

    // Header tabel
    const tableTop = doc.y;
    const itemSpacing = 20;

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#333333")
      .text("No", 50, tableTop)
      .text("Nama Peserta", 100, tableTop)
      .text("Email", 250, tableTop)
      .text("Status", 400, tableTop)
      .text("Tanggal", 480, tableTop);

    doc
      .strokeColor("#CCCCCC")
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    let y = tableTop + 25;

    laporanList.forEach((laporan: any, index: number) => {
      // Cek apakah perlu halaman baru
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#333333")
        .text((index + 1).toString(), 50, y)
        .text(laporan.user?.name || "-", 100, y, { width: 140 })
        .text(laporan.user?.email || "-", 250, y, { width: 140 })
        .text(laporan.status || "-", 400, y)
        .text(new Date(laporan.createdAt).toLocaleDateString("id-ID"), 480, y);

      y += itemSpacing;
    });

    // ================= FOOTER =================
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .fillColor("#9CA3AF")
        .text(
          `Halaman ${i + 1} dari ${totalPages} - Dihasilkan oleh Sistem Magang BPOM`,
          50,
          doc.page.height - 50,
          { align: "center", width: doc.page.width - 100 },
        );
    }

    doc.end();
  } catch (err) {
    console.error("[DOWNLOAD ALL LAPORAN AKHIR PDF]", err);
    res.status(500).json({
      message: "Gagal membuat PDF laporan akhir",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
