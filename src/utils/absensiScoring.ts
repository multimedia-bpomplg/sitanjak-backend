function toWibDate(d: Date | string): Date {
  const base = d instanceof Date ? d : new Date(d);
  return new Date(base.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateIso(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function shiftIsoDate(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + deltaDays));
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
  const limitSec = 8 * 3600;
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
  const limitSec = 16 * 3600;
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

export function normalizeLegacyEntry(
  type: "checkIn" | "checkOut",
  rawEntry: any,
  hasKoreksi: boolean,
) {
  if (!rawEntry) return null;
  const entry =
    typeof rawEntry.toObject === "function"
      ? rawEntry.toObject()
      : { ...rawEntry };

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

export function computeRecordDailyScore(rec: any): {
  dailyScore: number;
  inScore: number;
  outScore: number;
  hasIn: boolean;
  hasOut: boolean;
  normIn: any;
  normOut: any;
} {
  if (rec?.attendanceMode === "izin") {
    return {
      dailyScore: 100,
      inScore: 100,
      outScore: 100,
      hasIn: false,
      hasOut: false,
      normIn: null,
      normOut: null,
    };
  }

  const hasKoreksi = Boolean(rec?.koreksiNote);
  const normIn = normalizeLegacyEntry("checkIn", rec?.checkIn, hasKoreksi);
  const normOut = normalizeLegacyEntry("checkOut", rec?.checkOut, hasKoreksi);
  const inScore = normIn?.score ?? 0;
  const outScore = normOut?.score ?? 0;

  const dailyScore =
    hasKoreksi && typeof rec?.dailyScore === "number" && rec.dailyScore > 0
      ? rec.dailyScore
      : normOut
        ? Math.round((inScore + outScore) / 2)
        : Math.round(inScore / 2);

  return {
    dailyScore,
    inScore,
    outScore,
    hasIn: Boolean(normIn),
    hasOut: Boolean(normOut),
    normIn,
    normOut,
  };
}

/**
 * Mengembalikan batas akhir perhitungan absensi magang yaitu H-3 sebelum tanggal selesai magang.
 * Hari setelah H-3 (H-2, H-1, dan hari H selesai magang) tidak dihitung.
 */
export function getHMinus3CutoffIso(
  tanggalMulaiMagang?: string | null,
  tanggalSelesaiMagang?: string | null,
): { startIso: string | null; cutoffEndIso: string | null } {
  const startIso = parseDateIso(tanggalMulaiMagang);
  const endIso = parseDateIso(tanggalSelesaiMagang);
  if (!endIso) {
    return { startIso, cutoffEndIso: null };
  }

  const hMinus3 = shiftIsoDate(endIso, -3);
  // Jika rentang magang sangat pendek (< 3 hari) sehingga H-3 < tanggalMulai, gunakan tanggalMulai
  const cutoffEndIso = startIso && hMinus3 < startIso ? startIso : hMinus3;
  return { startIso, cutoffEndIso };
}

/**
 * Menghasilkan daftar seluruh hari kerja (Senin-Jumat) dari tanggalMulaiMagang
 * sampai dengan H-3 sebelum tanggalSelesaiMagang.
 */
export function getFullInternshipWorkdaysUntilHMinus3(
  tanggalMulaiMagang?: string | null,
  tanggalSelesaiMagang?: string | null,
): Set<string> {
  const result = new Set<string>();
  const { startIso, cutoffEndIso } = getHMinus3CutoffIso(
    tanggalMulaiMagang,
    tanggalSelesaiMagang,
  );
  if (!startIso || !cutoffEndIso || cutoffEndIso < startIso) {
    return result;
  }

  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = cutoffEndIso.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);

  let guard = 0;
  while (cur <= last && guard < 500) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      result.add(toIsoDate(cur));
    }
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return result;
}

/**
 * Menghitung skor kehadiran akhir peserta berdasarkan:
 * - Seluruh hari kerja selama periode magang sampai H-3 sebelum selesai magang (pembagi tetap sampai akhir magang H-3, bukan hanya sampai hari ini).
 * - Total nilai harian dari seluruh absensi peserta sampai H-3 (absensi setelah H-3 tidak dihitung).
 */
export function calculateFinalAttendanceScore(
  records: any[],
  tanggalMulaiMagang?: string | null,
  tanggalSelesaiMagang?: string | null,
): {
  totalHariHadir: number;
  tidakAbsen: number;
  totalHariKerja: number;
  sumDailyScore: number;
  averageScore: number;
  cutoffEndIso: string | null;
} {
  const { startIso, cutoffEndIso } = getHMinus3CutoffIso(
    tanggalMulaiMagang,
    tanggalSelesaiMagang,
  );
  const expectedWorkdays = getFullInternshipWorkdaysUntilHMinus3(
    tanggalMulaiMagang,
    tanggalSelesaiMagang,
  );

  // Filter record absensi hanya sampai H-3 (dan mulai dari startIso jika ada)
  const validRecordsByDate = new Map<string, any>();
  for (const rec of records || []) {
    const d = rec?.date ? String(rec.date).trim() : "";
    if (!d) continue;
    if (startIso && d < startIso) continue;
    if (cutoffEndIso && d > cutoffEndIso) continue;
    // Jika expectedWorkdays ada, hanya hitung hari kerja yang masuk cakupan magang s/d H-3
    if (expectedWorkdays.size > 0 && !expectedWorkdays.has(d)) continue;
    validRecordsByDate.set(d, rec);
  }

  let sumDailyScore = 0;
  for (const rec of validRecordsByDate.values()) {
    const { dailyScore } = computeRecordDailyScore(rec);
    sumDailyScore += dailyScore;
  }

  const totalHariHadir = validRecordsByDate.size;
  const totalHariKerja =
    expectedWorkdays.size > 0
      ? Math.max(expectedWorkdays.size, totalHariHadir)
      : totalHariHadir;
  const tidakAbsen = Math.max(0, totalHariKerja - totalHariHadir);

  const averageScore =
    totalHariKerja > 0 ? Math.round(sumDailyScore / totalHariKerja) : 0;

  return {
    totalHariHadir,
    tidakAbsen,
    totalHariKerja,
    sumDailyScore,
    averageScore,
    cutoffEndIso,
  };
}
