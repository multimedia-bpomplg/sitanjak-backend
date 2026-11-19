import { Response } from "express";
import fs from "fs";
import path from "path";
import Absensi from "../models/Absensi";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import Logbook from "../models/Logbook";
import {
  getHMinus3CutoffIso,
  getFullInternshipWorkdaysUntilHMinus3,
} from "../utils/absensiScoring";

/* ================= CONSTANTS ================= */

// Koordinat Kantor Balai Besar POM di Palembang (Jl. Pangeran Ratu, 5 Ulu, Seberang Ulu I, Palembang)
const BBPOM_PALEMBANG_COORD = {
  lat: -3.012694,
  lng: 104.774716,
  radiusMeters: 400,
};

/* ================= HELPERS ================= */

function getNowWIB(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
}

function toWibDate(d: Date | string): Date {
  const base = d instanceof Date ? d : new Date(d);
  return new Date(base.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeWIB(d: Date): string {
  return (
    d
      .toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/:/g, ".") + " WIB"
  );
}

function parseDateIso(raw?: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

function isPastAttendanceCutoffWib(nowWib: Date): boolean {
  const currentSec =
    nowWib.getHours() * 3600 + nowWib.getMinutes() * 60 + nowWib.getSeconds();
  return currentSec > 23 * 3600; // lewat 23.00.00 WIB
}

function shiftIsoDate(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + deltaDays));
}

function getExpectedWorkdays(
  startIso: string | null,
  endIso: string | null,
  cutoffEndIso: string,
): Set<string> {
  const result = new Set<string>();
  if (!startIso) return result;

  const effectiveEnd = endIso && endIso < cutoffEndIso ? endIso : cutoffEndIso;
  if (effectiveEnd < startIso) return result;

  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = effectiveEnd.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);

  let guard = 0;
  while (cur <= last && guard < 400) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      result.add(toIsoDate(cur));
    }
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeUploadedFile(relativePath?: string) {
  if (!relativePath) return;
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn("Gagal menghapus file absensi lama:", err);
  }
}

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function scoreByDiffMinutes(minutes: number): number {
  if (minutes <= 0) return 100;
  if (minutes <= 30) return 90;
  if (minutes <= 60) return 80;
  if (minutes <= 120) return 65;
  if (minutes <= 180) return 50;
  return 25;
}

function evaluateCheckInTime(nowWib: Date) {
  const currentSec =
    nowWib.getHours() * 3600 + nowWib.getMinutes() * 60 + nowWib.getSeconds();
  const limitSec = 8 * 3600; // 08.00.00 WIB
  const diffSec = currentSec - limitSec;

  if (diffSec <= 0) {
    return {
      timeStatus: "on_time" as const,
      timeStatusLabel: "Tepat Waktu",
      diffMinutes: 0,
      score: 100,
    };
  }

  const lateMinutes = Math.ceil(diffSec / 60);
  const score = scoreByDiffMinutes(lateMinutes);
  return {
    timeStatus: "late" as const,
    timeStatusLabel: "Terlambat (> 08.00)",
    diffMinutes: lateMinutes,
    score,
  };
}

function evaluateCheckOutTime(nowWib: Date, hasNote: boolean) {
  const currentSec =
    nowWib.getHours() * 3600 + nowWib.getMinutes() * 60 + nowWib.getSeconds();
  const limitSec = 16 * 3600; // 16.00.00 WIB
  const diffSec = limitSec - currentSec;

  if (diffSec <= 0) {
    return {
      timeStatus: "on_time" as const,
      timeStatusLabel: "Pulang Tepat Waktu",
      diffMinutes: 0,
      score: 100,
    };
  }

  if (hasNote) {
    return {
      timeStatus: "on_time_note" as const,
      timeStatusLabel: "Tepat Waktu (Dengan Keterangan)",
      diffMinutes: 0,
      score: 100,
    };
  }

  const earlyMinutes = Math.ceil(diffSec / 60);
  const score = scoreByDiffMinutes(earlyMinutes);
  return {
    timeStatus: "early_no_note" as const,
    timeStatusLabel: "Pulang Tidak Tepat Waktu",
    diffMinutes: earlyMinutes,
    score,
  };
}

function normalizeLegacyEntry(
  type: "checkIn" | "checkOut",
  rawEntry: any,
  hasKoreksi: boolean,
) {
  if (!rawEntry) return null;
  const entry =
    typeof rawEntry.toObject === "function" ? rawEntry.toObject() : { ...rawEntry };

  // Data absen yang dibuat sebelum fitur skoring tidak menyimpan diffMinutes/score di DB,
  // sehingga Mongoose memberi default (diffMinutes=0, score=100) meski timeStatus terlambat/pulang awal.
  const needsBackfill =
    !hasKoreksi &&
    entry.time &&
    ((type === "checkIn" &&
      entry.timeStatus === "late" &&
      (entry.diffMinutes === 0 || entry.score === 100)) ||
      (type === "checkOut" &&
        entry.timeStatus === "early_no_note" &&
        (entry.diffMinutes === 0 || entry.score === 100)));

  if (needsBackfill) {
    const entryWib = toWibDate(entry.time);
    const evaluated =
      type === "checkIn"
        ? evaluateCheckInTime(entryWib)
        : evaluateCheckOutTime(entryWib, Boolean(entry.keterangan));

    entry.timeStatus = evaluated.timeStatus;
    entry.timeStatusLabel = evaluated.timeStatusLabel;
    entry.diffMinutes = evaluated.diffMinutes;
    entry.score = evaluated.score;
  }

  return entry;
}

async function validateActiveInternship(
  userId: string,
  email: string,
  todayIso: string,
): Promise<
  | {
      valid: true;
      peserta: any;
    }
  | {
      valid: false;
      statusCode: number;
      message: string;
    }
> {
  const emailRegex = new RegExp(`^${escapeRegex(email)}$`, "i");

  const pendaftaran = await Pendaftaran.findOne({
    status: "Disetujui",
    $or: [{ "peserta.user": userId }, { "peserta.email": emailRegex }],
  }).sort({ createdAt: -1 });

  if (!pendaftaran) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "Anda belum terdaftar sebagai peserta magang aktif yang disetujui.",
    };
  }

  const peserta = pendaftaran.peserta.find(
    (p: any) =>
      p.user?.toString() === userId ||
      p.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!peserta) {
    return {
      valid: false,
      statusCode: 403,
      message: "Data peserta magang untuk akun ini tidak ditemukan.",
    };
  }

  if (
    peserta.statusMagang === "Selesai Magang" ||
    peserta.statusMagang === "Tidak Magang"
  ) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "Masa magang Anda sudah selesai atau tidak aktif. Fitur absensi ditutup.",
    };
  }

  const startIso = parseDateIso(peserta.tanggalMulaiMagang);
  const endIso = parseDateIso(peserta.tanggalSelesaiMagang);

  if (startIso && todayIso < startIso) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "Periode magang Anda belum dimulai. Absensi hanya tersedia selama masa magang aktif.",
    };
  }

  if (endIso && todayIso > endIso) {
    return {
      valid: false,
      statusCode: 403,
      message:
        "Masa magang Anda telah berakhir. Absensi baru sudah tidak tersedia.",
    };
  }

  return { valid: true, peserta };
}

/* ================= CONTROLLERS ================= */

// GET /api/absensi/today
export const getTodayAbsensi = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const nowWib = getNowWIB();
    const todayIso = toIsoDate(nowWib);

    const record = await Absensi.findOne({
      user: userId,
      date: todayIso,
    });

    const hasLogbookToday = Boolean(
      await Logbook.exists({ user: userId, date: todayIso }),
    );

    return res.json({
      date: todayIso,
      absensi: record || null,
      hasLogbookToday,
    });
  } catch (err) {
    console.error("[GET TODAY ABSENSI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat data absensi hari ini" });
  }
};

// GET /api/absensi/riwayat
export const getRiwayatAbsensi = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const records = await Absensi.find({ user: userId })
      .sort({ date: -1 })
      .limit(90);

    return res.json(records);
  } catch (err) {
    console.error("[GET RIWAYAT ABSENSI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat riwayat absensi peserta" });
  }
};

// GET /api/absensi/summary
export const getAbsensiSummary = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || "").toLowerCase();
    const records = await Absensi.find({ user: userId });

    const nowWib = getNowWIB();
    const todayIso = toIsoDate(nowWib);
    const cutoffEndIso = isPastAttendanceCutoffWib(nowWib)
      ? todayIso
      : shiftIsoDate(todayIso, -1);

    const emailRegex = email ? new RegExp(`^${escapeRegex(email)}$`, "i") : null;
    const pendaftaran = await Pendaftaran.findOne({
      status: "Disetujui",
      $or: [
        { "peserta.user": userId },
        ...(emailRegex ? [{ "peserta.email": emailRegex }] : []),
      ],
    }).sort({ createdAt: -1 });

    const peserta = pendaftaran?.peserta.find(
      (p: any) =>
        p.user?.toString() === userId ||
        (email && p.email?.toLowerCase() === email),
    );

    const { startIso: magangStartIso, cutoffEndIso: hMinus3Iso } =
      getHMinus3CutoffIso(
        peserta?.tanggalMulaiMagang,
        peserta?.tanggalSelesaiMagang,
      );
    const expectedDates =
      peserta && peserta.statusMagang !== "Tidak Magang"
        ? getFullInternshipWorkdaysUntilHMinus3(
            peserta.tanggalMulaiMagang,
            peserta.tanggalSelesaiMagang,
          )
        : new Set<string>();

    const attendedDates = new Set<string>();
    let sumDaily = 0;
    let sumIn = 0;
    let countIn = 0;
    let sumOut = 0;
    let countOut = 0;

    for (const r of records) {
      if (!r.date) continue;
      if (magangStartIso && r.date < magangStartIso) continue;
      if (hMinus3Iso && r.date > hMinus3Iso) continue;
      if (expectedDates.size > 0 && !expectedDates.has(r.date)) continue;

      attendedDates.add(r.date);
      if (r.attendanceMode === "izin") {
        sumDaily += 100;
        continue;
      }

      const hasKoreksi = Boolean(r.koreksiNote);
      const normIn = normalizeLegacyEntry("checkIn", r.checkIn, hasKoreksi);
      const normOut = normalizeLegacyEntry("checkOut", r.checkOut, hasKoreksi);
      const inScore = normIn?.score ?? 0;
      const outScore = normOut?.score ?? 0;
      const daily =
        hasKoreksi && typeof r.dailyScore === "number" && r.dailyScore > 0
          ? r.dailyScore
          : normOut
            ? Math.round((inScore + outScore) / 2)
            : Math.round(inScore / 2);

      sumDaily += daily;
      if (normIn) {
        sumIn += inScore;
        countIn++;
      }
      if (normOut) {
        sumOut += outScore;
        countOut++;
      }
    }

    let missedDays = 0;
    for (const d of expectedDates) {
      if (!attendedDates.has(d)) {
        missedDays++;
      }
    }

    const totalDays = attendedDates.size;
    const effectiveTotalDays = totalDays + missedDays;

    return res.json({
      totalDays,
      missedDays,
      effectiveTotalDays,
      averageScore:
        effectiveTotalDays > 0 ? Math.round(sumDaily / effectiveTotalDays) : 0,
      averageCheckInScore:
        countIn + missedDays > 0
          ? Math.round(sumIn / (countIn + missedDays))
          : 0,
      averageCheckOutScore:
        countOut + missedDays > 0
          ? Math.round(sumOut / (countOut + missedDays))
          : 0,
    });
  } catch (err) {
    console.error("[GET SUMMARY ABSENSI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat ringkasan nilai absensi" });
  }
};

// POST /api/absensi/check-in
export const submitCheckIn = async (req: any, res: Response) => {
  const uploadedFile = req.file as Express.Multer.File | undefined;
  const newPhotoPath = uploadedFile
    ? `uploads/absensi/${uploadedFile.filename}`
    : undefined;

  try {
    const userId = req.user.id;
    const email = req.user.email;
    const nowWib = getNowWIB();
    const todayIso = toIsoDate(nowWib);

    // 1. Wajib peserta magang aktif
    const activeCheck = await validateActiveInternship(userId, email, todayIso);
    if (!activeCheck.valid) {
      removeUploadedFile(newPhotoPath);
      return res
        .status(activeCheck.statusCode)
        .json({ message: activeCheck.message });
    }

    // 1b. Kunci setelah pukul 23.00 WIB
    if (isPastAttendanceCutoffWib(nowWib)) {
      removeUploadedFile(newPhotoPath);
      return res.status(403).json({
        message:
          "Batas waktu pengisian absensi hari ini hingga pukul 23.00 WIB telah berakhir. Hari ini dihitung tidak hadir (0%).",
      });
    }

    // 2. Validasi foto wajah wajib ada
    if (!newPhotoPath) {
      return res.status(400).json({
        message: "Foto wajah wajib diambil terlebih dahulu.",
      });
    }

    // 2b. Validasi mode absensi (masuk / wfh)
    const rawMode = String(req.body.attendanceMode || "masuk")
      .trim()
      .toLowerCase();
    if (rawMode !== "masuk" && rawMode !== "wfh") {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Mode absensi Check-In harus berupa 'masuk' atau 'wfh'.",
      });
    }
    const attendanceMode: "masuk" | "wfh" = rawMode;

    // 3. Validasi koordinat lokasi
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const accuracy = Math.round(Number(req.body.accuracy) || 15);
    const address = String(req.body.address || `Koordinat ${lat}, ${lng}`).trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Koordinat lokasi GPS tidak valid atau belum terkunci.",
      });
    }

    // 4. Cek apakah sudah Izin atau Check-In hari ini
    const existing = await Absensi.findOne({ user: userId, date: todayIso });
    if (existing?.attendanceMode === "izin") {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Hari ini Anda sudah tercatat Izin sehingga tidak perlu Check-In.",
      });
    }
    if (existing?.checkIn) {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Anda sudah melakukan Absen Pagi (Check-In) hari ini.",
      });
    }

    // 5. Hitung jarak ke kantor BBPOM Palembang & evaluasi jam server WIB
    const distanceMeters = calculateDistanceMeters(
      lat,
      lng,
      BBPOM_PALEMBANG_COORD.lat,
      BBPOM_PALEMBANG_COORD.lng,
    );
    const isInsideBpom =
      distanceMeters <= BBPOM_PALEMBANG_COORD.radiusMeters;
    const { timeStatus, timeStatusLabel, diffMinutes, score } =
      evaluateCheckInTime(nowWib);

    const checkInEntry = {
      time: new Date(),
      timeWIB: formatTimeWIB(nowWib),
      photoPath: newPhotoPath,
      location: {
        lat,
        lng,
        accuracy,
        address,
        distanceMeters,
        isInsideBpom,
      },
      timeStatus,
      timeStatusLabel,
      diffMinutes,
      score,
      attemptCount: 1,
    };

    const dailyScore = Math.round(score / 2);

    const saved = await Absensi.findOneAndUpdate(
      { user: userId, date: todayIso },
      {
        $set: {
          user: userId,
          email: email.toLowerCase(),
          date: todayIso,
          attendanceMode,
          checkIn: checkInEntry,
          dailyScore,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(201).json({
      success: true,
      message: `Absen Pagi${attendanceMode === "wfh" ? " (WFH)" : ""} berhasil dicatat (${timeStatusLabel})`,
      absensi: saved,
    });
  } catch (err) {
    removeUploadedFile(newPhotoPath);
    console.error("[CHECK-IN ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan Absen Pagi (Check-In)" });
  }
};

// POST /api/absensi/check-out
export const submitCheckOut = async (req: any, res: Response) => {
  const uploadedFile = req.file as Express.Multer.File | undefined;
  const newPhotoPath = uploadedFile
    ? `uploads/absensi/${uploadedFile.filename}`
    : undefined;

  try {
    const userId = req.user.id;
    const email = req.user.email;
    const nowWib = getNowWIB();
    const todayIso = toIsoDate(nowWib);

    // 1. Wajib peserta magang aktif
    const activeCheck = await validateActiveInternship(userId, email, todayIso);
    if (!activeCheck.valid) {
      removeUploadedFile(newPhotoPath);
      return res
        .status(activeCheck.statusCode)
        .json({ message: activeCheck.message });
    }

    // 1b. Kunci setelah pukul 23.00 WIB
    if (isPastAttendanceCutoffWib(nowWib)) {
      removeUploadedFile(newPhotoPath);
      return res.status(403).json({
        message:
          "Batas waktu pengisian absensi hari ini hingga pukul 23.00 WIB telah berakhir.",
      });
    }

    // 2. Validasi foto wajah
    if (!newPhotoPath) {
      return res.status(400).json({
        message: "Foto wajah wajib diambil terlebih dahulu.",
      });
    }

    // 3. Wajib sudah Check-In hari ini dan bukan status Izin
    const existing = await Absensi.findOne({ user: userId, date: todayIso });
    if (existing?.attendanceMode === "izin") {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Hari ini Anda tercatat Izin sehingga tidak perlu Check-Out.",
      });
    }
    if (!existing || !existing.checkIn) {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message:
          "Anda belum melakukan Absen Pagi (Check-In) hari ini. Silakan Check-In terlebih dahulu.",
      });
    }

    // 3b. Wajib sudah mengisi Logbook harian hari ini sebelum Check-Out
    const hasLogbookToday = Boolean(
      await Logbook.exists({ user: userId, date: todayIso }),
    );
    if (!hasLogbookToday) {
      removeUploadedFile(newPhotoPath);
      return res.status(403).json({
        message:
          "Anda wajib mengisi laporan kegiatan harian (logbook) hari ini terlebih dahulu sebelum melakukan Absen Pulang (Check-Out).",
      });
    }

    // 4. Validasi koordinat lokasi
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    const accuracy = Math.round(Number(req.body.accuracy) || 15);
    const address = String(req.body.address || `Koordinat ${lat}, ${lng}`).trim();
    const keteranganRaw = String(req.body.keterangan || "").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Koordinat lokasi GPS tidak valid atau belum terkunci.",
      });
    }

    const hasNote = keteranganRaw.length >= 5;
    if (keteranganRaw.length > 0 && !hasNote) {
      removeUploadedFile(newPhotoPath);
      return res.status(400).json({
        message: "Keterangan pulang minimal 5 karakter.",
      });
    }

    // 5. Hitung jarak & evaluasi waktu pulang
    const distanceMeters = calculateDistanceMeters(
      lat,
      lng,
      BBPOM_PALEMBANG_COORD.lat,
      BBPOM_PALEMBANG_COORD.lng,
    );
    const isInsideBpom =
      distanceMeters <= BBPOM_PALEMBANG_COORD.radiusMeters;
    const { timeStatus, timeStatusLabel, diffMinutes, score } =
      evaluateCheckOutTime(nowWib, hasNote);

    const prevPhotoPath = existing.checkOut?.photoPath;
    const prevAttempts = existing.checkOut?.attemptCount || 0;
    const checkInScore = existing.checkIn?.score ?? 0;

    existing.checkOut = {
      time: new Date(),
      timeWIB: formatTimeWIB(nowWib),
      photoPath: newPhotoPath,
      location: {
        lat,
        lng,
        accuracy,
        address,
        distanceMeters,
        isInsideBpom,
      },
      timeStatus,
      timeStatusLabel,
      diffMinutes,
      score,
      keterangan: hasNote ? keteranganRaw : "",
      attemptCount: prevAttempts + 1,
    };
    existing.dailyScore = Math.round((checkInScore + score) / 2);

    await existing.save();

    // Hapus foto Check-Out sebelumnya agar tidak menumpuk di disk
    if (prevPhotoPath && prevPhotoPath !== newPhotoPath) {
      removeUploadedFile(prevPhotoPath);
    }

    return res.json({
      success: true,
      message: `Absen Pulang${existing.attendanceMode === "wfh" ? " (WFH)" : ""} berhasil disimpan (${timeStatusLabel})`,
      absensi: existing,
    });
  } catch (err) {
    removeUploadedFile(newPhotoPath);
    console.error("[CHECK-OUT ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan Absen Pulang (Check-Out)" });
  }
};

// POST /api/absensi/izin
export const submitIzin = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const nowWib = getNowWIB();
    const todayIso = toIsoDate(nowWib);

    const activeCheck = await validateActiveInternship(userId, email, todayIso);
    if (!activeCheck.valid) {
      return res
        .status(activeCheck.statusCode)
        .json({ message: activeCheck.message });
    }

    if (isPastAttendanceCutoffWib(nowWib)) {
      return res.status(403).json({
        message:
          "Batas waktu pengisian absensi hari ini hingga pukul 23.00 WIB telah berakhir.",
      });
    }

    const keteranganRaw = String(req.body?.keterangan || "").trim();
    if (keteranganRaw.length < 5) {
      return res.status(400).json({
        message: "Keterangan / alasan izin wajib diisi minimal 5 karakter.",
      });
    }

    const existing = await Absensi.findOne({ user: userId, date: todayIso });
    if (existing?.checkIn) {
      return res.status(400).json({
        message:
          "Anda sudah melakukan Absen Pagi (Check-In) hari ini sehingga tidak dapat mengajukan Izin.",
      });
    }
    if (existing?.attendanceMode === "izin") {
      return res.status(400).json({
        message: "Anda sudah mencatat keterangan Izin untuk hari ini.",
      });
    }

    const saved = await Absensi.findOneAndUpdate(
      { user: userId, date: todayIso },
      {
        $set: {
          user: userId,
          email: email.toLowerCase(),
          date: todayIso,
          attendanceMode: "izin",
          izinNote: keteranganRaw,
          izinSubmittedAt: new Date(),
          izinSubmittedWIB: formatTimeWIB(nowWib),
          dailyScore: 100,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(201).json({
      success: true,
      message: "Keterangan Izin hari ini berhasil disimpan.",
      absensi: saved,
    });
  } catch (err) {
    console.error("[SUBMIT IZIN ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan keterangan Izin" });
  }
};

/* ================= MANAGE HELPERS (MENTOR / ADMIN / SUPERADMIN) ================= */

type PesertaMeta = {
  userId?: string;
  nama: string;
  email: string;
  posisi: string;
  institusi: string;
  mentorId?: string;
  mentorName: string;
  tanggalMulaiMagang?: string;
  tanggalSelesaiMagang?: string;
  statusMagang?: string;
};

async function getAuthorizedPesertaScope(reqUser: {
  id: string;
  roles: string[];
}) {
  const isAdminOrSuper =
    reqUser.roles.includes("admin") || reqUser.roles.includes("superadmin");
  const isMentorOnly = !isAdminOrSuper && reqUser.roles.includes("mentor");

  const query: any = { status: "Disetujui" };
  if (isMentorOnly) {
    query["peserta.mentor"] = reqUser.id;
  }

  const pendaftaranList = await Pendaftaran.find(query).populate(
    "peserta.mentor",
    "name email",
  );

  const pesertaList: PesertaMeta[] = [];
  const byUserId = new Map<string, PesertaMeta>();
  const byEmail = new Map<string, PesertaMeta>();

  for (const pend of pendaftaranList) {
    for (const ps of pend.peserta as any[]) {
      const mentorId = ps.mentor?._id
        ? ps.mentor._id.toString()
        : ps.mentor
          ? ps.mentor.toString()
          : undefined;

      if (isMentorOnly && mentorId !== reqUser.id) {
        continue;
      }

      const emailLower = (ps.email || "").trim().toLowerCase();
      const userIdStr = ps.user ? ps.user.toString() : undefined;

      const meta: PesertaMeta = {
        userId: userIdStr,
        nama: ps.nama || "Peserta Magang",
        email: emailLower,
        posisi: ps.posisi || "-",
        institusi: ps.asal?.nama || "-",
        mentorId,
        mentorName: ps.mentor?.name || "Belum Ditentukan",
        tanggalMulaiMagang: ps.tanggalMulaiMagang,
        tanggalSelesaiMagang: ps.tanggalSelesaiMagang,
        statusMagang: ps.statusMagang,
      };

      pesertaList.push(meta);
      if (userIdStr) byUserId.set(userIdStr, meta);
      if (emailLower) byEmail.set(emailLower, meta);
    }
  }

  return {
    isMentorOnly,
    pesertaList,
    byUserId,
    byEmail,
  };
}

function buildAbsensiFilterQuery(
  scope: Awaited<ReturnType<typeof getAuthorizedPesertaScope>>,
  queryParams: any,
) {
  const mongoQuery: any = {};

  if (scope.isMentorOnly) {
    const allowedUserIds = scope.pesertaList
      .map((p) => p.userId)
      .filter((id): id is string => Boolean(id));
    const allowedEmails = scope.pesertaList
      .map((p) => p.email)
      .filter(Boolean);

    mongoQuery.$or = [
      ...(allowedUserIds.length > 0 ? [{ user: { $in: allowedUserIds } }] : []),
      ...(allowedEmails.length > 0 ? [{ email: { $in: allowedEmails } }] : []),
    ];

    if (mongoQuery.$or.length === 0) {
      return null; // mentor has no supervised students
    }
  }

  const { date, startDate, endDate } = queryParams;
  if (date && typeof date === "string" && date !== "all") {
    mongoQuery.date = date;
  } else if (startDate || endDate) {
    mongoQuery.date = {};
    if (startDate) mongoQuery.date.$gte = String(startDate);
    if (endDate) mongoQuery.date.$lte = String(endDate);
  }

  return mongoQuery;
}

/* ================= MANAGE CONTROLLERS (MENTOR / ADMIN / SUPERADMIN) ================= */

// GET /api/absensi/manage/list
export const getManageAbsensiList = async (req: any, res: Response) => {
  try {
    const scope = await getAuthorizedPesertaScope(req.user);
    const mongoQuery = buildAbsensiFilterQuery(scope, req.query);

    if (!mongoQuery) {
      return res.json({
        summary: {
          totalRecords: 0,
          tepatWaktuCount: 0,
          terlambatCount: 0,
          outsideBpomCount: 0,
          averageDailyScore: 0,
        },
        items: [],
      });
    }

    const rawRecords = await Absensi.find(mongoQuery)
      .populate("user", "name email")
      .sort({ date: -1, updatedAt: -1 })
      .limit(500);

    const areaFilter = String(req.query.area || "all");
    const searchQ = String(req.query.search || "")
      .trim()
      .toLowerCase();

    const enriched = rawRecords
      .map((rec: any) => {
        const uId = rec.user?._id ? rec.user._id.toString() : rec.user?.toString();
        const emailLower = (rec.email || rec.user?.email || "").toLowerCase();
        const meta =
          (uId && scope.byUserId.get(uId)) || scope.byEmail.get(emailLower);

        const namaPeserta = meta?.nama || rec.user?.name || "Peserta";
        const posisi = meta?.posisi || "-";
        const institusi = meta?.institusi || "-";
        const mentorName = meta?.mentorName || "Belum Ditentukan";

        const attendanceMode: "masuk" | "wfh" | "izin" =
          rec.attendanceMode === "izin"
            ? "izin"
            : rec.attendanceMode === "wfh"
              ? "wfh"
              : "masuk";

        const hasKoreksi = Boolean(rec.koreksiNote);
        const normIn =
          attendanceMode === "izin"
            ? null
            : normalizeLegacyEntry("checkIn", rec.checkIn, hasKoreksi);
        const normOut =
          attendanceMode === "izin"
            ? null
            : normalizeLegacyEntry("checkOut", rec.checkOut, hasKoreksi);

        const isCheckInOutside = Boolean(
          normIn?.location && !normIn.location.isInsideBpom,
        );
        const isCheckOutOutside = Boolean(
          normOut?.location && !normOut.location.isInsideBpom,
        );
        const isAnyOutside =
          attendanceMode === "izin" ? false : isCheckInOutside || isCheckOutOutside;

        const inScore = normIn?.score ?? 0;
        const outScore = normOut?.score ?? 0;
        const dailyScore =
          attendanceMode === "izin"
            ? 100
            : hasKoreksi && typeof rec.dailyScore === "number" && rec.dailyScore > 0
              ? rec.dailyScore
              : normOut
                ? Math.round((inScore + outScore) / 2)
                : Math.round(inScore / 2);

        return {
          _id: rec._id,
          date: rec.date,
          userId: uId,
          email: emailLower,
          namaPeserta,
          posisi,
          institusi,
          mentorName,
          attendanceMode,
          izinNote: rec.izinNote || "",
          izinSubmittedWIB: rec.izinSubmittedWIB || "",
          checkIn: normIn,
          checkOut: normOut,
          dailyScore,
          isAnyOutside,
          koreksiNote: rec.koreksiNote || "",
          koreksiBy: rec.koreksiBy?.name ? rec.koreksiBy : null,
          koreksiAt: rec.koreksiAt || null,
        };
      })
      .filter((item) => {
        if (areaFilter === "inside") {
          if (item.attendanceMode === "izin" || item.isAnyOutside) return false;
        }
        if (areaFilter === "outside") {
          if (item.attendanceMode !== "masuk" || !item.isAnyOutside) return false;
        }
        if (areaFilter === "wfh" && item.attendanceMode !== "wfh") return false;
        if (areaFilter === "izin" && item.attendanceMode !== "izin") return false;
        if (searchQ) {
          const hay = `${item.namaPeserta} ${item.email} ${item.posisi} ${item.institusi} ${item.mentorName}`.toLowerCase();
          if (!hay.includes(searchQ)) return false;
        }
        return true;
      });

    const totalRecords = enriched.length;
    const tepatWaktuCount = enriched.filter(
      (i) => i.checkIn?.timeStatus === "on_time",
    ).length;
    const terlambatCount = enriched.filter(
      (i) =>
        i.checkIn?.timeStatus === "late" ||
        i.checkOut?.timeStatus === "early_no_note",
    ).length;
    const outsideBpomCount = enriched.filter(
      (i) => i.attendanceMode === "masuk" && i.isAnyOutside,
    ).length;
    const averageDailyScore =
      totalRecords > 0
        ? Math.round(
            enriched.reduce((sum, i) => sum + i.dailyScore, 0) / totalRecords,
          )
        : 0;

    return res.json({
      summary: {
        totalRecords,
        tepatWaktuCount,
        terlambatCount,
        outsideBpomCount,
        averageDailyScore,
      },
      items: enriched,
    });
  } catch (err) {
    console.error("[GET MANAGE ABSENSI LIST ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat daftar absensi peserta" });
  }
};

// GET /api/absensi/manage/rekap-peserta
export const getManageRekapPeserta = async (req: any, res: Response) => {
  try {
    const scope = await getAuthorizedPesertaScope(req.user);
    const mongoQuery = buildAbsensiFilterQuery(scope, req.query);

    const searchQ = String(req.query.search || "")
      .trim()
      .toLowerCase();

    const records = mongoQuery
      ? await Absensi.find(mongoQuery).populate("user", "name email")
      : [];

    const nowWib = getNowWIB();
    const todayIso = toIsoDate(nowWib);
    const defaultCutoffEndIso = isPastAttendanceCutoffWib(nowWib)
      ? todayIso
      : shiftIsoDate(todayIso, -1);

    const filterDate =
      req.query.date && typeof req.query.date === "string" && req.query.date !== "all"
        ? req.query.date
        : null;
    const filterStart = req.query.startDate ? String(req.query.startDate) : null;
    const filterEnd = req.query.endDate ? String(req.query.endDate) : null;

    type RekapAcc = {
      key: string;
      namaPeserta: string;
      email: string;
      posisi: string;
      institusi: string;
      mentorName: string;
      statusMagang: string;
      tanggalMulaiMagang?: string;
      tanggalSelesaiMagang?: string;
      attendedDates: Set<string>;
      totalHari: number;
      wfhCount: number;
      izinCount: number;
      tepatWaktuMasuk: number;
      telatMasuk: number;
      pulangAwalTanpaKet: number;
      luarAreaBpom: number;
      sumInScore: number;
      countIn: number;
      sumOutScore: number;
      countOut: number;
      sumDailyScore: number;
    };

    const map = new Map<string, RekapAcc>();

    // Seed with all peserta in authorized scope
    for (const ps of scope.pesertaList) {
      if (!ps.email) continue;
      map.set(ps.email, {
        key: ps.email,
        namaPeserta: ps.nama,
        email: ps.email,
        posisi: ps.posisi,
        institusi: ps.institusi,
        mentorName: ps.mentorName,
        statusMagang: ps.statusMagang || "Sedang Magang",
        tanggalMulaiMagang: ps.tanggalMulaiMagang,
        tanggalSelesaiMagang: ps.tanggalSelesaiMagang,
        attendedDates: new Set<string>(),
        totalHari: 0,
        wfhCount: 0,
        izinCount: 0,
        tepatWaktuMasuk: 0,
        telatMasuk: 0,
        pulangAwalTanpaKet: 0,
        luarAreaBpom: 0,
        sumInScore: 0,
        countIn: 0,
        sumOutScore: 0,
        countOut: 0,
        sumDailyScore: 0,
      });
    }

    for (const rec of records as any[]) {
      const emailLower = (rec.email || rec.user?.email || "").toLowerCase();
      const uId = rec.user?._id ? rec.user._id.toString() : rec.user?.toString();
      const meta =
        (uId && scope.byUserId.get(uId)) || scope.byEmail.get(emailLower);

      const key = meta?.email || emailLower;
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          key,
          namaPeserta: meta?.nama || rec.user?.name || "Peserta",
          email: key,
          posisi: meta?.posisi || "-",
          institusi: meta?.institusi || "-",
          mentorName: meta?.mentorName || "Belum Ditentukan",
          statusMagang: meta?.statusMagang || "Sedang Magang",
          tanggalMulaiMagang: meta?.tanggalMulaiMagang,
          tanggalSelesaiMagang: meta?.tanggalSelesaiMagang,
          attendedDates: new Set<string>(),
          totalHari: 0,
          wfhCount: 0,
          izinCount: 0,
          tepatWaktuMasuk: 0,
          telatMasuk: 0,
          pulangAwalTanpaKet: 0,
          luarAreaBpom: 0,
          sumInScore: 0,
          countIn: 0,
          sumOutScore: 0,
          countOut: 0,
          sumDailyScore: 0,
        });
      }

      const acc = map.get(key)!;
      const { startIso: psStartIso, cutoffEndIso: psHMinus3Iso } =
        getHMinus3CutoffIso(acc.tanggalMulaiMagang, acc.tanggalSelesaiMagang);
      const psExpectedWorkdays = getFullInternshipWorkdaysUntilHMinus3(
        acc.tanggalMulaiMagang,
        acc.tanggalSelesaiMagang,
      );

      // Abaikan absensi di luar periode magang atau setelah H-3 selesai magang
      if (rec.date) {
        if (psStartIso && rec.date < psStartIso) continue;
        if (psHMinus3Iso && rec.date > psHMinus3Iso) continue;
        if (psExpectedWorkdays.size > 0 && !psExpectedWorkdays.has(rec.date)) {
          continue;
        }
        acc.attendedDates.add(rec.date);
      }
      acc.totalHari += 1;

      if (rec.attendanceMode === "izin") {
        acc.izinCount += 1;
        acc.sumDailyScore += 100;
        continue;
      }

      if (rec.attendanceMode === "wfh") {
        acc.wfhCount += 1;
      }

      const hasKoreksi = Boolean(rec.koreksiNote);
      const normIn = normalizeLegacyEntry("checkIn", rec.checkIn, hasKoreksi);
      const normOut = normalizeLegacyEntry("checkOut", rec.checkOut, hasKoreksi);

      if (normIn) {
        acc.countIn += 1;
        acc.sumInScore += normIn.score ?? 0;
        if (normIn.timeStatus === "on_time") acc.tepatWaktuMasuk += 1;
        if (normIn.timeStatus === "late") acc.telatMasuk += 1;
      }

      if (normOut) {
        acc.countOut += 1;
        acc.sumOutScore += normOut.score ?? 0;
        if (normOut.timeStatus === "early_no_note") {
          acc.pulangAwalTanpaKet += 1;
        }
      }

      const anyOut =
        rec.attendanceMode !== "wfh" &&
        ((normIn?.location && !normIn.location.isInsideBpom) ||
          (normOut?.location && !normOut.location.isInsideBpom));
      if (anyOut) acc.luarAreaBpom += 1;

      const inS = normIn?.score ?? 0;
      const outS = normOut?.score ?? 0;
      const daily =
        hasKoreksi && typeof rec.dailyScore === "number" && rec.dailyScore > 0
          ? rec.dailyScore
          : normOut
            ? Math.round((inS + outS) / 2)
            : Math.round(inS / 2);
      acc.sumDailyScore += daily;
    }

    const result = Array.from(map.values())
      .map((acc) => {
        let tidakAbsen = 0;
        if (acc.statusMagang !== "Tidak Magang") {
          const { startIso: rawStartIso, cutoffEndIso: hMinus3Iso } =
            getHMinus3CutoffIso(
              acc.tanggalMulaiMagang,
              acc.tanggalSelesaiMagang,
            );
          let startIso = rawStartIso;
          let endIso = hMinus3Iso;
          let cutoffEndIso = hMinus3Iso || defaultCutoffEndIso;

          if (filterDate) {
            if (!startIso || filterDate > startIso) startIso = filterDate;
            if (!endIso || filterDate < endIso) endIso = filterDate;
            if (filterDate < cutoffEndIso) cutoffEndIso = filterDate;
          } else {
            if (filterStart && (!startIso || filterStart > startIso)) {
              startIso = filterStart;
            }
            if (filterEnd && filterEnd < cutoffEndIso) {
              cutoffEndIso = filterEnd;
            }
          }

          const expectedDates = getExpectedWorkdays(
            startIso,
            endIso,
            cutoffEndIso,
          );
          for (const d of expectedDates) {
            if (!acc.attendedDates.has(d)) {
              tidakAbsen += 1;
            }
          }
        }

        const totalHariKerja = acc.totalHari + tidakAbsen;
        const effectiveInCount = acc.countIn + tidakAbsen;
        const effectiveOutCount = acc.countOut + tidakAbsen;

        return {
          email: acc.email,
          namaPeserta: acc.namaPeserta,
          posisi: acc.posisi,
          institusi: acc.institusi,
          mentorName: acc.mentorName,
          statusMagang: acc.statusMagang,
          totalHari: acc.totalHari,
          wfhCount: acc.wfhCount,
          izinCount: acc.izinCount,
          tidakAbsen,
          totalHariKerja,
          tepatWaktuMasuk: acc.tepatWaktuMasuk,
          telatMasuk: acc.telatMasuk,
          pulangAwalTanpaKet: acc.pulangAwalTanpaKet,
          luarAreaBpom: acc.luarAreaBpom,
          avgCheckInScore:
            effectiveInCount > 0
              ? Math.round(acc.sumInScore / effectiveInCount)
              : 0,
          avgCheckOutScore:
            effectiveOutCount > 0
              ? Math.round(acc.sumOutScore / effectiveOutCount)
              : 0,
          avgDailyScore:
            totalHariKerja > 0
              ? Math.round(acc.sumDailyScore / totalHariKerja)
              : 0,
        };
      })
      .filter((row) => {
        if (!searchQ) return true;
        const hay = `${row.namaPeserta} ${row.email} ${row.posisi} ${row.institusi} ${row.mentorName}`.toLowerCase();
        return hay.includes(searchQ);
      })
      .sort((a, b) => b.totalHari - a.totalHari || a.namaPeserta.localeCompare(b.namaPeserta));

    return res.json(result);
  } catch (err) {
    console.error("[GET MANAGE REKAP PESERTA ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat rekap nilai absensi peserta" });
  }
};

// PATCH /api/absensi/manage/:id/koreksi
export const koreksiAbsensi = async (req: any, res: Response) => {
  try {
    const roles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    if (!roles.includes("mentor")) {
      return res.status(403).json({
        message: "Hanya mentor pembimbing yang dapat melakukan koreksi nilai absensi.",
      });
    }

    const { id } = req.params;
    const { target, koreksiNote } = req.body;

    if (!["checkIn", "checkOut", "both"].includes(target)) {
      return res.status(400).json({ message: "Target koreksi tidak valid" });
    }
    if (!koreksiNote || String(koreksiNote).trim().length < 3) {
      return res.status(400).json({
        message: "Catatan alasan koreksi / persetujuan wajib diisi.",
      });
    }

    const record = await Absensi.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Data absensi tidak ditemukan" });
    }

    const scope = await getAuthorizedPesertaScope(req.user);
    if (scope.isMentorOnly) {
      const uId = record.user?.toString();
      const emailLower = (record.email || "").toLowerCase();
      const isAllowed =
        (uId && scope.byUserId.has(uId)) || scope.byEmail.has(emailLower);
      if (!isAllowed) {
        return res.status(403).json({
          message:
            "Anda hanya dapat mengoreksi absensi peserta bimbingan Anda.",
        });
      }
    }

    if ((target === "checkIn" || target === "both") && record.checkIn) {
      record.checkIn.timeStatus = "on_time";
      record.checkIn.timeStatusLabel = "Disetujui Tepat Waktu (Koreksi)";
      record.checkIn.diffMinutes = 0;
      record.checkIn.score = 100;
    }

    if ((target === "checkOut" || target === "both") && record.checkOut) {
      record.checkOut.timeStatus = "on_time_note";
      record.checkOut.timeStatusLabel = "Disetujui Tepat Waktu (Koreksi)";
      record.checkOut.diffMinutes = 0;
      record.checkOut.score = 100;
    }

    const inScore = record.checkIn?.score ?? 0;
    const outScore = record.checkOut?.score ?? 0;
    record.dailyScore = record.checkOut
      ? Math.round((inScore + outScore) / 2)
      : Math.round(inScore / 2);

    const actorUser = await User.findById(req.user.id).select("name");
    const roleLabel = req.user.roles.includes("superadmin")
      ? "superadmin"
      : req.user.roles.includes("admin")
        ? "admin"
        : "mentor";

    record.koreksiNote = String(koreksiNote).trim();
    record.koreksiBy = {
      id: req.user.id,
      name: actorUser?.name || roleLabel.toUpperCase(),
      role: roleLabel,
    };
    record.koreksiAt = new Date();

    await record.save();

    return res.json({
      success: true,
      message: "Koreksi nilai absensi (100%) berhasil disimpan.",
      absensi: record,
    });
  } catch (err) {
    console.error("[KOREKSI ABSENSI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan koreksi absensi" });
  }
};
