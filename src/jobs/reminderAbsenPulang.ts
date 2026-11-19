import cron from "node-cron";
import Absensi from "../models/Absensi";
import Pendaftaran from "../models/pendaftaran";
import PushReminderLog from "../models/PushReminderLog";
import User from "../models/User";
import { parseDateIso } from "../utils/absensiScoring";
import {
  ensureDefaultHolidaysSeeded,
  isHolidayWib,
} from "../services/holidayService";
import { createNotification } from "../services/notificationService";

function getTodayIsoWib(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
}

export async function runAbsenPulangReminder(
  targetDateIso?: string,
): Promise<{
  date: string;
  skippedHoliday?: string;
  remindedCount: number;
}> {
  const todayIso = targetDateIso || getTodayIsoWib();

  await ensureDefaultHolidaysSeeded();
  const holidayCheck = await isHolidayWib(todayIso);
  if (holidayCheck.isHoliday) {
    console.log(
      `📅 [Reminder19] Hari ini (${todayIso}) libur (${holidayCheck.reason}). Reminder dilewati.`,
    );
    return {
      date: todayIso,
      skippedHoliday: holidayCheck.reason,
      remindedCount: 0,
    };
  }

  const pendaftaranList = await Pendaftaran.find({
    status: "Disetujui",
  })
    .select("peserta")
    .lean();

  const candidateEmails = new Set<string>();
  const candidateUserIds = new Set<string>();

  for (const pend of pendaftaranList as any[]) {
    for (const ps of pend.peserta || []) {
      if (
        ps.statusMagang === "Selesai Magang" ||
        ps.statusMagang === "Tidak Magang"
      ) {
        continue;
      }

      const startIso = parseDateIso(ps.tanggalMulaiMagang);
      const endIso = parseDateIso(ps.tanggalSelesaiMagang);
      if (startIso && todayIso < startIso) continue;
      if (endIso && todayIso > endIso) continue;

      if (ps.user) {
        candidateUserIds.add(ps.user.toString());
      }
      if (ps.email) {
        candidateEmails.add(String(ps.email).trim().toLowerCase());
      }
    }
  }

  if (candidateUserIds.size === 0 && candidateEmails.size === 0) {
    return { date: todayIso, remindedCount: 0 };
  }

  const userMatchOr: any[] = [];
  if (candidateUserIds.size > 0) {
    userMatchOr.push({ _id: { $in: Array.from(candidateUserIds) } });
  }
  if (candidateEmails.size > 0) {
    userMatchOr.push({
      email: {
        $in: Array.from(candidateEmails).map(
          (e) => new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        ),
      },
    });
  }

  const activeUsers = await User.find({
    status: "Aktif",
    $or: userMatchOr,
  })
    .select("_id email")
    .lean();

  if (!activeUsers.length) {
    return { date: todayIso, remindedCount: 0 };
  }

  const absensiToday = await Absensi.find({ date: todayIso }).lean();
  const absensiByUserId = new Map<string, any>();
  const absensiByEmail = new Map<string, any>();
  for (const rec of absensiToday as any[]) {
    if (rec.user) absensiByUserId.set(rec.user.toString(), rec);
    if (rec.email) absensiByEmail.set(String(rec.email).toLowerCase(), rec);
  }

  const existingLogs = await PushReminderLog.find({
    date: todayIso,
    type: "absen_pulang_19",
  })
    .select("user")
    .lean();
  const alreadyReminded = new Set(
    existingLogs.map((l: any) => l.user.toString()),
  );

  let remindedCount = 0;

  for (const user of activeUsers as any[]) {
    const userId = user._id.toString();
    if (alreadyReminded.has(userId)) continue;

    const emailLower = String(user.email || "").toLowerCase();
    const absensi =
      absensiByUserId.get(userId) || absensiByEmail.get(emailLower);

    // Kecualikan jika izin atau sudah melakukan absen pulang
    if (absensi?.attendanceMode === "izin") continue;
    if (absensi?.checkOut?.time) continue;

    try {
      await PushReminderLog.create({
        user: user._id,
        date: todayIso,
        type: "absen_pulang_19",
      });
    } catch (err: any) {
      if (err?.code === 11000) continue; // Sudah dicatat oleh instance lain
      throw err;
    }

    const hasCheckedIn = Boolean(absensi?.checkIn?.time);
    const title = hasCheckedIn
      ? "Pengingat Absen Pulang"
      : "Pengingat Absensi Hari Ini";
    const message = hasCheckedIn
      ? "Anda belum melakukan absen pulang hari ini. Segera lakukan absen pulang sebelum pukul 23.00 WIB."
      : "Anda belum mengisi absensi atau keterangan izin hari ini. Segera lengkapi sebelum pukul 23.00 WIB.";

    await createNotification({
      recipientId: user._id,
      title,
      message,
      type: "warning",
      linkUrl: "/dashboard/peserta/absen",
    });

    remindedCount++;
  }

  console.log(
    `🔔 [Reminder19] Selesai untuk ${todayIso}: ${remindedCount} peserta dikirim pengingat.`,
  );
  return { date: todayIso, remindedCount };
}

/**
 * Cron harian pukul 19.00 WIB (Asia/Jakarta)
 */
export const reminderAbsenPulangJob = () => {
  cron.schedule(
    "0 19 * * *",
    async () => {
      console.log("🔔 Cron Reminder Absen Pulang (19.00 WIB) berjalan...");
      try {
        await runAbsenPulangReminder();
      } catch (error) {
        console.error("❌ Cron reminder absen pulang error:", error);
      }
    },
    { timezone: "Asia/Jakarta" },
  );
};
