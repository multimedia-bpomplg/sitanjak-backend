import { Request, Response } from "express";
import Absensi from "../models/Absensi";
import EvaluasiMagang from "../models/EvaluasiMagang";
import Feedback from "../models/Feedback";
import Formasi from "../models/Formasi";
import LaporanAkhir from "../models/LaporanAkhir";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import PenilaianAkhir from "../models/PenilaianAkhir";
import Role from "../models/Role";
import SertifikatMagang from "../models/SertifikatMagang";
import SuratSelesaiMagang from "../models/SuratSelesaiMagang";
import User from "../models/User";
import { resolveKategoriMagang } from "../utils/pesertaKategori";

type RangePreset = "all" | "today" | "7d" | "30d" | "month" | "year";

const WIB_TIMEZONE = "Asia/Jakarta";

function getTodayIsoWib(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: WIB_TIMEZONE });
}

function toWibIsoDate(value?: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: WIB_TIMEZONE });
}

function addDaysIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function normalizeText(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function resolveEffectivePesertaStatus(
  ps: any,
  todayIso: string,
): "Sedang Magang" | "Belum Waktu Magang" | "Selesai" | "Tidak Magang" {
  if (ps.statusMagang === "Selesai Magang") return "Selesai";
  if (ps.statusMagang === "Tidak Magang") return "Tidak Magang";

  const startIso = toWibIsoDate(ps.tanggalMulaiMagang);
  const endIso = toWibIsoDate(ps.tanggalSelesaiMagang);

  if (startIso && todayIso < startIso) return "Belum Waktu Magang";
  if (endIso && todayIso > endIso) return "Selesai";
  return "Sedang Magang";
}

function getDateBounds(params: {
  range: RangePreset;
  year?: number;
  month?: number;
  todayIso: string;
}): { startIso: string | null; endIso: string | null } {
  const { range, year, month, todayIso } = params;
  const fallbackYear = year || Number(todayIso.slice(0, 4));
  const fallbackMonth = month || Number(todayIso.slice(5, 7));

  switch (range) {
    case "today":
      return { startIso: todayIso, endIso: todayIso };
    case "7d":
      return { startIso: addDaysIso(todayIso, -6), endIso: todayIso };
    case "30d":
      return { startIso: addDaysIso(todayIso, -29), endIso: todayIso };
    case "month": {
      const mm = String(fallbackMonth).padStart(2, "0");
      const lastDay = new Date(Date.UTC(fallbackYear, fallbackMonth, 0))
        .getUTCDate()
        .toString()
        .padStart(2, "0");
      return {
        startIso: `${fallbackYear}-${mm}-01`,
        endIso: `${fallbackYear}-${mm}-${lastDay}`,
      };
    }
    case "year":
      return {
        startIso: `${fallbackYear}-01-01`,
        endIso: `${fallbackYear}-12-31`,
      };
    default:
      return { startIso: null, endIso: null };
  }
}

function isIsoInRange(
  iso: string | null,
  startIso: string | null,
  endIso: string | null,
): boolean {
  if (!startIso && !endIso) return true;
  if (!iso) return false;
  if (startIso && iso < startIso) return false;
  if (endIso && iso > endIso) return false;
  return true;
}

const MONTH_SHORT_NAMES = [
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

const MONTH_FULL_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getMonthDateRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const lastDayNum = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDay = String(lastDayNum).padStart(2, "0");
  return {
    mm,
    lastDayNum,
    startIso: `${year}-${mm}-01`,
    endIso: `${year}-${mm}-${lastDay}`,
  };
}

function buildParticipantTrend(params: {
  items: Array<{ key: string; startIso: string; endIso: string }>;
  trendYear: "all" | number;
  trendMonth: "all" | number;
  sortedYears: number[];
}) {
  const { items, trendYear, trendMonth, sortedYears } = params;
  const labels: string[] = [];
  const fullLabels: string[] = [];
  const counts: number[] = [];
  const overallUniqueKeys = new Set<string>();

  const countOverlapping = (bucketStart: string, bucketEnd: string) => {
    const matched = new Set<string>();
    for (const item of items) {
      if (item.startIso <= bucketEnd && item.endIso >= bucketStart) {
        matched.add(item.key);
        overallUniqueKeys.add(item.key);
      }
    }
    return matched.size;
  };

  if (trendYear !== "all" && trendMonth === "all") {
    for (let m = 1; m <= 12; m += 1) {
      const { startIso, endIso } = getMonthDateRange(trendYear, m);
      labels.push(MONTH_SHORT_NAMES[m - 1]);
      fullLabels.push(`${MONTH_FULL_NAMES[m - 1]} ${trendYear}`);
      counts.push(countOverlapping(startIso, endIso));
    }
    return {
      mode: "monthly" as const,
      labels,
      fullLabels,
      counts,
      totalUniquePeserta: overallUniqueKeys.size,
    };
  }

  if (trendYear !== "all" && trendMonth !== "all") {
    const { mm, lastDayNum } = getMonthDateRange(trendYear, trendMonth);
    for (let d = 1; d <= lastDayNum; d += 1) {
      const dd = String(d).padStart(2, "0");
      const dayIso = `${trendYear}-${mm}-${dd}`;
      labels.push(`${d} ${MONTH_SHORT_NAMES[trendMonth - 1]}`);
      fullLabels.push(`${d} ${MONTH_FULL_NAMES[trendMonth - 1]} ${trendYear}`);
      counts.push(countOverlapping(dayIso, dayIso));
    }
    return {
      mode: "daily" as const,
      labels,
      fullLabels,
      counts,
      totalUniquePeserta: overallUniqueKeys.size,
    };
  }

  const yearsToScan = sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()];
  if (trendMonth === "all") {
    const multiYear = yearsToScan.length > 1;
    for (const yr of yearsToScan) {
      for (let m = 1; m <= 12; m += 1) {
        const { startIso, endIso } = getMonthDateRange(yr, m);
        labels.push(
          multiYear
            ? `${MONTH_SHORT_NAMES[m - 1]} ${yr}`
            : MONTH_SHORT_NAMES[m - 1],
        );
        fullLabels.push(`${MONTH_FULL_NAMES[m - 1]} ${yr}`);
        counts.push(countOverlapping(startIso, endIso));
      }
    }
    return {
      mode: "monthly" as const,
      labels,
      fullLabels,
      counts,
      totalUniquePeserta: overallUniqueKeys.size,
    };
  }

  for (const yr of yearsToScan) {
    const { startIso, endIso } = getMonthDateRange(yr, trendMonth);
    labels.push(`${MONTH_SHORT_NAMES[trendMonth - 1]} ${yr}`);
    fullLabels.push(`${MONTH_FULL_NAMES[trendMonth - 1]} ${yr}`);
    counts.push(countOverlapping(startIso, endIso));
  }
  return {
    mode: "yearly_month" as const,
    labels,
    fullLabels,
    counts,
    totalUniquePeserta: overallUniqueKeys.size,
  };
}

function matchesTrendPeriod(params: {
  startIso: string;
  endIso: string;
  trendYear: "all" | number;
  trendMonth: "all" | number;
  sortedYears: number[];
}): boolean {
  const { startIso, endIso, trendYear, trendMonth, sortedYears } = params;
  if (trendYear !== "all" && trendMonth === "all") {
    return startIso <= `${trendYear}-12-31` && endIso >= `${trendYear}-01-01`;
  }
  if (trendYear !== "all" && trendMonth !== "all") {
    const bounds = getMonthDateRange(trendYear, trendMonth);
    return startIso <= bounds.endIso && endIso >= bounds.startIso;
  }
  if (trendMonth === "all") {
    return true;
  }
  const years =
    sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()];
  return years.some((yr) => {
    const bounds = getMonthDateRange(yr, trendMonth);
    return startIso <= bounds.endIso && endIso >= bounds.startIso;
  });
}

export const getSuperadminDashboardSummary = async (
  req: Request,
  res: Response,
) => {
  try {
    const todayIso = getTodayIsoWib();
    const currentYear = Number(todayIso.slice(0, 4));
    const currentMonth = Number(todayIso.slice(5, 7));

    const rawRange = String(req.query.range || "all").toLowerCase();
    const range: RangePreset = (
      ["all", "today", "7d", "30d", "month", "year"] as RangePreset[]
    ).includes(rawRange as RangePreset)
      ? (rawRange as RangePreset)
      : "all";

    const parsedYear = req.query.year ? Number(req.query.year) : currentYear;
    const selectedYear = Number.isFinite(parsedYear) ? parsedYear : currentYear;

    const parsedMonth = req.query.month
      ? Number(req.query.month)
      : currentMonth;
    const selectedMonth =
      Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : currentMonth;

    const filterPosisi = normalizeText(req.query.posisi as string);
    const filterInstansi = normalizeText(req.query.instansi as string);
    const filterJurusan = normalizeText(req.query.jurusan as string);
    const filterJenisKelamin = normalizeText(req.query.jenisKelamin as string);
    const filterMentorId = String(req.query.mentorId || "").trim();
    const filterKategori = String(req.query.kategoriMagang || "").trim();
    const filterAsalJenis = normalizeText(req.query.asalJenis as string);
    const filterStatusMagang = String(req.query.statusMagang || "").trim();

    const rawTrendYear = String(req.query.trendYear ?? "").trim().toLowerCase();
    const parsedTrendYearNum = Number(rawTrendYear);
    const trendYear: "all" | number =
      rawTrendYear === "all"
        ? "all"
        : Number.isFinite(parsedTrendYearNum) && parsedTrendYearNum >= 2000
          ? parsedTrendYearNum
          : selectedYear;

    const rawTrendMonth = String(req.query.trendMonth ?? "").trim().toLowerCase();
    const parsedTrendMonthNum = Number(rawTrendMonth);
    const trendMonth: "all" | number =
      Number.isInteger(parsedTrendMonthNum) &&
      parsedTrendMonthNum >= 1 &&
      parsedTrendMonthNum <= 12
        ? parsedTrendMonthNum
        : "all";

    const hasEntityFilters = Boolean(
      filterPosisi ||
        filterInstansi ||
        filterJurusan ||
        filterJenisKelamin ||
        filterMentorId ||
        filterKategori ||
        filterAsalJenis ||
        filterStatusMagang,
    );

    const { startIso, endIso } = getDateBounds({
      range,
      year: selectedYear,
      month: selectedMonth,
      todayIso,
    });

    const [
      roles,
      formasiList,
      pendaftaranList,
      logbookList,
      laporanList,
      evaluasiList,
      penilaianList,
      feedbackList,
      absensiList,
      suratSelesaiList,
      sertifikatList,
    ] = await Promise.all([
      Role.find({
        name: { $in: ["peserta", "mentor", "admin", "superadmin"] },
      }).lean(),
      Formasi.find({ isActive: true }).select("title kuota kuotaBulanan").lean(),
      Pendaftaran.find()
        .populate("peserta.mentor", "name email posisiMentor")
        .sort({ createdAt: -1 })
        .lean(),
      Logbook.find()
        .populate("user", "name email")
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      LaporanAkhir.find()
        .populate("user", "name email")
        .sort({ submittedAt: 1, createdAt: 1 })
        .lean(),
      EvaluasiMagang.find().select("user email status submittedAt").lean(),
      PenilaianAkhir.find().select("user pesertaEmail nilaiRataRata keteranganRataRata").lean(),
      Feedback.find()
        .populate("user", "name email")
        .select("user status mentorResponse survey createdAt")
        .lean(),
      Absensi.find()
        .select("user email date attendanceMode checkIn")
        .lean(),
      SuratSelesaiMagang.find().select("email").lean(),
      SertifikatMagang.find().select("email").lean(),
    ]);

    const roleIdMap = new Map<string, string>();
    for (const r of roles as any[]) {
      roleIdMap.set(String(r.name), String(r._id));
    }

    const activeUsers = await User.find({
      roles: { $in: Array.from(roleIdMap.values()) },
    })
      .select("name email status roles posisiMentor")
      .lean();

    const mentorRoleId = roleIdMap.get("mentor");
    const pesertaRoleId = roleIdMap.get("peserta");
    const adminRoleId = roleIdMap.get("admin");
    const superadminRoleId = roleIdMap.get("superadmin");

    const hasRole = (u: any, roleId?: string) =>
      Boolean(
        roleId &&
          Array.isArray(u.roles) &&
          u.roles.some((rid: any) => String(rid) === roleId),
      );

    const akunPesertaAktif = (activeUsers as any[]).filter(
      (u) => u.status === "Aktif" && hasRole(u, pesertaRoleId),
    ).length;
    const mentorUsers = (activeUsers as any[]).filter((u) =>
      hasRole(u, mentorRoleId),
    );
    const akunMentorAktif = mentorUsers.filter(
      (u) => u.status === "Aktif",
    ).length;
    const akunAdminAktif = (activeUsers as any[]).filter(
      (u) => u.status === "Aktif" && hasRole(u, adminRoleId),
    ).length;
    const akunSuperadminAktif = (activeUsers as any[]).filter(
      (u) => u.status === "Aktif" && hasRole(u, superadminRoleId),
    ).length;

    const suratEmailSet = new Set(
      (suratSelesaiList as any[])
        .map((s) => normalizeText(s.email))
        .filter(Boolean),
    );
    const sertifikatEmailSet = new Set(
      (sertifikatList as any[])
        .map((s) => normalizeText(s.email))
        .filter(Boolean),
    );
    const penilaianByEmail = new Map<string, any>();
    const penilaianByUser = new Map<string, any>();
    for (const pn of penilaianList as any[]) {
      if (pn.pesertaEmail) penilaianByEmail.set(normalizeText(pn.pesertaEmail), pn);
      if (pn.user) penilaianByUser.set(String(pn.user), pn);
    }

    // Kumpulkan tahun, formasi, instansi & jurusan yang tersedia dari database
    const yearSet = new Set<number>([currentYear]);
    const formasiOptionMap = new Map<string, string>();
    const instansiOptionMap = new Map<string, string>();
    const jurusanOptionMap = new Map<string, string>();
    const jenisKelaminOptionMap = new Map<string, string>([
      ["laki-laki", "Laki-laki"],
      ["perempuan", "Perempuan"],
    ]);

    for (const f of formasiList as any[]) {
      const label = String(f.title || "").trim();
      const key = normalizeText(label);
      if (label && key && !formasiOptionMap.has(key)) {
        formasiOptionMap.set(key, label);
      }
    }

    for (const pd of pendaftaranList as any[]) {
      const iso = toWibIsoDate(pd.createdAt);
      if (iso) yearSet.add(Number(iso.slice(0, 4)));
      if (Array.isArray(pd.peserta)) {
        for (const ps of pd.peserta) {
          const start = toWibIsoDate(ps.tanggalMulaiMagang);
          const end = toWibIsoDate(ps.tanggalSelesaiMagang);
          if (start) yearSet.add(Number(start.slice(0, 4)));
          if (end) yearSet.add(Number(end.slice(0, 4)));

          const posLabel = String(ps.posisi || "").trim();
          const posKey = normalizeText(posLabel);
          if (posLabel && posKey && !formasiOptionMap.has(posKey)) {
            formasiOptionMap.set(posKey, posLabel);
          }

          const instLabel = String(ps.asal?.nama || "").trim();
          const instKey = normalizeText(instLabel);
          if (instLabel && instKey && !instansiOptionMap.has(instKey)) {
            instansiOptionMap.set(instKey, instLabel);
          }

          const jurLabel = String(ps.jurusan || "").trim();
          const jurKey = normalizeText(jurLabel);
          if (jurLabel && jurKey && !jurusanOptionMap.has(jurKey)) {
            jurusanOptionMap.set(jurKey, jurLabel);
          }

          const jkLabel = String(ps.jenisKelamin || "").trim();
          const jkKey = normalizeText(jkLabel);
          if (jkLabel && jkKey && !jenisKelaminOptionMap.has(jkKey)) {
            jenisKelaminOptionMap.set(jkKey, jkLabel);
          }
        }
      }
    }
    for (const lb of logbookList as any[]) {
      const iso = toWibIsoDate(lb.date || lb.createdAt);
      if (iso) yearSet.add(Number(iso.slice(0, 4)));
    }

    // Evaluasi kecocokan peserta per filter non-tanggal
    const matchesPesertaFilters = (ps: any, effectiveStatus: string) => {
      if (filterPosisi && normalizeText(ps.posisi) !== filterPosisi) {
        return false;
      }
      if (filterInstansi && normalizeText(ps.asal?.nama) !== filterInstansi) {
        return false;
      }
      if (filterJurusan && normalizeText(ps.jurusan) !== filterJurusan) {
        return false;
      }
      if (
        filterJenisKelamin &&
        normalizeText(ps.jenisKelamin) !== filterJenisKelamin
      ) {
        return false;
      }
      if (filterMentorId === "tanpa_mentor" && ps.mentor) {
        return false;
      }
      if (
        filterMentorId &&
        filterMentorId !== "tanpa_mentor" &&
        String(ps.mentor?._id || "") !== filterMentorId
      ) {
        return false;
      }
      if (filterKategori) {
        const resolved = resolveKategoriMagang(ps.jurusan, ps.kategoriMagang);
        if (resolved !== filterKategori) return false;
      }
      if (filterAsalJenis && normalizeText(ps.asal?.jenis) !== filterAsalJenis) {
        return false;
      }
      if (filterStatusMagang && effectiveStatus !== filterStatusMagang) {
        return false;
      }
      return true;
    };

    const participantTrendItems: Array<{
      key: string;
      startIso: string;
      endIso: string;
    }> = [];
    for (const pd of pendaftaranList as any[]) {
      if (pd.status !== "Disetujui") continue;
      const createdIso = toWibIsoDate(pd.createdAt) || todayIso;
      const pesertaArr: any[] = Array.isArray(pd.peserta) ? pd.peserta : [];
      pesertaArr.forEach((ps, idx) => {
        if (ps.statusMagang === "Tidak Magang") return;
        const effectiveStatus = resolveEffectivePesertaStatus(ps, todayIso);
        if (!matchesPesertaFilters(ps, effectiveStatus)) return;
        const start = toWibIsoDate(ps.tanggalMulaiMagang) || createdIso;
        const rawEnd = toWibIsoDate(ps.tanggalSelesaiMagang) || start;
        const end = rawEnd < start ? start : rawEnd;
        const key = normalizeText(ps.email) || `${String(pd._id)}:${idx}`;
        participantTrendItems.push({ key, startIso: start, endIso: end });
      });
    }

    const sortedYearsAsc = Array.from(yearSet).sort((a, b) => a - b);
    const participantTrend = buildParticipantTrend({
      items: participantTrendItems,
      trendYear,
      trendMonth,
      sortedYears: sortedYearsAsc,
    });

    let statusAktif = 0;
    let statusSelesai = 0;
    let statusDitolak = 0;
    let statusMenunggu = 0;

    for (const pd of pendaftaranList as any[]) {
      const createdIso = toWibIsoDate(pd.createdAt) || todayIso;
      const pesertaArr: any[] = Array.isArray(pd.peserta) ? pd.peserta : [];
      for (const ps of pesertaArr) {
        const effectiveStatus = resolveEffectivePesertaStatus(ps, todayIso);
        if (!matchesPesertaFilters(ps, effectiveStatus)) continue;

        const start = toWibIsoDate(ps.tanggalMulaiMagang) || createdIso;
        const rawEnd = toWibIsoDate(ps.tanggalSelesaiMagang) || start;
        const end = rawEnd < start ? start : rawEnd;

        if (
          !matchesTrendPeriod({
            startIso: start,
            endIso: end,
            trendYear,
            trendMonth,
            sortedYears: sortedYearsAsc,
          })
        ) {
          continue;
        }

        if (pd.status === "Ditolak" || ps.statusMagang === "Tidak Magang") {
          statusDitolak += 1;
        } else if (pd.status === "Menunggu" || pd.status === "Sedang Diproses") {
          statusMenunggu += 1;
        } else if (pd.status === "Disetujui") {
          if (effectiveStatus === "Sedang Magang") statusAktif += 1;
          else if (effectiveStatus === "Selesai") statusSelesai += 1;
          else statusMenunggu += 1;
        }
      }
    }

    const participantStatusSummary = {
      total: statusAktif + statusSelesai + statusDitolak + statusMenunggu,
      aktif: statusAktif,
      selesai: statusSelesai,
      ditolak: statusDitolak,
      menunggu: statusMenunggu,
    };

    const userIdByEmail = new Map<string, string>();
    for (const u of activeUsers as any[]) {
      if (u.email) userIdByEmail.set(normalizeText(u.email), String(u._id));
    }

    const matchedUserIds = new Set<string>();
    const matchedEmails = new Set<string>();
    const pesertaMetaByUser = new Map<string, any>();
    const pesertaMetaByEmail = new Map<string, any>();

    let pesertaDisetujuiTotal = 0;
    let pesertaSedangMagang = 0;
    let pesertaBelumMulai = 0;
    let pesertaSelesai = 0;
    let pesertaTidakMagang = 0;
    let pesertaTanpaMentor = 0;
    let selesaiBelumSurat = 0;
    let selesaiBelumSertifikat = 0;
    let belumDinilaiSelesai = 0;

    const kategoriCountMap = new Map<string, number>([
      ["Reguler", 0],
      ["PKPA", 0],
    ]);
    const asalJenisCountMap = new Map<string, number>();
    const genderCountMap = new Map<string, number>();
    const tipePesertaMap = new Map<string, number>([
      ["Individu", 0],
      ["Kelompok", 0],
    ]);
    const formasiDemandMap = new Map<
      string,
      { label: string; count: number }
    >();
    const jurusanBreakdownMap = new Map<
      string,
      { label: string; count: number }
    >();
    const topAsalNamaMap = new Map<
      string,
      { nama: string; jenis: string; count: number }
    >();
    const perkiraanSelesaiMap = new Map<string, number>();

    const dokumenBelumLengkapQueue: Array<{
      nama: string;
      email: string;
      posisi: string;
      mentorName: string;
      tanggalSelesaiMagang: string;
      missing: string[];
    }> = [];

    const mentorWorkloadMap = new Map<
      string,
      {
        mentorId: string;
        name: string;
        posisiMentor: string;
        pesertaAktif: number;
        pesertaTotal: number;
        logbookMenunggu: number;
        laporanMenunggu: number;
        evaluasiMenunggu: number;
      }
    >();

    for (const m of mentorUsers) {
      const mid = String(m._id);
      mentorWorkloadMap.set(mid, {
        mentorId: mid,
        name: m.name,
        posisiMentor: m.posisiMentor || "-",
        pesertaAktif: 0,
        pesertaTotal: 0,
        logbookMenunggu: 0,
        laporanMenunggu: 0,
        evaluasiMenunggu: 0,
      });
    }

    // Hitung pendaftaran + peserta disetujui
    let pendaftaranTotal = 0;
    let pendaftaranMenunggu = 0;
    let pendaftaranSedangDiproses = 0;
    let pendaftaranDisetujui = 0;
    let pendaftaranDitolak = 0;
    let pendaftaranHariIni = 0;

    const pendaftaranMenungguQueue: Array<{
      _id: string;
      kategori: string;
      status: string;
      createdAt: string;
      jumlahPeserta: number;
      namaPemohon: string;
      asalNama: string;
      posisi: string;
    }> = [];

    const formasiFilledMap = new Map<string, number>();
    const formasiPendingMap = new Map<string, number>();

    for (const pd of pendaftaranList as any[]) {
      const createdIso = toWibIsoDate(pd.createdAt);
      const pesertaArr: any[] = Array.isArray(pd.peserta) ? pd.peserta : [];

      // Kecocokan pendaftaran terhadap filter entitas (posisi/mentor/kategori/asal)
      const matchingPesertaInPd = pesertaArr.filter((ps) =>
        matchesPesertaFilters(
          ps,
          resolveEffectivePesertaStatus(ps, todayIso),
        ),
      );
      if (hasEntityFilters && matchingPesertaInPd.length === 0) {
        continue;
      }

      // Peminat per Formasi
      for (const ps of matchingPesertaInPd) {
        const fNama = String(ps.posisi || "").trim();
        if (fNama) {
          const fKey = normalizeText(fNama);
          const prevF = formasiDemandMap.get(fKey) || {
            label: fNama,
            count: 0,
          };
          prevF.count += 1;
          formasiDemandMap.set(fKey, prevF);
        }
      }

      if (isIsoInRange(createdIso, startIso, endIso)) {
        pendaftaranTotal += 1;
        if (pd.status === "Menunggu") pendaftaranMenunggu += 1;
        else if (pd.status === "Sedang Diproses")
          pendaftaranSedangDiproses += 1;
        else if (pd.status === "Disetujui") pendaftaranDisetujui += 1;
        else if (pd.status === "Ditolak") pendaftaranDitolak += 1;

        if (createdIso === todayIso) pendaftaranHariIni += 1;
      }

      if (
        (pd.status === "Menunggu" || pd.status === "Sedang Diproses") &&
        pendaftaranMenungguQueue.length < 5
      ) {
        const firstPs = matchingPesertaInPd[0] || pesertaArr[0];
        pendaftaranMenungguQueue.push({
          _id: String(pd._id),
          kategori: pd.kategori || "sendiri",
          status: pd.status,
          createdAt: pd.createdAt,
          jumlahPeserta: pesertaArr.length,
          namaPemohon: firstPs?.nama || "-",
          asalNama: firstPs?.asal?.nama || "-",
          posisi: firstPs?.posisi || "-",
        });
      }

      if (pd.status === "Menunggu" || pd.status === "Sedang Diproses") {
        for (const ps of pesertaArr) {
          const pNorm = normalizeText(ps.posisi);
          if (pNorm) {
            formasiPendingMap.set(
              pNorm,
              (formasiPendingMap.get(pNorm) || 0) + 1,
            );
          }
        }
      }

      if (pd.status !== "Disetujui") continue;

      for (const ps of pesertaArr) {
        const effectiveStatus = resolveEffectivePesertaStatus(ps, todayIso);
        if (!matchesPesertaFilters(ps, effectiveStatus)) continue;

        // Filter periode peserta jika preset range bukan "all" (overlap atau created)
        if (startIso || endIso) {
          const psStart = toWibIsoDate(ps.tanggalMulaiMagang) || createdIso;
          const psEnd = toWibIsoDate(ps.tanggalSelesaiMagang) || psStart;
          const overlaps =
            (!endIso || !psStart || psStart <= endIso) &&
            (!startIso || !psEnd || psEnd >= startIso);
          if (!overlaps) continue;
        }

        const emailNorm = normalizeText(ps.email);
        const uid = String(ps.user || userIdByEmail.get(emailNorm) || "");
        if (uid) matchedUserIds.add(uid);
        if (emailNorm) matchedEmails.add(emailNorm);

        const meta = {
          nama: ps.nama,
          email: emailNorm,
          posisi: ps.posisi || "-",
          mentorId: ps.mentor?._id ? String(ps.mentor._id) : "",
          mentorName: ps.mentor?.name || "Belum Ditetapkan",
          effectiveStatus,
          tanggalMulaiMagang: ps.tanggalMulaiMagang,
          tanggalSelesaiMagang: ps.tanggalSelesaiMagang,
        };
        if (uid) pesertaMetaByUser.set(uid, meta);
        if (emailNorm) pesertaMetaByEmail.set(emailNorm, meta);

        pesertaDisetujuiTotal += 1;
        if (effectiveStatus === "Sedang Magang") pesertaSedangMagang += 1;
        else if (effectiveStatus === "Belum Waktu Magang")
          pesertaBelumMulai += 1;
        else if (effectiveStatus === "Selesai") pesertaSelesai += 1;
        else pesertaTidakMagang += 1;

        if (!ps.mentor) pesertaTanpaMentor += 1;

        // Hitung kuota formasi terisi untuk peserta sedang berjalan / belum mulai
        if (
          effectiveStatus === "Sedang Magang" ||
          effectiveStatus === "Belum Waktu Magang"
        ) {
          const pNorm = normalizeText(ps.posisi);
          if (pNorm) {
            formasiFilledMap.set(pNorm, (formasiFilledMap.get(pNorm) || 0) + 1);
          }
        }

        // Beban mentor
        if (ps.mentor?._id) {
          const mid = String(ps.mentor._id);
          const mEntry = mentorWorkloadMap.get(mid) || {
            mentorId: mid,
            name: ps.mentor.name || "Mentor",
            posisiMentor: ps.mentor.posisiMentor || "-",
            pesertaAktif: 0,
            pesertaTotal: 0,
            logbookMenunggu: 0,
            laporanMenunggu: 0,
            evaluasiMenunggu: 0,
          };
          mEntry.pesertaTotal += 1;
          if (effectiveStatus === "Sedang Magang") mEntry.pesertaAktif += 1;
          mentorWorkloadMap.set(mid, mEntry);
        }

        // Demografi
        const kat = resolveKategoriMagang(ps.jurusan, ps.kategoriMagang);
        kategoriCountMap.set(kat, (kategoriCountMap.get(kat) || 0) + 1);

        const asalJenis = ps.asal?.jenis || "Lainnya";
        asalJenisCountMap.set(
          asalJenis,
          (asalJenisCountMap.get(asalJenis) || 0) + 1,
        );

        const gender = ps.jenisKelamin || "Tidak Disebutkan";
        genderCountMap.set(gender, (genderCountMap.get(gender) || 0) + 1);

        const tipeLabel = pd.kategori === "bersama" ? "Kelompok" : "Individu";
        tipePesertaMap.set(tipeLabel, (tipePesertaMap.get(tipeLabel) || 0) + 1);

        const jurNama = String(ps.jurusan || "").trim();
        if (jurNama) {
          const jKey = normalizeText(jurNama);
          const prevJ = jurusanBreakdownMap.get(jKey) || {
            label: jurNama,
            count: 0,
          };
          prevJ.count += 1;
          jurusanBreakdownMap.set(jKey, prevJ);
        }

        const asalNama = String(ps.asal?.nama || "").trim();
        if (asalNama) {
          const key = normalizeText(asalNama);
          const prev = topAsalNamaMap.get(key) || {
            nama: asalNama,
            jenis: asalJenis,
            count: 0,
          };
          prev.count += 1;
          topAsalNamaMap.set(key, prev);
        }

        const psEndQuarterIso = toWibIsoDate(ps.tanggalSelesaiMagang);
        if (psEndQuarterIso) {
          const y = psEndQuarterIso.slice(0, 4);
          const m = Number(psEndQuarterIso.slice(5, 7));
          const quarter = Math.ceil(m / 3);
          const qKey = `Q${quarter} ${y}`;
          perkiraanSelesaiMap.set(qKey, (perkiraanSelesaiMap.get(qKey) || 0) + 1);
        }

        // Cek kelengkapan dokumen & nilai untuk peserta Selesai
        if (effectiveStatus === "Selesai") {
          const missing: string[] = [];
          const hasPenilaian =
            (uid && penilaianByUser.has(uid)) ||
            (emailNorm && penilaianByEmail.has(emailNorm));
          if (!hasPenilaian) {
            belumDinilaiSelesai += 1;
            missing.push("Nilai Akhir");
          }
          if (emailNorm && !suratEmailSet.has(emailNorm)) {
            selesaiBelumSurat += 1;
            missing.push("Surat Selesai");
          }
          if (emailNorm && !sertifikatEmailSet.has(emailNorm)) {
            selesaiBelumSertifikat += 1;
            missing.push("Sertifikat");
          }
          if (missing.length > 0 && dokumenBelumLengkapQueue.length < 5) {
            dokumenBelumLengkapQueue.push({
              nama: ps.nama,
              email: ps.email,
              posisi: ps.posisi || "-",
              mentorName: meta.mentorName,
              tanggalSelesaiMagang: ps.tanggalSelesaiMagang || "-",
              missing,
            });
          }
        }
      }
    }

    const userMatchesScope = (userObj: any, emailFallback?: string) => {
      if (!hasEntityFilters && range === "all") return true;
      const uid = userObj?._id ? String(userObj._id) : String(userObj || "");
      const em = normalizeText(userObj?.email || emailFallback);
      if (hasEntityFilters || range !== "all") {
        if (uid && matchedUserIds.has(uid)) return true;
        if (em && matchedEmails.has(em)) return true;
        return !hasEntityFilters && range !== "all" ? true : false;
      }
      return true;
    };

    const strictPesertaMatch = (userObj: any, emailFallback?: string) => {
      if (!hasEntityFilters) return true;
      const uid = userObj?._id ? String(userObj._id) : String(userObj || "");
      const em = normalizeText(userObj?.email || emailFallback);
      return Boolean(
        (uid && matchedUserIds.has(uid)) || (em && matchedEmails.has(em)),
      );
    };

    // Hitung Logbook
    let logbookTotal = 0;
    let logbookMenunggu = 0;
    let logbookDisetujui = 0;
    let logbookDitolak = 0;
    let logbookRevisi = 0;
    let logbookHariIni = 0;

    const pendingLogbookByPeserta = new Map<
      string,
      {
        nama: string;
        email: string;
        mentorName: string;
        count: number;
        oldestDate: string;
      }
    >();

    for (const lb of logbookList as any[]) {
      if (!strictPesertaMatch(lb.user)) continue;
      const lbIso = toWibIsoDate(lb.date || lb.createdAt);
      if (!isIsoInRange(lbIso, startIso, endIso)) continue;

      logbookTotal += 1;
      const st = lb.approvalStatus || "menunggu";
      if (st === "menunggu") logbookMenunggu += 1;
      else if (st === "disetujui") logbookDisetujui += 1;
      else if (st === "ditolak") logbookDitolak += 1;
      else if (st === "revisi") logbookRevisi += 1;

      if (lbIso === todayIso) logbookHariIni += 1;

      if (st === "menunggu") {
        const uid = String(lb.user?._id || lb.user || "");
        const em = normalizeText(lb.user?.email);
        const meta = pesertaMetaByUser.get(uid) || pesertaMetaByEmail.get(em);
        if (meta?.mentorId && mentorWorkloadMap.has(meta.mentorId)) {
          mentorWorkloadMap.get(meta.mentorId)!.logbookMenunggu += 1;
        }
        const key = uid || em;
        if (key) {
          const prev = pendingLogbookByPeserta.get(key) || {
            nama: lb.user?.name || meta?.nama || "Peserta",
            email: lb.user?.email || meta?.email || "-",
            mentorName: meta?.mentorName || "Belum Ditetapkan",
            count: 0,
            oldestDate: lbIso || "-",
          };
          prev.count += 1;
          if (lbIso && (prev.oldestDate === "-" || lbIso < prev.oldestDate)) {
            prev.oldestDate = lbIso;
          }
          pendingLogbookByPeserta.set(key, prev);
        }
      }
    }

    const logbookMenungguQueue = Array.from(pendingLogbookByPeserta.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Hitung Laporan Akhir
    let laporanTotal = 0;
    let laporanMenunggu = 0;
    let laporanRevisi = 0;
    let laporanDisetujui = 0;
    let laporanDitolak = 0;
    const laporanMenungguQueue: Array<{
      nama: string;
      email: string;
      mentorName: string;
      status: string;
      submittedAt: string;
    }> = [];

    for (const lap of laporanList as any[]) {
      if (!strictPesertaMatch(lap.user)) continue;
      const lapIso = toWibIsoDate(lap.submittedAt || lap.createdAt);
      if (!isIsoInRange(lapIso, startIso, endIso)) continue;

      laporanTotal += 1;
      const st = lap.status || "Menunggu";
      if (st === "Menunggu") laporanMenunggu += 1;
      else if (st === "Revisi") laporanRevisi += 1;
      else if (st === "Disetujui") laporanDisetujui += 1;
      else if (st === "Ditolak") laporanDitolak += 1;

      if (st === "Menunggu" || st === "Revisi") {
        const uid = String(lap.user?._id || lap.user || "");
        const em = normalizeText(lap.user?.email);
        const meta = pesertaMetaByUser.get(uid) || pesertaMetaByEmail.get(em);
        if (meta?.mentorId && mentorWorkloadMap.has(meta.mentorId)) {
          mentorWorkloadMap.get(meta.mentorId)!.laporanMenunggu += 1;
        }
        if (laporanMenungguQueue.length < 5) {
          laporanMenungguQueue.push({
            nama: lap.user?.name || meta?.nama || "Peserta",
            email: lap.user?.email || meta?.email || "-",
            mentorName: meta?.mentorName || "Belum Ditetapkan",
            status: st,
            submittedAt: lap.submittedAt || lap.createdAt,
          });
        }
      }
    }

    // Hitung Evaluasi & Pernyataan
    let evaluasiTotal = 0;
    let evaluasiMenunggu = 0;
    let evaluasiRevisi = 0;
    let evaluasiDisetujui = 0;

    for (const ev of evaluasiList as any[]) {
      if (!strictPesertaMatch(ev.user, ev.email)) continue;
      const evIso = toWibIsoDate(ev.submittedAt);
      if (!isIsoInRange(evIso, startIso, endIso)) continue;

      evaluasiTotal += 1;
      const st = ev.status || "Menunggu";
      if (st === "Menunggu") evaluasiMenunggu += 1;
      else if (st === "Revisi") evaluasiRevisi += 1;
      else if (st === "Disetujui") evaluasiDisetujui += 1;

      if (st === "Menunggu" || st === "Revisi") {
        const uid = String(ev.user || "");
        const em = normalizeText(ev.email);
        const meta = pesertaMetaByUser.get(uid) || pesertaMetaByEmail.get(em);
        if (meta?.mentorId && mentorWorkloadMap.has(meta.mentorId)) {
          mentorWorkloadMap.get(meta.mentorId)!.evaluasiMenunggu += 1;
        }
      }
    }

    // Hitung Penilaian Akhir
    let totalDinilai = 0;
    let nilaiSum = 0;
    const nilaiBuckets = [
      { label: "Sangat Baik (90–100)", count: 0 },
      { label: "Baik (80–89)", count: 0 },
      { label: "Cukup (70–79)", count: 0 },
      { label: "Perlu Pembinaan (<70)", count: 0 },
    ];
    for (const pn of penilaianList as any[]) {
      if (!strictPesertaMatch(pn.user, pn.pesertaEmail)) continue;
      totalDinilai += 1;
      const score = Number(pn.nilaiRataRata || 0);
      nilaiSum += score;
      if (score >= 90) nilaiBuckets[0].count += 1;
      else if (score >= 80) nilaiBuckets[1].count += 1;
      else if (score >= 70) nilaiBuckets[2].count += 1;
      else nilaiBuckets[3].count += 1;
    }
    const rataRataNilaiAkhir =
      totalDinilai > 0 ? Number((nilaiSum / totalDinilai).toFixed(1)) : 0;

    // Hitung Feedback & Survei
    let feedbackTotal = 0;
    let feedbackBelumDirespon = 0;
    let feedbackDirespon = 0;
    let feedbackRevisi = 0;
    let sumKepuasan = 0;
    let sumRekomendasi = 0;
    let sumKemudahan = 0;
    let sumSkill = 0;

    for (const fb of feedbackList as any[]) {
      if (!strictPesertaMatch(fb.user)) continue;
      const fbIso = toWibIsoDate(fb.createdAt);
      if (!isIsoInRange(fbIso, startIso, endIso)) continue;

      feedbackTotal += 1;
      if (fb.status === "Revisi") feedbackRevisi += 1;
      else if (fb.mentorResponse && String(fb.mentorResponse).trim())
        feedbackDirespon += 1;
      else feedbackBelumDirespon += 1;

      if (fb.survey) {
        sumKepuasan += Number(fb.survey.kepuasanMagang || 0);
        sumRekomendasi += Number(fb.survey.rekomendasiProgram || 0);
        sumKemudahan += Number(fb.survey.kemudahanProses || 0);
        sumSkill += Number(fb.survey.peningkatanSkill || 0);
      }
    }

    const surveyDiv = feedbackTotal > 0 ? feedbackTotal : 1;
    const surveyIndicators = {
      kepuasanMagang:
        feedbackTotal > 0 ? Number((sumKepuasan / surveyDiv).toFixed(2)) : 0,
      rekomendasiProgram:
        feedbackTotal > 0 ? Number((sumRekomendasi / surveyDiv).toFixed(2)) : 0,
      kemudahanProses:
        feedbackTotal > 0 ? Number((sumKemudahan / surveyDiv).toFixed(2)) : 0,
      peningkatanSkill:
        feedbackTotal > 0 ? Number((sumSkill / surveyDiv).toFixed(2)) : 0,
    };
    const rataRataSurvey =
      feedbackTotal > 0
        ? Number(
            (
              (surveyIndicators.kepuasanMagang +
                surveyIndicators.rekomendasiProgram +
                surveyIndicators.kemudahanProses +
                surveyIndicators.peningkatanSkill) /
              4
            ).toFixed(1),
          )
        : 0;

    // Hitung Absensi Hari Ini
    let absensiHariIniHadir = 0;
    let absensiHariIniTerlambat = 0;
    let absensiHariIniIzin = 0;

    for (const ab of absensiList as any[]) {
      if (ab.date !== todayIso) continue;
      if (!strictPesertaMatch(ab.user, ab.email)) continue;

      if (ab.attendanceMode === "izin") {
        absensiHariIniIzin += 1;
      } else if (ab.checkIn?.timeStatus === "late") {
        absensiHariIniTerlambat += 1;
      } else {
        absensiHariIniHadir += 1;
      }
    }
    const absensiHariIniTotal =
      absensiHariIniHadir + absensiHariIniTerlambat + absensiHariIniIzin;
    const persenKehadiranHariIni =
      pesertaSedangMagang > 0
        ? Math.min(
            100,
            Math.round((absensiHariIniTotal / pesertaSedangMagang) * 100),
          )
        : 0;

    // Kuota & Okupansi Formasi
    const formasiOccupancy = (formasiList as any[]).map((f) => {
      const pNorm = normalizeText(f.title);
      const terisi = formasiFilledMap.get(pNorm) || 0;
      const menungguPendaftar = formasiPendingMap.get(pNorm) || 0;
      const kuota = Number(f.kuota || 0);
      return {
        title: f.title,
        kuota,
        terisi,
        menungguPendaftar,
        sisaKuota: Math.max(0, kuota - terisi),
      };
    });
    const kuotaTotal = formasiOccupancy.reduce((s, f) => s + f.kuota, 0);
    const kuotaTerisi = formasiOccupancy.reduce((s, f) => s + f.terisi, 0);
    const kuotaPersen =
      kuotaTotal > 0 ? Math.min(100, Math.round((kuotaTerisi / kuotaTotal) * 100)) : 0;

    // Bangun Trend Chart Multi-Series (harian jika 7d/30d/today/month, bulanan 12 bulan untuk year/all)
    const isDailyTrend =
      range === "today" || range === "7d" || range === "30d" || range === "month";

    let trendLabels: string[] = [];
    let bucketKeys: string[] = [];

    if (isDailyTrend) {
      const dStart = startIso || addDaysIso(todayIso, -29);
      const dEnd = endIso || todayIso;
      let cursor = dStart;
      let guard = 0;
      while (cursor <= dEnd && guard < 35) {
        bucketKeys.push(cursor);
        const [, mm, dd] = cursor.split("-");
        trendLabels.push(`${Number(dd)}/${Number(mm)}`);
        cursor = addDaysIso(cursor, 1);
        guard += 1;
      }
    } else {
      bucketKeys = Array.from({ length: 12 }, (_, idx) => {
        const mm = String(idx + 1).padStart(2, "0");
        return `${selectedYear}-${mm}`;
      });
      trendLabels = MONTH_SHORT_NAMES.map((m) => `${m} ${selectedYear}`);
    }

    const bucketIndex = new Map(bucketKeys.map((k, idx) => [k, idx]));
    const len = bucketKeys.length;
    const pendaftaranMasukSeries = new Array(len).fill(0);
    const pendaftaranDisetujuiSeries = new Array(len).fill(0);
    const logbookMasukSeries = new Array(len).fill(0);
    const logbookDisetujuiSeries = new Array(len).fill(0);
    const logbookMenungguSeries = new Array(len).fill(0);
    const absensiHadirSeries = new Array(len).fill(0);
    const absensiTelatSeries = new Array(len).fill(0);
    const absensiIzinSeries = new Array(len).fill(0);

    const resolveKey = (iso: string | null) =>
      !iso ? null : isDailyTrend ? iso : iso.slice(0, 7);

    for (const pd of pendaftaranList as any[]) {
      const pesertaArr: any[] = Array.isArray(pd.peserta) ? pd.peserta : [];
      if (
        hasEntityFilters &&
        !pesertaArr.some((ps) =>
          matchesPesertaFilters(ps, resolveEffectivePesertaStatus(ps, todayIso)),
        )
      ) {
        continue;
      }
      const key = resolveKey(toWibIsoDate(pd.createdAt));
      const idx = key ? bucketIndex.get(key) : undefined;
      if (idx === undefined) continue;
      pendaftaranMasukSeries[idx] += 1;
      if (pd.status === "Disetujui") pendaftaranDisetujuiSeries[idx] += 1;
    }

    for (const lb of logbookList as any[]) {
      if (!strictPesertaMatch(lb.user)) continue;
      const key = resolveKey(toWibIsoDate(lb.date || lb.createdAt));
      const idx = key ? bucketIndex.get(key) : undefined;
      if (idx === undefined) continue;
      logbookMasukSeries[idx] += 1;
      if (lb.approvalStatus === "disetujui") logbookDisetujuiSeries[idx] += 1;
      else if (lb.approvalStatus === "menunggu") logbookMenungguSeries[idx] += 1;
    }

    for (const ab of absensiList as any[]) {
      if (!strictPesertaMatch(ab.user, ab.email)) continue;
      const key = resolveKey(toWibIsoDate(ab.date));
      const idx = key ? bucketIndex.get(key) : undefined;
      if (idx === undefined) continue;
      if (ab.attendanceMode === "izin") absensiIzinSeries[idx] += 1;
      else if (ab.checkIn?.timeStatus === "late") absensiTelatSeries[idx] += 1;
      else absensiHadirSeries[idx] += 1;
    }

    // Pipeline Status Stacked Bar
    const pipelineStatus = [
      {
        label: "Pendaftaran",
        selesai: pendaftaranDisetujui,
        menunggu: pendaftaranMenunggu + pendaftaranSedangDiproses,
        revisi: 0,
        ditolak: pendaftaranDitolak,
      },
      {
        label: "Logbook",
        selesai: logbookDisetujui,
        menunggu: logbookMenunggu,
        revisi: logbookRevisi,
        ditolak: logbookDitolak,
      },
      {
        label: "Laporan Akhir",
        selesai: laporanDisetujui,
        menunggu: laporanMenunggu,
        revisi: laporanRevisi,
        ditolak: laporanDitolak,
      },
      {
        label: "Evaluasi",
        selesai: evaluasiDisetujui,
        menunggu: evaluasiMenunggu,
        revisi: evaluasiRevisi,
        ditolak: 0,
      },
      {
        label: "Feedback",
        selesai: feedbackDirespon,
        menunggu: feedbackBelumDirespon,
        revisi: feedbackRevisi,
        ditolak: 0,
      },
    ];

    // Mentor Workload sorted descending by active peserta + pending
    const mentorWorkload = Array.from(mentorWorkloadMap.values())
      .filter(
        (m) =>
          m.pesertaTotal > 0 ||
          m.logbookMenunggu > 0 ||
          m.laporanMenunggu > 0 ||
          !filterMentorId ||
          filterMentorId === m.mentorId,
      )
      .sort(
        (a, b) =>
          b.pesertaAktif +
          b.logbookMenunggu -
          (a.pesertaAktif + a.logbookMenunggu),
      );

    // unused variable check suppression for userMatchesScope helper
    void userMatchesScope;

    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      filterOptions: {
        years: Array.from(yearSet).sort((a, b) => b - a),
        formasiTitles: Array.from(formasiOptionMap.values()).sort((a, b) =>
          a.localeCompare(b, "id-ID"),
        ),
        instansiList: Array.from(instansiOptionMap.values()).sort((a, b) =>
          a.localeCompare(b, "id-ID"),
        ),
        jurusanList: Array.from(jurusanOptionMap.values()).sort((a, b) =>
          a.localeCompare(b, "id-ID"),
        ),
        jenisKelaminList: Array.from(jenisKelaminOptionMap.values()),
        mentors: mentorUsers
          .filter((m) => m.status === "Aktif")
          .map((m) => ({
            _id: String(m._id),
            name: m.name,
            posisiMentor: m.posisiMentor || "",
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "id-ID")),
      },
      participantTrend,
      participantStatusSummary,
      cards: {
        pesertaDisetujuiTotal,
        pesertaSedangMagang,
        pesertaBelumMulai,
        pesertaSelesai,
        pesertaTidakMagang,
        akunPesertaAktif,
        akunMentorAktif,
        akunAdminAktif,
        akunSuperadminAktif,
        kuotaTotal,
        kuotaTerisi,
        kuotaPersen,
        absensiHariIniHadir,
        absensiHariIniTerlambat,
        absensiHariIniIzin,
        absensiHariIniTotal,
        persenKehadiranHariIni,
        rataRataSurvey,
        totalSurvey: feedbackTotal,
        rataRataNilaiAkhir,
        totalDinilai,
        pendaftaranTotal,
        pendaftaranMenunggu,
        pendaftaranSedangDiproses,
        pendaftaranDisetujui,
        pendaftaranDitolak,
        pendaftaranHariIni,
        pesertaTanpaMentor,
        logbookTotal,
        logbookMenunggu,
        logbookDisetujui,
        logbookDitolak,
        logbookRevisi,
        logbookHariIni,
        laporanTotal,
        laporanMenunggu,
        laporanRevisi,
        laporanDisetujui,
        laporanDitolak,
        evaluasiTotal,
        evaluasiMenunggu,
        evaluasiRevisi,
        evaluasiDisetujui,
        belumDinilaiSelesai,
        feedbackTotal,
        feedbackBelumDirespon,
        feedbackDirespon,
        feedbackRevisi,
        selesaiBelumSurat,
        selesaiBelumSertifikat,
      },
      trendChart: {
        mode: isDailyTrend ? "daily" : "monthly",
        labels: trendLabels,
        pendaftaranMasuk: pendaftaranMasukSeries,
        pendaftaranDisetujui: pendaftaranDisetujuiSeries,
        logbookMasuk: logbookMasukSeries,
        logbookDisetujui: logbookDisetujuiSeries,
        logbookMenunggu: logbookMenungguSeries,
        absensiHadir: absensiHadirSeries,
        absensiTelat: absensiTelatSeries,
        absensiIzin: absensiIzinSeries,
      },
      pipelineStatus,
      formasiOccupancy,
      mentorWorkload,
      surveyIndicators,
      nilaiBuckets,
      demographics: {
        kategori: Array.from(kategoriCountMap.entries()).map(
          ([label, count]) => ({ label, count }),
        ),
        asalJenis: Array.from(asalJenisCountMap.entries()).map(
          ([label, count]) => ({ label, count }),
        ),
        gender: Array.from(genderCountMap.entries()).map(([label, count]) => ({
          label,
          count,
        })),
        tipePeserta: Array.from(tipePesertaMap.entries()).map(
          ([label, count]) => ({ label, count }),
        ),
        formasiDemand: Array.from(formasiDemandMap.values()).sort(
          (a, b) => b.count - a.count,
        ),
        jurusanBreakdown: Array.from(jurusanBreakdownMap.values()).sort(
          (a, b) => b.count - a.count,
        ),
        instansiBreakdown: Array.from(topAsalNamaMap.values()).sort(
          (a, b) => b.count - a.count,
        ),
        topAsalNama: Array.from(topAsalNamaMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
      },
      perkiraanSelesai: Array.from(perkiraanSelesaiMap.entries())
        .map(([periode, count]) => ({ periode, count }))
        .sort((a, b) => {
          const [qA, yA] = a.periode.split(" ");
          const [qB, yB] = b.periode.split(" ");
          if (yA !== yB) return Number(yA) - Number(yB);
          return qA.localeCompare(qB);
        }),
      actionQueues: {
        pendaftaranMenunggu: pendaftaranMenungguQueue,
        logbookMenunggu: logbookMenungguQueue,
        laporanMenunggu: laporanMenungguQueue,
        dokumenBelumLengkap: dokumenBelumLengkapQueue,
      },
    });
  } catch (err) {
    console.error("[GET SUPERADMIN DASHBOARD SUMMARY]", err);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat statistik lengkap dashboard superadmin",
    });
  }
};
