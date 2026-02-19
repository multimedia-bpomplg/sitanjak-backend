import { Request, Response } from "express";
import mongoose from "mongoose";
import OverviewStats from "../models/Overview";
import User from "../models/User";
import Role from "../models/Role";
import Pendaftaran from "../models/pendaftaran";
import Logbook from "../models/Logbook";
import {
  format,
  startOfMonth,
  endOfMonth,
  subDays,
  parseISO,
  isToday,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getDaysInMonth as getDaysInMonthFromDateFns, // RENAME IMPORT
} from "date-fns";

/* ================= GET REAL-TIME STATS (REAL-TIME VERSION) ================= */
export const getOverviewStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const todayStr = format(today, "yyyy-MM-dd");

    // 1. Hitung peserta aktif dari User dengan role peserta
    const pesertaRole = await Role.findOne({ name: "peserta" });
    const pesertaAktif = await User.countDocuments({
      roles: pesertaRole?._id,
      status: "Aktif",
    });

    // 2. Hitung mentor aktif
    const mentorRole = await Role.findOne({ name: "mentor" });
    const mentorAktif = await User.countDocuments({
      roles: mentorRole?._id,
      status: "Aktif",
    });

    // 3. Hitung admin aktif
    const adminRole = await Role.findOne({ name: "admin" });
    const adminAktif = await User.countDocuments({
      roles: adminRole?._id,
      status: "Aktif",
    });

    // 4. Hitung pendaftaran yang DISETUJUI hari ini
    const pendaftaranHariIni = await Pendaftaran.countDocuments({
      status: "Disetujui",
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    // 5. Hitung TOTAL pendaftaran yang DISETUJUI (semua waktu)
    const totalPendaftaranDisetujui = await Pendaftaran.countDocuments({
      status: "Disetujui",
    });

    // 6. Hitung logbook yang dibuat HARI INI
    const logbookHariIni = await Logbook.countDocuments({
      $or: [
        { date: todayStr },
        {
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        },
      ],
    });

    // 7. Hitung TOTAL logbook (semua waktu)
    const totalLogbook = await Logbook.countDocuments();

    // 8. Total semua pendaftaran (termasuk yang belum disetujui)
    const totalPendaftar = await Pendaftaran.countDocuments();

    // Statistik tambahan - HANYA jika ada data
    let statistikPosisi = [];
    let statistikAsal = [];
    let statistikGender = [];

    const totalDisetujui = await Pendaftaran.countDocuments({
      status: "Disetujui",
    });

    if (totalDisetujui > 0) {
      // Hanya query jika ada data
      const results = await Promise.allSettled([
        Pendaftaran.aggregate([
          { $unwind: "$peserta" },
          {
            $match: {
              status: "Disetujui",
              "peserta.posisi": { $exists: true, $ne: null },
            },
          },
          { $group: { _id: "$peserta.posisi", count: { $sum: 1 } } },
          { $project: { posisi: "$_id", count: 1, _id: 0 } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        Pendaftaran.aggregate([
          { $unwind: "$peserta" },
          {
            $match: {
              status: "Disetujui",
              "peserta.asal.jenis": { $exists: true, $ne: null, $ne: "" },
            },
          },
          { $group: { _id: "$peserta.asal.jenis", count: { $sum: 1 } } },
          { $project: { jenis: "$_id", count: 1, _id: 0 } },
          { $sort: { count: -1 } },
        ]),

        Pendaftaran.aggregate([
          { $unwind: "$peserta" },
          {
            $match: {
              status: "Disetujui",
              "peserta.jenisKelamin": { $exists: true, $ne: null, $ne: "" },
            },
          },
          { $group: { _id: "$peserta.jenisKelamin", count: { $sum: 1 } } },
          { $project: { gender: "$_id", count: 1, _id: 0 } },
        ]),
      ]);

      statistikPosisi =
        results[0].status === "fulfilled" ? results[0].value : [];
      statistikAsal = results[1].status === "fulfilled" ? results[1].value : [];
      statistikGender =
        results[2].status === "fulfilled" ? results[2].value : [];
    }

    // Simpan ke database untuk histori (opsional)
    const overviewData = {
      pesertaAktif,
      mentorAktif,
      adminAktif,
      pendaftaranAktif: totalPendaftaranDisetujui,
      pendaftaranHariIni,
      logbookHariIni,
      totalLogbook,
      totalPendaftar,
      date: today,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      statistikPosisi,
      statistikAsal,
      statistikGender,
    };

    try {
      const existingData = await OverviewStats.findOne({ date: todayStart });
      if (existingData) {
        await OverviewStats.findByIdAndUpdate(existingData._id, overviewData);
      } else {
        await OverviewStats.create(overviewData);
      }
    } catch (dbError) {
      // Continue without saving, not critical
    }

    // Kirim response REAL-TIME ke frontend
    res.json({
      pesertaAktif,
      mentorAktif,
      adminAktif,
      pendaftaranAktif: totalPendaftaranDisetujui,
      pendaftaranHariIni,
      logbookHariIni,
      totalLogbook,
      totalPendaftar,
      statistikPosisi,
      statistikAsal,
      statistikGender,
      lastUpdated: new Date().toISOString(),
      dataStatus:
        totalPendaftaranDisetujui > 0 || totalLogbook > 0
          ? "available"
          : "empty",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data overview",
      error: error instanceof Error ? error.message : "Unknown error",
      dataStatus: "error",
    });
  }
};

/* ================= GET TIME SERIES DATA (REAL-TIME) ================= */
export const getTimeSeriesData = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const selectedYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    // 1. DATA PENDAFTARAN PER BULAN - HANYA data yang ada
    const pendaftaranAggregation = await Pendaftaran.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // 2. DATA LOGBOOK PER BULAN - HANYA data yang ada
    const logbookAggregation = await Logbook.aggregate([
      {
        $match: {
          $or: [
            {
              createdAt: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            {
              date: {
                $gte: format(startDate, "yyyy-MM-dd"),
                $lte: format(endDate, "yyyy-MM-dd"),
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // 3. DATA PESERTA AKTIF PER BULAN (cumulative)
    const pesertaAktifAggregation = await Pendaftaran.aggregate([
      {
        $match: {
          status: "Disetujui",
          createdAt: { $lte: endDate },
        },
      },
      {
        $unwind: "$peserta",
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // 4. DATA MENTOR AKTIF (cumulative)
    const mentorRole = await Role.findOne({ name: "mentor" });
    const mentorAggregation = mentorRole
      ? await User.aggregate([
          {
            $match: {
              roles: mentorRole._id,
              status: "Aktif",
              createdAt: { $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1 },
          },
        ])
      : [];

    // 5. DATA ADMIN AKTIF (cumulative)
    const adminRole = await Role.findOne({ name: "admin" });
    const adminAggregation = adminRole
      ? await User.aggregate([
          {
            $match: {
              roles: adminRole._id,
              status: "Aktif",
              createdAt: { $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { "_id.year": 1, "_id.month": 1 },
          },
        ])
      : [];

    // Format data - HANYA untuk bulan yang memiliki data
    const formattedData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    let cumulativePeserta = 0;
    let cumulativeMentor = 0;
    let cumulativeAdmin = 0;

    for (let month = 1; month <= 12; month++) {
      const date = new Date(selectedYear, month - 1, 15);
      const monthStart = new Date(selectedYear, month - 1, 1);
      const monthEnd = new Date(selectedYear, month, 0, 23, 59, 59, 999);

      // Cari data untuk bulan ini
      const pendaftaranData = pendaftaranAggregation.find(
        (item) => item._id.year === selectedYear && item._id.month === month,
      );

      const logbookData = logbookAggregation.find(
        (item) => item._id.year === selectedYear && item._id.month === month,
      );

      const pesertaData = pesertaAktifAggregation.find(
        (item) => item._id.year === selectedYear && item._id.month === month,
      );

      const mentorData = mentorAggregation.find(
        (item) => item._id.year === selectedYear && item._id.month === month,
      );

      const adminData = adminAggregation.find(
        (item) => item._id.year === selectedYear && item._id.month === month,
      );

      // Update cumulative values
      if (pesertaData) cumulativePeserta += pesertaData.count;
      if (mentorData) cumulativeMentor += mentorData.count;
      if (adminData) cumulativeAdmin += adminData.count;

      // Hanya tambahkan data jika ada minimal satu nilai > 0
      const hasData =
        (pendaftaranData?.count || 0) > 0 ||
        (logbookData?.count || 0) > 0 ||
        cumulativePeserta > 0 ||
        cumulativeMentor > 0 ||
        cumulativeAdmin > 0;

      if (hasData) {
        formattedData.push({
          date: format(date, "yyyy-MM-dd"),
          month: months[month - 1],
          pendaftaran: pendaftaranData?.count || 0,
          logbook: logbookData?.count || 0,
          peserta_aktif: cumulativePeserta,
          mentor_aktif: cumulativeMentor,
          admin_aktif: cumulativeAdmin,
        });
      }
    }

    // Jika tidak ada data sama sekali, return array kosong
    res.json(formattedData);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data time series",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/* ================= GET DETAILED TIME SERIES (HARIAN REAL-TIME) ================= */
export const getDetailedTimeSeries = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const selectedYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();
    const selectedMonth = month
      ? parseInt(month as string)
      : new Date().getMonth() + 1;

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    // 1. PENDAFTARAN HARIAN - HANYA hari yang ada data
    const dailyPendaftaran = await Pendaftaran.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // 2. LOGBOOK HARIAN - HANYA hari yang ada data
    const dailyLogbook = await Logbook.aggregate([
      {
        $match: {
          $or: [
            {
              createdAt: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            {
              date: {
                $gte: format(startDate, "yyyy-MM-dd"),
                $lte: format(endDate, "yyyy-MM-dd"),
              },
            },
          ],
        },
      },
      {
        $addFields: {
          logbookDate: {
            $cond: {
              if: { $and: [{ $ne: ["$date", null] }, { $ne: ["$date", ""] }] },
              then: "$date",
              else: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
            },
          },
        },
      },
      {
        $match: {
          logbookDate: {
            $gte: format(startDate, "yyyy-MM-dd"),
            $lte: format(endDate, "yyyy-MM-dd"),
          },
        },
      },
      {
        $group: {
          _id: "$logbookDate",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Generate data untuk setiap hari - HANYA hari yang ada data
    const daysInMonth = getDaysInMonthFromDateFns(startDate); // GUNAKAN FUNGSI YANG SUDAH DI-RENAME
    const formattedData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      const dateStr = format(date, "yyyy-MM-dd");

      // Cari data untuk hari ini
      const pendaftaranToday = dailyPendaftaran.find(
        (item) => item._id === dateStr,
      );
      const logbookToday = dailyLogbook.find((item) => item._id === dateStr);

      // Hanya tambahkan jika ada data
      if (pendaftaranToday?.count || logbookToday?.count) {
        formattedData.push({
          date: dateStr,
          day: day,
          pendaftaran: pendaftaranToday?.count || 0,
          logbook: logbookToday?.count || 0,
          peserta_aktif: 0, // Tidak dihitung untuk daily view
          mentor_aktif: 0,
          admin_aktif: 0,
        });
      }
    }

    // Return array kosong jika tidak ada data
    res.json(formattedData);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil data detail time series",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/* ================= GET STATISTIK POSISI ================= */
export const getStatistikPosisi = async (req: Request, res: Response) => {
  try {
    const posisiAggregation = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.posisi": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$peserta.posisi", count: { $sum: 1 } } },
      { $project: { posisi: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Return empty array jika tidak ada data
    res.json(posisiAggregation.length > 0 ? posisiAggregation : []);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil statistik posisi",
      data: [], // Return empty array on error
    });
  }
};

/* ================= GET STATISTIK ASAL ================= */
export const getStatistikAsal = async (req: Request, res: Response) => {
  try {
    const asalAggregation = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.asal.jenis": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$peserta.asal.jenis", count: { $sum: 1 } } },
      { $project: { jenis: "$_id", count: 1, _id: 0 } },
    ]);

    res.json(asalAggregation.length > 0 ? asalAggregation : []);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil statistik asal",
      data: [],
    });
  }
};

/* ================= GET STATISTIK GENDER ================= */
export const getStatistikGender = async (req: Request, res: Response) => {
  try {
    const genderAggregation = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.jenisKelamin": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$peserta.jenisKelamin", count: { $sum: 1 } } },
      { $project: { gender: "$_id", count: 1, _id: 0 } },
    ]);

    res.json(genderAggregation.length > 0 ? genderAggregation : []);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil statistik gender",
      data: [],
    });
  }
};

/* ================= GET STATISTIK SELESAI ================= */
export const getStatistikSelesai = async (req: Request, res: Response) => {
  try {
    const currentDate = new Date();
    const selesaiAggregation = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.tanggalSelesaiMagang": {
            $exists: true,
            $ne: null,
            $ne: "",
            $type: "string",
          },
        },
      },
      {
        $addFields: {
          selesaiDate: {
            $cond: {
              if: { $ne: ["$peserta.tanggalSelesaiMagang", ""] },
              then: {
                $dateFromString: {
                  dateString: "$peserta.tanggalSelesaiMagang",
                },
              },
              else: null,
            },
          },
        },
      },
      {
        $match: {
          selesaiDate: { $ne: null },
        },
      },
      {
        $bucket: {
          groupBy: "$selesaiDate",
          boundaries: [
            new Date(currentDate.getFullYear(), 0, 1),
            new Date(currentDate.getFullYear(), 3, 1),
            new Date(currentDate.getFullYear(), 6, 1),
            new Date(currentDate.getFullYear(), 9, 1),
            new Date(currentDate.getFullYear() + 1, 0, 1),
          ],
          default: "Lainnya",
          output: {
            count: { $sum: 1 },
          },
        },
      },
      {
        $project: {
          periode: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 0, 1)],
                  },
                  then: "Q1 (Jan-Mar)",
                },
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 3, 1)],
                  },
                  then: "Q2 (Apr-Jun)",
                },
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 6, 1)],
                  },
                  then: "Q3 (Jul-Sep)",
                },
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 9, 1)],
                  },
                  then: "Q4 (Okt-Des)",
                },
              ],
              default: "Lainnya",
            },
          },
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.json(selesaiAggregation.length > 0 ? selesaiAggregation : []);
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil statistik selesai",
      data: [],
    });
  }
};

/* ================= GET AVAILABLE YEARS ================= */
export const getAvailableYears = async (req: Request, res: Response) => {
  try {
    // Cari tahun dari data pendaftaran dan logbook yang sebenarnya
    const yearsFromPendaftaran = await Pendaftaran.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const yearsFromLogbook = await Logbook.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Gabungkan dan unique tahun
    const allYears = [
      ...yearsFromPendaftaran.map((item) => item._id),
      ...yearsFromLogbook.map((item) => item._id),
      new Date().getFullYear(), // Selalu include tahun sekarang
    ].filter((year) => year !== null && year !== undefined);

    const uniqueYears = [...new Set(allYears)].sort((a, b) => b - a);

    // Jika tidak ada data, return tahun sekarang saja
    const years =
      uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];

    res.json(years);
  } catch (error) {
    // Return default years
    const currentYear = new Date().getFullYear();
    res.json([currentYear]);
  }
};

/* ================= EXPORT DATA TO EXCEL (REAL-TIME) ================= */
export const exportOverviewData = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let query: any = {};

    if (startDate && endDate) {
      query.date = {
        $gte: parseISO(startDate as string),
        $lte: parseISO(endDate as string),
      };
    }

    // Ambil data time series - HANYA yang ada
    const timeSeriesData = await OverviewStats.find(query)
      .sort({ date: 1 })
      .select("date logbook pendaftaran peserta_aktif mentor_aktif admin_aktif")
      .lean();

    // Ambil statistik - HANYA jika ada data
    const [posisi, asal, gender, selesai] = await Promise.all([
      Pendaftaran.countDocuments({ status: "Disetujui" }).then((count) =>
        count > 0 ? getStatistikPosisiData() : [],
      ),
      Pendaftaran.countDocuments({ status: "Disetujui" }).then((count) =>
        count > 0 ? getStatistikAsalData() : [],
      ),
      Pendaftaran.countDocuments({ status: "Disetujui" }).then((count) =>
        count > 0 ? getStatistikGenderData() : [],
      ),
      Pendaftaran.countDocuments({
        status: "Disetujui",
        "peserta.tanggalSelesaiMagang": { $exists: true, $ne: null, $ne: "" },
      }).then((count) => (count > 0 ? getStatistikSelesaiData() : [])),
    ]);

    // Get current stats for summary
    const currentStats = await getCurrentStats();

    res.json({
      timeSeries: timeSeriesData.map((item) => ({
        ...item,
        date: format(item.date, "dd/MM/yyyy"),
      })),
      statistikPosisi: posisi,
      statistikAsal: asal,
      statistikGender: gender,
      statistikSelesai: selesai,
      currentStats,
      exportTimestamp: new Date().toISOString(),
      dataStatus: timeSeriesData.length > 0 ? "available" : "empty",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengekspor data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/* ================= GET STATISTIK LOGBOOK DETAIL (REAL-TIME) ================= */
export const getLogbookStatistics = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const selectedYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    // Cek apakah ada data logbook untuk tahun ini
    const hasLogbookData = await Logbook.exists({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        {
          date: {
            $gte: format(startDate, "yyyy-MM-dd"),
            $lte: format(endDate, "yyyy-MM-dd"),
          },
        },
      ],
    });

    if (!hasLogbookData) {
      return res.json({
        monthly: [],
        byStatus: [],
        topPeserta: [],
        total: 0,
        dataStatus: "empty",
      });
    }

    // 1. TOTAL LOGBOOK PER BULAN
    const logbookMonthly = await Logbook.aggregate([
      {
        $match: {
          $or: [
            {
              createdAt: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            {
              date: {
                $gte: format(startDate, "yyyy-MM-dd"),
                $lte: format(endDate, "yyyy-MM-dd"),
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$approvalStatus",
                    ["disetujui", "approved", "Disetujui"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$approvalStatus",
                    ["menunggu", "pending", "Menunggu", "menunggu persetujuan"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [
                {
                  $in: ["$approvalStatus", ["ditolak", "rejected", "Ditolak"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { "_id.month": 1 },
      },
    ]);

    // 2. LOGBOOK BY STATUS
    const logbookByStatus = await Logbook.aggregate([
      {
        $match: {
          $or: [
            {
              createdAt: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            {
              date: {
                $gte: format(startDate, "yyyy-MM-dd"),
                $lte: format(endDate, "yyyy-MM-dd"),
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$approvalStatus",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // 3. TOP PESERTA LOGBOOK - HANYA jika ada data
    const topPesertaLogbook = await Logbook.aggregate([
      {
        $match: {
          $or: [
            {
              createdAt: {
                $gte: startDate,
                $lte: endDate,
              },
            },
            {
              date: {
                $gte: format(startDate, "yyyy-MM-dd"),
                $lte: format(endDate, "yyyy-MM-dd"),
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$user",
          name: {
            $first: {
              $ifNull: ["$userInfo.name", "Unknown"],
            },
          },
          email: {
            $first: {
              $ifNull: ["$userInfo.email", "No email"],
            },
          },
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$approvalStatus",
                    ["disetujui", "approved", "Disetujui"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $match: {
          count: { $gt: 0 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      monthly: logbookMonthly,
      byStatus: logbookByStatus,
      topPeserta: topPesertaLogbook,
      total: logbookMonthly.reduce((sum, item) => sum + item.total, 0),
      dataStatus: "available",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil statistik logbook",
      dataStatus: "error",
    });
  }
};

/* ================= GET PENDAFTARAN STATISTICS (REAL-TIME) ================= */
export const getPendaftaranStatistics = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const selectedYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

    // Cek apakah ada data pendaftaran untuk tahun ini
    const hasPendaftaranData = await Pendaftaran.exists({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    if (!hasPendaftaranData) {
      return res.json({
        monthly: [],
        byStatus: [],
        byKategori: [],
        topPosisi: [],
        total: 0,
        dataStatus: "empty",
      });
    }

    // 1. PENDAFTARAN PER BULAN
    const pendaftaranMonthly = await Pendaftaran.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ["$status", "Disetujui"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [
                { $in: ["$status", ["Menunggu", "pending", "Pending"]] },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$status", "Ditolak"] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { "_id.month": 1 },
      },
    ]);

    // 2. PENDAFTARAN BY STATUS
    const pendaftaranByStatus = await Pendaftaran.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // 3. PENDAFTARAN BY KATEGORI
    const pendaftaranByKategori = await Pendaftaran.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
          kategori: { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$kategori",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // 4. TOP POSISI PENDAFTARAN
    const topPosisiPendaftaran = await Pendaftaran.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $unwind: "$peserta",
      },
      {
        $match: {
          "peserta.posisi": { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$peserta.posisi",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      monthly: pendaftaranMonthly,
      byStatus: pendaftaranByStatus,
      byKategori: pendaftaranByKategori,
      topPosisi: topPosisiPendaftaran,
      total: pendaftaranMonthly.reduce((sum, item) => sum + item.total, 0),
      dataStatus: "available",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal mengambil statistik pendaftaran",
      dataStatus: "error",
    });
  }
};

/* ================= VERIFY DATA SYNC ================= */
export const verifyDataSync = async (req: Request, res: Response) => {
  try {
    const lastSync = await OverviewStats.findOne()
      .sort({ createdAt: -1 })
      .select("createdAt date")
      .lean();

    const currentTime = new Date();
    const lastSyncTime = lastSync?.createdAt || currentTime;

    // Cek perbedaan waktu (detik)
    const timeDiff =
      Math.abs(currentTime.getTime() - lastSyncTime.getTime()) / 1000;

    // Cek ketersediaan data terbaru
    const todayStart = startOfDay(new Date());
    const hasTodayData = await OverviewStats.exists({
      date: { $gte: todayStart },
    });

    res.json({
      status: timeDiff < 300 ? "synced" : "outdated", // 5 menit
      lastSync: lastSyncTime,
      currentTime: currentTime,
      timeDiffSeconds: timeDiff,
      hasTodayData: !!hasTodayData,
      message:
        timeDiff < 300
          ? "Data is up to date"
          : `Data sync is ${Math.round(timeDiff / 60)} minutes old`,
      dataStatus: hasTodayData ? "available" : "no_data_today",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal memverifikasi sinkronisasi data",
      status: "error",
    });
  }
};

/* ================= CHECK DATA AVAILABILITY ================= */
export const checkDataAvailability = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const selectedYear = year
      ? parseInt(year as string)
      : new Date().getFullYear();
    const selectedMonth = month
      ? parseInt(month as string)
      : new Date().getMonth() + 1;

    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    // Cek data pendaftaran
    const hasPendaftaran = await Pendaftaran.exists({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Cek data logbook
    const hasLogbook = await Logbook.exists({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        {
          date: {
            $gte: format(startDate, "yyyy-MM-dd"),
            $lte: format(endDate, "yyyy-MM-dd"),
          },
        },
      ],
    });

    // Cek data user
    const hasUsers = await User.exists({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Hitung total records
    const totalPendaftaran = await Pendaftaran.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalLogbook = await Logbook.countDocuments({
      $or: [
        { createdAt: { $gte: startDate, $lte: endDate } },
        {
          date: {
            $gte: format(startDate, "yyyy-MM-dd"),
            $lte: format(endDate, "yyyy-MM-dd"),
          },
        },
      ],
    });

    res.json({
      year: selectedYear,
      month: selectedMonth,
      hasPendaftaran: !!hasPendaftaran,
      hasLogbook: !!hasLogbook,
      hasUsers: !!hasUsers,
      totalRecords: {
        pendaftaran: totalPendaftaran,
        logbook: totalLogbook,
      },
      message:
        hasPendaftaran || hasLogbook || hasUsers
          ? "Data tersedia"
          : "Tidak ada data untuk periode ini",
      dataStatus:
        hasPendaftaran || hasLogbook || hasUsers ? "available" : "empty",
    });
  } catch (error) {
    res.status(500).json({
      message: "Gagal memeriksa ketersediaan data",
      dataStatus: "error",
    });
  }
};

/* ================= GET API STATUS ================= */
export const getApiStatus = async (req: Request, res: Response) => {
  try {
    // Cek koneksi database
    const dbStatus = mongoose.connection.readyState;
    const dbConnected = dbStatus === 1;

    // Cek apakah ada data minimal
    const hasAnyData =
      (await Pendaftaran.exists({})) ||
      (await Logbook.exists({})) ||
      (await User.exists({}));

    res.json({
      status: "online",
      database: dbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      hasData: hasAnyData,
      message: dbConnected
        ? "API is running and database is connected"
        : "API is running but database is disconnected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to get API status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ================= HELPER FUNCTIONS =================

const getCurrentStats = async () => {
  try {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const pesertaRoleId = await getRoleId("peserta");
    const mentorRoleId = await getRoleId("mentor");
    const adminRoleId = await getRoleId("admin");

    const [
      pesertaAktif,
      mentorAktif,
      adminAktif,
      pendaftaranHariIni,
      totalPendaftaranDisetujui,
      logbookHariIni,
      totalLogbook,
      totalPendaftar,
    ] = await Promise.all([
      User.countDocuments({
        status: "Aktif",
        roles: pesertaRoleId,
      }),
      User.countDocuments({
        status: "Aktif",
        roles: mentorRoleId,
      }),
      User.countDocuments({ status: "Aktif", roles: adminRoleId }),
      Pendaftaran.countDocuments({
        status: "Disetujui",
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }),
      Pendaftaran.countDocuments({ status: "Disetujui" }),
      Logbook.countDocuments({
        $or: [
          { date: format(today, "yyyy-MM-dd") },
          { createdAt: { $gte: todayStart, $lte: todayEnd } },
        ],
      }),
      Logbook.countDocuments(),
      Pendaftaran.countDocuments(),
    ]);

    return {
      pesertaAktif,
      mentorAktif,
      adminAktif,
      pendaftaranHariIni,
      pendaftaranAktif: totalPendaftaranDisetujui,
      logbookHariIni,
      totalLogbook,
      totalPendaftar,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
};

const getRoleId = async (
  roleName: string,
): Promise<mongoose.Types.ObjectId | null> => {
  try {
    const role = await Role.findOne({ name: roleName });
    return role?._id || null;
  } catch (error) {
    return null;
  }
};

// Helper functions untuk export
const getStatistikPosisiData = async () => {
  try {
    const data = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.posisi": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$peserta.posisi", count: { $sum: 1 } } },
      { $project: { posisi: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    return data;
  } catch (error) {
    return [];
  }
};

const getStatistikAsalData = async () => {
  try {
    const data = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.asal.jenis": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$peserta.asal.jenis", count: { $sum: 1 } } },
      { $project: { jenis: "$_id", count: 1, _id: 0 } },
    ]);
    return data;
  } catch (error) {
    return [];
  }
};

const getStatistikGenderData = async () => {
  try {
    const data = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.jenisKelamin": { $exists: true, $ne: null, $ne: "" },
        },
      },
      { $group: { _id: "$peserta.jenisKelamin", count: { $sum: 1 } } },
      { $project: { gender: "$_id", count: 1, _id: 0 } },
    ]);
    return data;
  } catch (error) {
    return [];
  }
};

const getStatistikSelesaiData = async () => {
  try {
    const currentDate = new Date();
    const data = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.tanggalSelesaiMagang": {
            $exists: true,
            $ne: null,
            $ne: "",
            $type: "string",
          },
        },
      },
      {
        $addFields: {
          selesaiDate: {
            $cond: {
              if: { $ne: ["$peserta.tanggalSelesaiMagang", ""] },
              then: {
                $dateFromString: {
                  dateString: "$peserta.tanggalSelesaiMagang",
                },
              },
              else: null,
            },
          },
        },
      },
      {
        $match: {
          selesaiDate: { $ne: null },
        },
      },
      {
        $bucket: {
          groupBy: "$selesaiDate",
          boundaries: [
            new Date(currentDate.getFullYear(), 0, 1),
            new Date(currentDate.getFullYear(), 3, 1),
            new Date(currentDate.getFullYear(), 6, 1),
            new Date(currentDate.getFullYear(), 9, 1),
            new Date(currentDate.getFullYear() + 1, 0, 1),
          ],
          default: "Lainnya",
          output: {
            count: { $sum: 1 },
          },
        },
      },
      {
        $project: {
          periode: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 0, 1)],
                  },
                  then: "Q1 (Jan-Mar)",
                },
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 3, 1)],
                  },
                  then: "Q2 (Apr-Jun)",
                },
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 6, 1)],
                  },
                  then: "Q3 (Jul-Sep)",
                },
                {
                  case: {
                    $eq: ["$_id", new Date(currentDate.getFullYear(), 9, 1)],
                  },
                  then: "Q4 (Okt-Des)",
                },
              ],
              default: "Lainnya",
            },
          },
          count: 1,
          _id: 0,
        },
      },
    ]);
    return data;
  } catch (error) {
    return [];
  }
};
