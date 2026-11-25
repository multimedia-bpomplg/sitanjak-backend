import axios from "axios";
import Holiday, { HolidayType } from "../models/Holiday";

const GCAL_EN_ID_ICS_URL =
  "https://calendar.google.com/calendar/ical/en.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics";
const GCAL_ID_ID_ICS_URL =
  "https://calendar.google.com/calendar/ical/id.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics";

const SYNC_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam
const syncedYearsCache = new Map<number, number>();
const inFlightYearSync = new Map<
  number,
  Promise<{
    year: number;
    synced: number;
    source: "google_calendar" | "fallback" | "cached";
  }>
>();

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
  { date: "2026-12-24", name: "Cuti Bersama Hari Raya Natal", type: "cuti_bersama" },
  { date: "2026-12-25", name: "Kelahiran Yesus Kristus (Natal)", type: "libur_nasional" },
];

interface ParsedIcsEvent {
  date: string;
  summary: string;
  description: string;
}

function unescapeIcsText(raw: string): string {
  return raw
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcsEvents(rawIcs: string): ParsedIcsEvent[] {
  const unfolded = rawIcs.replace(/\r?\n[ \t]/g, "");
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  const events: ParsedIcsEvent[] = [];

  for (const block of blocks) {
    const endIdx = block.indexOf("END:VEVENT");
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;

    const dtMatch = /^DTSTART[^:\r\n]*:(\d{4})(\d{2})(\d{2})/m.exec(body);
    if (!dtMatch) continue;
    const date = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;

    const sumMatch = /^SUMMARY[^:\r\n]*:([^\r\n]*)/m.exec(body);
    const descMatch = /^DESCRIPTION[^:\r\n]*:([^\r\n]*)/m.exec(body);

    events.push({
      date,
      summary: sumMatch ? unescapeIcsText(sumMatch[1]) : "",
      description: descMatch ? unescapeIcsText(descMatch[1]) : "",
    });
  }

  return events;
}

function getCurrentYearWib(): number {
  const iso = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
  return Number(iso.slice(0, 4)) || new Date().getFullYear();
}

async function fetchIndonesianCalendarHolidaysForYear(
  year: number,
): Promise<Array<{ date: string; name: string; type: HolidayType }>> {
  const yearPrefix = `${year}-`;
  const [enRes, idRes] = await Promise.all([
    axios.get<string>(GCAL_EN_ID_ICS_URL, {
      timeout: 7000,
      responseType: "text",
    }),
    axios
      .get<string>(GCAL_ID_ID_ICS_URL, {
        timeout: 7000,
        responseType: "text",
      })
      .catch(() => null),
  ]);

  const enEvents = parseIcsEvents(enRes.data || "").filter(
    (ev) =>
      ev.date.startsWith(yearPrefix) &&
      ev.description.toLowerCase().includes("public holiday"),
  );

  // Kumpulkan nama berbahasa Indonesia dari feed id.indonesian berdasarkan tanggal
  const idNameByDate = new Map<string, string[]>();
  if (idRes?.data) {
    const idEvents = parseIcsEvents(idRes.data).filter((ev) =>
      ev.date.startsWith(yearPrefix),
    );
    for (const ev of idEvents) {
      if (!ev.summary) continue;
      const list = idNameByDate.get(ev.date) || [];
      if (!list.includes(ev.summary)) {
        list.push(ev.summary);
      }
      idNameByDate.set(ev.date, list);
    }
  }

  const byDate = new Map<
    string,
    { date: string; name: string; type: HolidayType }
  >();

  for (const ev of enEvents) {
    const isJoint = /joint holiday/i.test(ev.summary);
    const idCandidates = idNameByDate.get(ev.date) || [];

    // Jika ada lebih dari 1 event di tanggal sama (misal cuti bersama vs perayaan), prioritaskan yang cocok
    let resolvedName = ev.summary;
    if (idCandidates.length === 1) {
      resolvedName = idCandidates[0];
    } else if (idCandidates.length > 1) {
      const jointMatch = idCandidates.find((c) => /cuti bersama/i.test(c));
      const nonJointMatch = idCandidates.find((c) => !/cuti bersama/i.test(c));
      resolvedName =
        (isJoint ? jointMatch : nonJointMatch) || idCandidates[0] || ev.summary;
    }

    const type: HolidayType =
      isJoint || /cuti bersama/i.test(resolvedName)
        ? "cuti_bersama"
        : "libur_nasional";

    byDate.set(ev.date, {
      date: ev.date,
      name: resolvedName,
      type,
    });
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/**
 * Menyimpan daftar libur bawaan 2026 sebagai fallback tanpa menimpa libur manual admin.
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
          source: "auto",
          createdBy: null,
        },
      },
      upsert: true,
    },
  }));

  const res = await Holiday.bulkWrite(ops);
  return res.upsertedCount || 0;
}

/**
 * Sinkronisasi hari libur nasional & cuti bersama Indonesia otomatis dari Google Calendar publik
 * untuk tahun tertentu, dengan fallback lokal untuk tahun 2026 bila jaringan tidak tersedia.
 */
export async function syncHolidaysForYear(
  year: number = getCurrentYearWib(),
  force = false,
): Promise<{
  year: number;
  synced: number;
  source: "google_calendar" | "fallback" | "cached";
}> {
  const lastSync = syncedYearsCache.get(year);
  if (!force && lastSync && Date.now() - lastSync < SYNC_CACHE_TTL_MS) {
    return { year, synced: 0, source: "cached" };
  }

  const existingPromise = inFlightYearSync.get(year);
  if (existingPromise) {
    return existingPromise;
  }

  const task = (async (): Promise<{
    year: number;
    synced: number;
    source: "google_calendar" | "fallback" | "cached";
  }> => {
    try {
      const calendarItems = await fetchIndonesianCalendarHolidaysForYear(year);

      if (calendarItems.length > 0) {
        // Jangan timpa tanggal yang sudah diatur manual oleh admin/superadmin
        const manualDocs = await Holiday.find({
          date: { $regex: `^${year}-` },
          source: "manual",
        })
          .select("date")
          .lean();
        const manualDates = new Set(
          (manualDocs as any[]).map((d) => String(d.date)),
        );

        const itemsToUpsert = calendarItems.filter(
          (item) => !manualDates.has(item.date),
        );

        if (itemsToUpsert.length > 0) {
          const ops = itemsToUpsert.map((item) => ({
            updateOne: {
              filter: { date: item.date },
              update: {
                $set: {
                  name: item.name,
                  type: item.type,
                  source: "auto",
                  createdBy: null,
                },
              },
              upsert: true,
            },
          }));
          await Holiday.bulkWrite(ops);
        }

        syncedYearsCache.set(year, Date.now());
        return {
          year,
          synced: itemsToUpsert.length,
          source: "google_calendar",
        };
      }
    } catch (err) {
      console.warn(
        `⚠️ [HolidayService] Gagal sinkronisasi kalender Google (${year}):`,
        err instanceof Error ? err.message : err,
      );
    }

    // Fallback offline untuk tahun 2026 bila feed kalender tidak dapat diakses
    if (year === 2026) {
      const inserted = await seedDefaultHolidays2026();
      syncedYearsCache.set(year, Date.now());
      return { year, synced: inserted, source: "fallback" };
    }

    return { year, synced: 0, source: "fallback" };
  })();

  inFlightYearSync.set(year, task);
  try {
    return await task;
  } finally {
    inFlightYearSync.delete(year);
  }
}

/**
 * Memastikan hari libur tahun berjalan (dan tahun target bila diberikan) sudah tersinkronisasi dari kalender.
 */
export async function ensureDefaultHolidaysSeeded(
  targetYear?: number,
): Promise<void> {
  try {
    const currentYear = getCurrentYearWib();
    const yearsToSync = new Set<number>([currentYear]);
    if (targetYear && Number.isInteger(targetYear)) {
      yearsToSync.add(targetYear);
    }
    // Menjelang akhir tahun (Nov-Des), ikut sinkronkan tahun berikutnya untuk periode magang lintas tahun
    const monthNow = Number(
      new Date()
        .toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
        .slice(5, 7),
    );
    if (monthNow >= 11) {
      yearsToSync.add(currentYear + 1);
    }

    await Promise.all(
      Array.from(yearsToSync).map((y) => syncHolidaysForYear(y)),
    );
  } catch (err) {
    console.warn("⚠️ [HolidayService] Gagal sinkronisasi hari libur:", err);
  }
}

/**
 * Mengecek apakah tanggal `YYYY-MM-DD` (WIB) merupakan akhir pekan atau hari libur terdaftar,
 * dengan memperhatikan override hari kerja (`type: "hari_masuk"`) yang dibuka Admin/Superadmin.
 */
export async function isHolidayWib(dateIso: string): Promise<{
  isHoliday: boolean;
  isWorkdayOverride?: boolean;
  reason?: string;
}> {
  const targetYear = Number(dateIso.slice(0, 4));
  await ensureDefaultHolidaysSeeded(
    Number.isInteger(targetYear) ? targetYear : undefined,
  );

  // Prioritaskan catatan database terlebih dahulu (termasuk override hari masuk)
  const holidayDoc: any = await Holiday.findOne({ date: dateIso }).lean();
  if (holidayDoc) {
    if (holidayDoc.type === "hari_masuk") {
      return {
        isHoliday: false,
        isWorkdayOverride: true,
        reason: holidayDoc.name || "Hari Kerja Khusus (Tetap Masuk)",
      };
    }
    return {
      isHoliday: true,
      isWorkdayOverride: false,
      reason: holidayDoc.name || "Hari Libur Nasional",
    };
  }

  const [y, m, d] = dateIso.split("-").map(Number);
  if (y && m && d) {
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isHoliday: true,
        isWorkdayOverride: false,
        reason: dayOfWeek === 0 ? "Hari Minggu" : "Hari Sabtu",
      };
    }
  }

  return { isHoliday: false, isWorkdayOverride: false };
}

/**
 * Mengambil seluruh tanggal hari libur aktif (`holidayDates`) serta tanggal
 * pengecualian tetap masuk (`overrideWorkdays`) dalam format YYYY-MM-DD dari database.
 */
export async function getHolidayConfigSets(): Promise<{
  holidayDates: Set<string>;
  overrideWorkdays: Set<string>;
}> {
  await ensureDefaultHolidaysSeeded();
  const docs = await Holiday.find().select("date type").lean();
  const holidayDates = new Set<string>();
  const overrideWorkdays = new Set<string>();

  for (const doc of docs as any[]) {
    if (!doc?.date) continue;
    const iso = String(doc.date).trim();
    if (doc.type === "hari_masuk") {
      overrideWorkdays.add(iso);
    } else {
      holidayDates.add(iso);
    }
  }
  return { holidayDates, overrideWorkdays };
}

/**
 * Mengambil seluruh tanggal hari libur nasional/khusus aktif (YYYY-MM-DD) dari database.
 */
export async function getHolidayDateSet(): Promise<Set<string>> {
  const { holidayDates } = await getHolidayConfigSets();
  return holidayDates;
}
