// scripts/dailyOverviewAggregation.ts
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import OverviewStats from "../models/Overview";
import Pendaftaran from "../models/pendaftaran";
import Logbook from "../models/Logbook";
import User from "../models/User";
import Role from "../models/Role";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";

const runDailyAggregation = async () => {
  try {
    await connectDB();

    const today = new Date();
    const yesterday = subDays(today, 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    console.log(
      `🔄 Running REAL-TIME daily aggregation for: ${format(yesterday, "yyyy-MM-dd")}`,
    );

    // Hitung semua statistik untuk kemarin
    const [
      pesertaRole,
      mentorRole,
      adminRole,
      newPendaftaran,
      totalPendaftaranDisetujui,
      logbookYesterday,
      totalLogbook,
      totalPendaftar,
      pesertaAktif,
      mentorAktif,
      adminAktif,
    ] = await Promise.all([
      Role.findOne({ name: "peserta" }),
      Role.findOne({ name: "mentor" }),
      Role.findOne({ name: "admin" }),
      Pendaftaran.countDocuments({
        createdAt: {
          $gte: yesterdayStart,
          $lte: yesterdayEnd,
        },
        status: "Disetujui",
      }),
      Pendaftaran.countDocuments({ status: "Disetujui" }),
      Logbook.countDocuments({
        $or: [
          { date: format(yesterday, "yyyy-MM-dd") },
          {
            createdAt: {
              $gte: yesterdayStart,
              $lte: yesterdayEnd,
            },
          },
        ],
      }),
      Logbook.countDocuments(),
      Pendaftaran.countDocuments(),
      User.countDocuments({
        roles: (await Role.findOne({ name: "peserta" }))?._id,
        status: "Aktif",
      }),
      User.countDocuments({
        roles: (await Role.findOne({ name: "mentor" }))?._id,
        status: "Aktif",
      }),
      User.countDocuments({
        roles: (await Role.findOne({ name: "admin" }))?._id,
        status: "Aktif",
      }),
    ]);

    // Hitung statistik posisi untuk kemarin
    const statistikPosisi = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.posisi": { $exists: true, $nin: [null, ""] },
        },
      },
      { $group: { _id: "$peserta.posisi", count: { $sum: 1 } } },
      { $project: { posisi: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Hitung statistik asal untuk kemarin
    const statistikAsal = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.asal.jenis": {
            $exists: true,
            $nin: [null, ""],
          },
        },
      },
      { $group: { _id: "$peserta.asal.jenis", count: { $sum: 1 } } },
      { $project: { jenis: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    // Hitung statistik gender untuk kemarin
    const statistikGender = await Pendaftaran.aggregate([
      { $unwind: "$peserta" },
      {
        $match: {
          status: "Disetujui",
          "peserta.jenisKelamin": {
            $exists: true,
            $nin: [null, ""],
          },
        },
      },
      { $group: { _id: "$peserta.jenisKelamin", count: { $sum: 1 } } },
      { $project: { gender: "$_id", count: 1, _id: 0 } },
    ]);

    // Tentukan data status
    const hasData = newPendaftaran > 0 || logbookYesterday > 0;
    const dataStatus = hasData ? "available" : "empty";

    const overviewData = {
      date: yesterdayStart,
      logbook: logbookYesterday,
      pendaftaran: newPendaftaran,

      // ✅ SAMAKAN FORMAT (camelCase)
      pesertaAktif,
      mentorAktif,
      adminAktif,

      // Real-time stats
      pendaftaranAktif: totalPendaftaranDisetujui,
      pendaftaranHariIni: newPendaftaran,
      logbookHariIni: logbookYesterday,
      totalPendaftar,
      totalLogbook,

      // Statistik
      statistikPosisi,
      statistikAsal,
      statistikGender,

      // Metadata
      year: yesterday.getFullYear(),
      month: yesterday.getMonth() + 1,
      dataStatus,
      lastUpdated: new Date(),
    };

    // Simpan atau update - HANYA jika ada data
    if (hasData) {
      const existing = await OverviewStats.findOne({
        date: {
          $gte: yesterdayStart,
          $lte: yesterdayEnd,
        },
      });

      if (existing) {
        await OverviewStats.findByIdAndUpdate(existing._id, overviewData);
        console.log(
          `✅ Updated existing record for ${format(yesterday, "yyyy-MM-dd")}`,
        );
      } else {
        await OverviewStats.create(overviewData);
        console.log(
          `✅ Created new record for ${format(yesterday, "yyyy-MM-dd")}`,
        );
      }
    } else {
      console.log(
        `ℹ️ No data for ${format(yesterday, "yyyy-MM-dd")}, skipping save`,
      );
    }

    // Bersihkan data lama (opsional - hapus data lebih dari 90 hari)
    const ninetyDaysAgo = subDays(today, 90);
    const deleteResult = await OverviewStats.deleteMany({
      date: { $lt: ninetyDaysAgo },
      dataStatus: "empty",
    });

    if (deleteResult.deletedCount > 0) {
      console.log(
        `🧹 Cleaned up ${deleteResult.deletedCount} old empty records`,
      );
    }

    console.log(
      `🎯 Daily REAL-TIME aggregation completed for ${format(yesterday, "yyyy-MM-dd")}`,
    );
    console.log(
      `📊 Data Status: ${dataStatus}, Pendaftaran: ${newPendaftaran}, Logbook: ${logbookYesterday}`,
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error in daily REAL-TIME aggregation:", error);
    process.exit(1);
  }
};

// Schedule dengan cron job
const scheduleAggregation = () => {
  // Jalankan setiap hari jam 00:05
  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(0, 5, 0, 0);

  if (now > targetTime) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  const timeUntilRun = targetTime.getTime() - now.getTime();

  setTimeout(async () => {
    await runDailyAggregation();
    // Set interval untuk setiap 24 jam
    setInterval(runDailyAggregation, 24 * 60 * 60 * 1000);
  }, timeUntilRun);

  console.log(`⏰ Next aggregation scheduled for: ${targetTime.toISOString()}`);
};

// Jalankan script
if (require.main === module) {
  // Jalankan langsung dan schedule untuk berikutnya
  runDailyAggregation()
    .then(() => {
      scheduleAggregation();
    })
    .catch((error) => {
      console.error("Failed to run initial aggregation:", error);
      process.exit(1);
    });
}
