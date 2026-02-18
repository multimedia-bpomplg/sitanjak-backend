// D:\Projek BPOM\backend-bpom\src\controllers\superadminLaporanAkhirExcelController.ts
import { Request, Response } from "express";
import ExcelJS from "exceljs";

export const downloadAllLaporanAkhirExcel = async (req: any, res: Response) => {
  try {
    const { laporanList, pesertaLaporan, date } = req.body;

    if (
      !laporanList ||
      !Array.isArray(laporanList) ||
      laporanList.length === 0
    ) {
      return res.status(400).json({
        message: "Tidak ada data laporan untuk diunduh",
      });
    }

    console.log("📊 Membuat Excel dengan data:", {
      totalLaporan: laporanList.length,
      date,
    });

    // Buat workbook dan worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistem Magang BPOM";
    workbook.lastModifiedBy = "Admin";
    workbook.created = new Date(date);
    workbook.modified = new Date(date);

    // Sheet 1: Ringkasan
    const summarySheet = workbook.addWorksheet("Ringkasan");

    // Title
    summarySheet.mergeCells("A1:E1");
    const titleRow = summarySheet.getCell("A1");
    titleRow.value = "LAPORAN AKHIR PESERTA MAGANG";
    titleRow.font = { size: 16, bold: true, color: { argb: "FF7F1D1D" } };
    titleRow.alignment = { horizontal: "center" };

    summarySheet.mergeCells("A2:E2");
    const dateRow = summarySheet.getCell("A2");
    dateRow.value = `Tanggal Cetak: ${new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
    dateRow.font = { size: 11 };
    dateRow.alignment = { horizontal: "center" };

    // Statistik
    summarySheet.addRow([]);
    summarySheet.addRow(["STATISTIK LAPORAN"]);
    summarySheet.getCell("A4").font = {
      bold: true,
      size: 12,
      color: { argb: "FF7F1D1D" },
    };

    const stats = [
      ["Total Laporan", laporanList.length],
      [
        "Disetujui",
        laporanList.filter((l: any) => l.status === "Disetujui").length,
      ],
      [
        "Ditolak",
        laporanList.filter((l: any) => l.status === "Ditolak").length,
      ],
      ["Revisi", laporanList.filter((l: any) => l.status === "Revisi").length],
      [
        "Menunggu",
        laporanList.filter((l: any) => l.status === "Menunggu").length,
      ],
    ];

    let rowIndex = 5;
    stats.forEach((stat) => {
      const row = summarySheet.addRow(stat);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, color: { argb: "FF7F1D1D" } };
      rowIndex++;
    });

    // Sheet 2: Detail Laporan
    const detailSheet = workbook.addWorksheet("Detail Laporan");

    // Header kolom
    detailSheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Peserta", key: "nama", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Judul Laporan", key: "judul", width: 40 },
      { header: "Status", key: "status", width: 15 },
      { header: "Tanggal Upload", key: "tanggal", width: 15 },
      { header: "Catatan Mentor", key: "mentorNote", width: 30 },
    ];

    // Style header
    const headerRow = detailSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7F1D1D" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Isi data
    laporanList.forEach((laporan: any, index: number) => {
      const row = detailSheet.addRow({
        no: index + 1,
        nama: laporan.user?.name || "-",
        email: laporan.user?.email || "-",
        judul: laporan.judul || "-",
        status: laporan.status || "-",
        tanggal: new Date(laporan.createdAt).toLocaleDateString("id-ID"),
        mentorNote: laporan.mentorNote || "-",
      });

      // Style berdasarkan status
      if (laporan.status === "Disetujui") {
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" },
        };
      } else if (laporan.status === "Ditolak") {
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEE2E2" },
        };
      } else if (laporan.status === "Revisi") {
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" },
        };
      }

      // Border
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Auto filter
    detailSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 7 },
    };

    // Sheet 3: Penilaian (jika ada)
    const laporanDenganPenilaian = laporanList.filter((l: any) => l.penilaian);

    if (laporanDenganPenilaian.length > 0) {
      const penilaianSheet = workbook.addWorksheet("Penilaian");

      penilaianSheet.columns = [
        { header: "No", key: "no", width: 5 },
        { header: "Nama Peserta", key: "nama", width: 25 },
        { header: "Kehadiran", key: "kehadiran", width: 15 },
        { header: "Sikap", key: "sikap", width: 15 },
        { header: "Komunikasi", key: "komunikasi", width: 15 },
        { header: "Inisiatif", key: "inisiatif", width: 15 },
        { header: "Adaptasi", key: "adaptasi", width: 15 },
        { header: "Pengetahuan", key: "pengetahuan", width: 15 },
        { header: "Produktivitas", key: "produktivitas", width: 15 },
        { header: "Kerja Tim", key: "kerjaTim", width: 15 },
      ];

      // Style header
      const penilaianHeaderRow = penilaianSheet.getRow(1);
      penilaianHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF7F1D1D" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      laporanDenganPenilaian.forEach((laporan: any, index: number) => {
        penilaianSheet.addRow({
          no: index + 1,
          nama: laporan.user?.name || "-",
          kehadiran: laporan.penilaian?.kehadiranDisiplin || "-",
          sikap: laporan.penilaian?.sikapPerilaku || "-",
          komunikasi: laporan.penilaian?.kemampuanKomunikasi || "-",
          inisiatif: laporan.penilaian?.inisiatifTanggungJawab || "-",
          adaptasi: laporan.penilaian?.kemampuanAdaptasi || "-",
          pengetahuan: laporan.penilaian?.pengetahuanTeknis || "-",
          produktivitas: laporan.penilaian?.produktivitasKetepatanWaktu || "-",
          kerjaTim: laporan.penilaian?.kerjaSamaTim || "-",
        });
      });

      // Auto filter untuk sheet penilaian
      penilaianSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 10 },
      };
    }

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=laporan-akhir-all-${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    console.log("✅ Excel berhasil dibuat dan dikirim");
  } catch (err) {
    console.error("[DOWNLOAD ALL LAPORAN AKHIR EXCEL ERROR]", err);
    res.status(500).json({
      message: "Gagal membuat Excel laporan akhir",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
