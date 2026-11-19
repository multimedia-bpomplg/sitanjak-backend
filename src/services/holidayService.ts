import Holiday, { HolidayType } from "../models/Holiday";

export const DEFAULT_HOLIDAYS_2026: Array<{
  date: string;
  name: string;
  type: HolidayType;
}> = [
  { date: "2026-01-01", name: "Tahun Baru 2026 Masehi", type: "libur_nasional" },
  { date: "2026-01-16", name: "Isra Mikraj Nabi Muhammad SAW", type: "libur_nasional" },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577 Kongzili", type: "libur_nasional" },
  { date: "2026-03-19", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)", type: "libur_nasional" },
  { date: "2026-03-20", name: "Hari Raya Idulfitri 1447 Hijriah", type: "libur_nasional" },
  { date: "2026-03-21", name: "Hari Raya Idulfitri 1447 Hijriah", type: "libur_nasional" },
  { date: "2026-04-03", name: "Wafat Yesus Kristus", type: "libur_nasional" },
  { date: "2026-04-05", name: "Kebangkitan Yesus Kristus (Paskah)", type: "libur_nasional" },
  { date: "2026-05-01", name: "Hari Buruh Internasional", type: "libur_nasional" },
  { date: "2026-05-14", name: "Kenaikan Yesus Kristus", type: "libur_nasional" },
  { date: "2026-05-27", name: "Hari Raya Iduladha 1447 Hijriah", type: "libur_nasional" },
  { date: "2026-05-31", name: "Hari Raya Waisak 2570 BE", type: "libur_nasional" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila", type: "libur_nasional" },
  { date: "2026-06-16", name: "1 Muharam Tahun Baru Islam 1448 Hijriah", type: "libur_nasional" },
  { date: "2026-08-17", name: "Proklamasi Kemerdekaan RI", type: "libur_nasional" },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW", type: "libur_nasional" },
  { date: "2026-12-25", name: "Kelahiran Yesus Kristus (Natal)", type: "libur_nasional" },
];

/**
 * Menambahkan daftar libur default 2026 tanpa menimpa tanggal yang sudah ada.
 */
export async function seedDefaultHolidays2026(): Promise<number> {
  const ops = DEFAULT_HOLIDAYS_2026.map((item) => ({
    updateOne: {
      filter: { date: item.date },
      update: {
        $setOnInsert: {
          date: item.date,
          name: item.name,
          type: item.type,
        },
      },
      upsert: true,
    },
  }));

  const res = await Holiday.bulkWrite(ops);
  return res.upsertedCount || 0;
}

/**
 * Mengisi libur bawaan hanya jika koleksi Holiday masih kosong.
 */
export async function ensureDefaultHolidaysSeeded(): Promise<void> {
  try {
    const count = await Holiday.estimatedDocumentCount();
    if (count === 0) {
      await seedDefaultHolidays2026();
    }
  } catch (err) {
    console.warn("⚠️ [HolidayService] Gagal auto-seed hari libur:", err);
  }
}

/**
 * Mengecek apakah tanggal `YYYY-MM-DD` (WIB) merupakan akhir pekan atau hari libur terdaftar.
 */
export async function isHolidayWib(dateIso: string): Promise<{
  isHoliday: boolean;
  reason?: string;
}> {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (y && m && d) {
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isHoliday: true,
        reason: dayOfWeek === 0 ? "Hari Minggu" : "Hari Sabtu",
      };
    }
  }

  const holidayDoc: any = await Holiday.findOne({ date: dateIso }).lean();
  if (holidayDoc) {
    return {
      isHoliday: true,
      reason: holidayDoc.name || "Hari Libur Nasional",
    };
  }

  return { isHoliday: false };
}
