import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User";
import Role from "../models/Role";
import { sendEmail } from "../utils/sendEmail";
import { mentorEmailTemplate } from "../utils/mentorEmailTemplate";
import Pendaftaran from "../models/pendaftaran";
import Logbook from "../models/Logbook";
import LaporanAkhir from "../models/LaporanAkhir";
import Feedback from "../models/Feedback";
import Absensi from "../models/Absensi";
import PenilaianAkhir from "../models/PenilaianAkhir";
import EvaluasiMagang from "../models/EvaluasiMagang";
import { resolveKategoriMagang } from "../utils/pesertaKategori";
import { getHolidayConfigSets } from "../services/holidayService";
import {
  getMissedCutoffDateWib,
  getPenilaianAkhirSchedule,
  getWorkdaysInRange,
  parseDateIso,
} from "../utils/absensiScoring";

/* ================= BUAT AKUN MENTOR + EMAIL ================= */
export const buatMentor = async (req: Request, res: Response) => {
  try {
    const { name, email, password, posisiMentor, nip, wa } = req.body;

    if (!name || !email || !password || !posisiMentor || !nip || !wa) {
      return res.status(400).json({
        message:
          "Nama, email, NIP, nomor WhatsApp, password, dan posisi mentor wajib diisi",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email sudah terdaftar" });
    }

    const mentorRole = await Role.findOne({ name: "mentor" });
    if (!mentorRole) {
      return res.status(500).json({ message: "Role mentor tidak tersedia" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const mentor = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashed,
      roles: [mentorRole._id],
      status: "Aktif",
      posisiMentor,
      nip: String(nip).trim(),
      wa: String(wa).trim(),
    });

    await sendEmail({
      to: email,
      subject: "Akun Mentor Magang",
      html: mentorEmailTemplate({
        name,
        email,
        password,
        role: "Mentor",
        pesertaBimbingan: [],
      }),
    });

    res.status(201).json({
      message: "Akun mentor berhasil dibuat",
      mentor,
    });
  } catch (err) {
    console.error("[BUAT MENTOR]", err);
    res.status(500).json({ message: "Gagal membuat akun mentor" });
  }
};

/* ================= GET DATA MENTOR ================= */
export const getMentor = async (_req: Request, res: Response) => {
  try {
    const role = await Role.findOne({ name: "mentor" });
    if (!role) return res.json([]);

    const data = await User.find({ roles: role._id })
      .select("name email status posisiMentor nip wa roles")
      .populate("roles", "name")
      .lean();

    const formatted = data.map((u: any) => ({
      ...u,
      roles: Array.isArray(u.roles)
        ? u.roles.map((r: any) => r?.name).filter(Boolean)
        : ["mentor"],
    }));

    res.json(formatted);
  } catch {
    res.status(500).json({ message: "Gagal memuat mentor" });
  }
};

/* ================= UPDATE AKUN MENTOR ================= */
export const updateMentor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, nip, wa, posisiMentor, password } = req.body;

    if (!name || !email || !posisiMentor || !nip || !wa) {
      return res.status(400).json({
        message:
          "Nama, email, NIP, nomor WhatsApp, dan posisi mentor wajib diisi",
      });
    }

    const mentor = await User.findById(id);
    if (!mentor) {
      return res.status(404).json({ message: "Akun mentor tidak ditemukan" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const emailConflict = await User.findOne({
      _id: { $ne: id },
      email: { $regex: new RegExp(`^${escapedEmail}$`, "i") },
    });

    if (emailConflict) {
      return res
        .status(409)
        .json({ message: "Email sudah digunakan oleh akun lain" });
    }

    mentor.name = String(name).trim();
    mentor.email = normalizedEmail;
    mentor.nip = String(nip).trim();
    mentor.wa = String(wa).trim();
    mentor.posisiMentor = String(posisiMentor).trim();

    if (typeof password === "string" && password.trim().length > 0) {
      if (password.trim().length < 8) {
        return res.status(400).json({
          message: "Password baru minimal 8 karakter",
        });
      }
      mentor.password = await bcrypt.hash(password.trim(), 10);
      mentor.passwordChangedAt = new Date();
    }

    await mentor.save();

    return res.json({
      message: "Akun mentor berhasil diperbarui",
      mentor: {
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        nip: mentor.nip,
        wa: mentor.wa,
        posisiMentor: mentor.posisiMentor,
        status: mentor.status,
      },
    });
  } catch (err) {
    console.error("[UPDATE MENTOR]", err);
    return res.status(500).json({ message: "Gagal memperbarui akun mentor" });
  }
};

/* ================= NONAKTIFKAN ================= */
export const nonaktifkanMentor = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Nonaktif",
    });

    res.json({ message: "Akun mentor berhasil dinonaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal menonaktifkan akun mentor" });
  }
};

/* ================= AKTIFKAN ================= */
export const aktifkanMentor = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.params.id, {
      status: "Aktif",
    });

    res.json({ message: "Akun mentor berhasil diaktifkan" });
  } catch {
    res.status(500).json({ message: "Gagal mengaktifkan akun mentor" });
  }
};

type InternshipPhase = "belum_mulai" | "sedang_magang" | "selesai" | "tidak_magang";

const toWibIsoDate = (value?: string | Date | null): string | null => {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};

const resolveInternshipPhase = (
  ps: {
    statusMagang?: string;
    tanggalMulaiMagang?: string;
    tanggalSelesaiMagang?: string;
  },
  todayIso: string,
): InternshipPhase => {
  if (ps.statusMagang === "Tidak Magang") return "tidak_magang";
  if (ps.statusMagang === "Selesai Magang") return "selesai";

  const startIso = toWibIsoDate(ps.tanggalMulaiMagang);
  const endIso = toWibIsoDate(ps.tanggalSelesaiMagang);

  if (startIso && todayIso < startIso) return "belum_mulai";
  if (endIso && todayIso > endIso) return "selesai";
  if (startIso || endIso) return "sedang_magang";

  if (ps.statusMagang === "Belum Waktu Magang") return "belum_mulai";
  return "sedang_magang";
};

const mapPesertaRecord = (ps: any, pendaftaran: any) => ({
  /* ================= IDENTITAS ================= */
  userId: ps.user ? ps.user.toString() : null,
  nama: ps.nama,
  email: ps.email,
  wa: ps.wa,
  posisi: ps.posisi,
  jurusan: ps.jurusan,
  kategoriMagang: resolveKategoriMagang(ps.jurusan, ps.kategoriMagang),
  asal: ps.asal
    ? {
        jenis: ps.asal.jenis || "",
        nama: ps.asal.nama || "",
      }
    : null,
  kategori: pendaftaran.kategori || "sendiri",
  statusMagang: ps.statusMagang || "Menunggu",

  /* ================= DATA DIRI ================= */
  jenisKelamin: ps.jenisKelamin,
  tempatLahir: ps.tempatLahir,
  tanggalLahir: ps.tanggalLahir,

  /* ================= INFORMASI MAGANG ================= */
  tanggalMulaiMagang: ps.tanggalMulaiMagang,
  tanggalSelesaiMagang: ps.tanggalSelesaiMagang,

  /* ================= ALAMAT ================= */
  provinsi: ps.provinsi,
  kota: ps.kota,
  kecamatan: ps.kecamatan,
  kelurahan: ps.kelurahan,
  alamatLengkap: ps.alamatLengkap,

  /* ================= MENTOR ================= */
  mentor: ps.mentor
    ? {
        name: ps.mentor.name,
        email: ps.mentor.email,
        posisiMentor: ps.mentor.posisiMentor,
      }
    : null,
});

const fetchMentorPesertaRecords = async (mentorId: string) => {
  const pendaftaranList = await Pendaftaran.find({
    status: "Disetujui",
    "peserta.mentor": mentorId,
  }).populate("peserta.mentor", "name email posisiMentor");

  return pendaftaranList.flatMap((pendaftaran) =>
    pendaftaran.peserta
      .filter((ps: any) => ps.mentor && ps.mentor._id.toString() === mentorId)
      .map((ps: any) => mapPesertaRecord(ps, pendaftaran)),
  );
};

/* ================= GET PESERTA BIMBINGAN (FULL + MAGANG DATE) ================= */
export const getPesertaBimbingan = async (req: any, res: Response) => {
  try {
    const peserta = await fetchMentorPesertaRecords(req.user.id);
    res.json(peserta);
  } catch (err) {
    console.error("[GET PESERTA BIMBINGAN]", err);
    res.status(500).json({
      message: "Gagal memuat peserta bimbingan",
    });
  }
};

/* ================= GET DASHBOARD SUMMARY MENTOR ================= */
export const getMentorDashboardSummary = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const [mentorUser, pesertaRecords] = await Promise.all([
      User.findById(mentorId).select("name email posisiMentor"),
      fetchMentorPesertaRecords(mentorId),
    ]);

    const emailSet = Array.from(
      new Set(
        pesertaRecords
          .map((p) => p.email?.trim())
          .filter((email): email is string => Boolean(email)),
      ),
    );

    const matchedUsers = emailSet.length
      ? await User.find({
          email: {
            $in: emailSet.map((e) => new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")),
          },
        }).select("_id email")
      : [];

    const emailToUserId = new Map<string, string>();
    matchedUsers.forEach((u) => {
      if (u.email) {
        emailToUserId.set(u.email.toLowerCase(), u._id.toString());
      }
    });

    const resolvedUserIds = Array.from(
      new Set([
        ...matchedUsers.map((u) => u._id.toString()),
        ...pesertaRecords
          .map((p) => p.userId)
          .filter((id): id is string => Boolean(id && mongoose.Types.ObjectId.isValid(id))),
      ]),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const todayIso = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Jakarta",
    });
    const emailLowerList = emailSet.map((e) => e.toLowerCase());

    const [
      logbookAgg,
      laporanList,
      feedbackList,
      absensiList,
      penilaianAkhirList,
      evaluasiList,
      holidayConfig,
    ] =
      resolvedUserIds.length || emailLowerList.length
        ? await Promise.all([
            resolvedUserIds.length
              ? Logbook.aggregate([
                  { $match: { user: { $in: resolvedUserIds } } },
                  {
                    $group: {
                      _id: "$user",
                      total: { $sum: 1 },
                      menunggu: {
                        $sum: {
                          $cond: [{ $eq: ["$approvalStatus", "menunggu"] }, 1, 0],
                        },
                      },
                      revisi: {
                        $sum: {
                          $cond: [{ $eq: ["$approvalStatus", "revisi"] }, 1, 0],
                        },
                      },
                      disetujui: {
                        $sum: {
                          $cond: [{ $eq: ["$approvalStatus", "disetujui"] }, 1, 0],
                        },
                      },
                      ditolak: {
                        $sum: {
                          $cond: [{ $eq: ["$approvalStatus", "ditolak"] }, 1, 0],
                        },
                      },
                      latestLogbookDate: { $max: "$date" },
                      filledDates: { $addToSet: "$date" },
                    },
                  },
                ])
              : Promise.resolve([]),
            resolvedUserIds.length
              ? LaporanAkhir.find({ user: { $in: resolvedUserIds } })
                  .select("user status fileName submittedAt approvedAt createdAt")
                  .lean()
              : Promise.resolve([]),
            resolvedUserIds.length
              ? Feedback.find({ user: { $in: resolvedUserIds } })
                  .select("user month mentorResponse isFeedbackMentorSent status createdAt")
                  .lean()
              : Promise.resolve([]),
            Absensi.find({
              $or: [
                ...(resolvedUserIds.length ? [{ user: { $in: resolvedUserIds } }] : []),
                ...(emailLowerList.length ? [{ email: { $in: emailLowerList } }] : []),
              ],
            })
              .select("user email date attendanceMode dailyScore checkIn.timeWIB checkOut.timeWIB")
              .lean(),
            PenilaianAkhir.find({
              $or: [
                ...(resolvedUserIds.length ? [{ user: { $in: resolvedUserIds } }] : []),
                ...(emailLowerList.length ? [{ pesertaEmail: { $in: emailLowerList } }] : []),
              ],
            })
              .select("user pesertaEmail nilaiRataRata keteranganRataRata tanggalPenilaian")
              .lean(),
            EvaluasiMagang.find({
              $or: [
                ...(resolvedUserIds.length ? [{ user: { $in: resolvedUserIds } }] : []),
                ...(emailLowerList.length ? [{ email: { $in: emailLowerList } }] : []),
              ],
            })
              .select("user email status submittedAt reviewedAt createdAt")
              .lean(),
            getHolidayConfigSets(),
          ])
        : [
            [],
            [],
            [],
            [],
            [],
            [],
            { holidayDates: new Set<string>(), overrideWorkdays: new Set<string>() },
          ];
    const { holidayDates, overrideWorkdays } = holidayConfig;

    const logbookCutoffIso = getMissedCutoffDateWib();

    const logbookMap = new Map<string, any>();
    logbookAgg.forEach((item: any) => {
      logbookMap.set(item._id.toString(), {
        total: item.total || 0,
        menunggu: item.menunggu || 0,
        revisi: item.revisi || 0,
        disetujui: item.disetujui || 0,
        ditolak: item.ditolak || 0,
        latestLogbookDate: item.latestLogbookDate || null,
        filledDates: Array.isArray(item.filledDates) ? item.filledDates : [],
      });
    });

    const laporanMap = new Map<string, any>();
    laporanList.forEach((lap: any) => {
      laporanMap.set(lap.user.toString(), {
        _id: lap._id.toString(),
        status: lap.status,
        fileName: lap.fileName,
        submittedAt: lap.submittedAt || lap.createdAt,
        approvedAt: lap.approvedAt || null,
      });
    });

    const feedbackMap = new Map<string, { total: number; belumDirespon: number }>();
    feedbackList.forEach((fb: any) => {
      const uid = fb.user.toString();
      const prev = feedbackMap.get(uid) || { total: 0, belumDirespon: 0 };
      prev.total += 1;
      if (!fb.mentorResponse || !String(fb.mentorResponse).trim()) {
        prev.belumDirespon += 1;
      }
      feedbackMap.set(uid, prev);
    });

    const absensiByKey = new Map<
      string,
      {
        totalHari: number;
        sumScore: number;
        todayStatus: "masuk" | "wfh" | "izin" | "belum";
        todayCheckInTimeWIB: string | null;
        todayCheckOutTimeWIB: string | null;
      }
    >();
    const updateAbsensiAcc = (key: string, rec: any) => {
      if (!key) return;
      const cur = absensiByKey.get(key) || {
        totalHari: 0,
        sumScore: 0,
        todayStatus: "belum" as const,
        todayCheckInTimeWIB: null,
        todayCheckOutTimeWIB: null,
      };
      cur.totalHari += 1;
      cur.sumScore += typeof rec.dailyScore === "number" ? rec.dailyScore : 0;
      if (rec.date === todayIso) {
        cur.todayStatus =
          rec.attendanceMode === "izin"
            ? "izin"
            : rec.attendanceMode === "wfh"
              ? "wfh"
              : "masuk";
        cur.todayCheckInTimeWIB = rec.checkIn?.timeWIB || null;
        cur.todayCheckOutTimeWIB = rec.checkOut?.timeWIB || null;
      }
      absensiByKey.set(key, cur);
    };
    absensiList.forEach((rec: any) => {
      if (rec.user) updateAbsensiAcc(rec.user.toString(), rec);
      if (rec.email) updateAbsensiAcc(rec.email.toLowerCase(), rec);
    });

    const penilaianMap = new Map<string, any>();
    penilaianAkhirList.forEach((pen: any) => {
      const mapped = {
        nilaiRataRata: pen.nilaiRataRata,
        keteranganRataRata: pen.keteranganRataRata || "",
        tanggalPenilaian: pen.tanggalPenilaian || null,
      };
      if (pen.user) penilaianMap.set(pen.user.toString(), mapped);
      if (pen.pesertaEmail)
        penilaianMap.set(pen.pesertaEmail.toLowerCase(), mapped);
    });

    const evaluasiByKey = new Map<string, any>();
    evaluasiList.forEach((ev: any) => {
      const mapped = {
        _id: ev._id.toString(),
        status: ev.status || "Menunggu",
        submittedAt: ev.submittedAt || ev.createdAt || null,
        reviewedAt: ev.reviewedAt || null,
      };
      if (ev.user) evaluasiByKey.set(ev.user.toString(), mapped);
      if (ev.email) evaluasiByKey.set(String(ev.email).toLowerCase(), mapped);
    });

    const enrichedPeserta = pesertaRecords.map((p) => {
      const emailLower = p.email ? p.email.toLowerCase() : "";
      const resolvedUserId =
        p.userId || (emailLower ? emailToUserId.get(emailLower) || null : null);
      const rawLogbookStats = (resolvedUserId && logbookMap.get(resolvedUserId)) || {
        total: 0,
        menunggu: 0,
        revisi: 0,
        disetujui: 0,
        ditolak: 0,
        latestLogbookDate: null,
        filledDates: [] as string[],
      };

      const startIso = parseDateIso(p.tanggalMulaiMagang);
      const endIso = parseDateIso(p.tanggalSelesaiMagang);
      const capEndIso =
        endIso && endIso < logbookCutoffIso ? endIso : logbookCutoffIso;
      const expectedWorkdays =
        p.statusMagang !== "Tidak Magang" && startIso && capEndIso >= startIso
          ? getWorkdaysInRange(
              startIso,
              capEndIso,
              holidayDates,
              overrideWorkdays,
            )
          : [];
      const filledSet = new Set<string>(rawLogbookStats.filledDates || []);
      const missedDates = expectedWorkdays
        .filter((d) => !filledSet.has(d))
        .sort((a, b) => b.localeCompare(a));

      const logbookStats = {
        total: rawLogbookStats.total,
        menunggu: rawLogbookStats.menunggu,
        revisi: rawLogbookStats.revisi,
        disetujui: rawLogbookStats.disetujui,
        ditolak: rawLogbookStats.ditolak,
        latestLogbookDate: rawLogbookStats.latestLogbookDate,
        missedCount: missedDates.length,
        missedDates,
      };
      const laporanAkhir = (resolvedUserId && laporanMap.get(resolvedUserId)) || null;
      const feedbackStats = (resolvedUserId && feedbackMap.get(resolvedUserId)) || {
        total: 0,
        belumDirespon: 0,
      };
      const absRaw =
        (resolvedUserId && absensiByKey.get(resolvedUserId)) ||
        (emailLower && absensiByKey.get(emailLower)) ||
        null;
      const absensiStats = {
        totalHari: absRaw?.totalHari || 0,
        averageScore:
          absRaw && absRaw.totalHari > 0
            ? Math.round(absRaw.sumScore / absRaw.totalHari)
            : null,
        todayStatus: absRaw?.todayStatus || ("belum" as const),
        todayCheckInTimeWIB: absRaw?.todayCheckInTimeWIB || null,
        todayCheckOutTimeWIB: absRaw?.todayCheckOutTimeWIB || null,
      };
      const penilaianAkhir =
        (resolvedUserId && penilaianMap.get(resolvedUserId)) ||
        (emailLower && penilaianMap.get(emailLower)) ||
        null;
      const penilaianSchedule = getPenilaianAkhirSchedule(
        p.tanggalMulaiMagang,
        p.tanggalSelesaiMagang,
        p.statusMagang,
      );
      const evaluasi =
        (resolvedUserId && evaluasiByKey.get(resolvedUserId)) ||
        (emailLower && evaluasiByKey.get(emailLower)) ||
        null;
      const phase = resolveInternshipPhase(p, todayIso);

      return {
        ...p,
        userId: resolvedUserId,
        phase,
        logbookStats,
        laporanAkhir,
        feedbackStats,
        absensiStats,
        penilaianAkhir,
        penilaianSchedule,
        evaluasi,
      };
    });

    const sedangMagangList = enrichedPeserta.filter(
      (p) => p.phase === "sedang_magang",
    );
    const absensiHadirHariIni = sedangMagangList.filter(
      (p) => p.absensiStats.todayStatus !== "belum",
    ).length;
    const absensiBelumHariIni = sedangMagangList.filter(
      (p) => p.absensiStats.todayStatus === "belum",
    ).length;
    const dinilaiPeserta = enrichedPeserta.filter((p) =>
      Boolean(p.penilaianAkhir),
    );
    const penilaianAkhirSudah = dinilaiPeserta.length;
    const penilaianAkhirBelum =
      enrichedPeserta.length - penilaianAkhirSudah;
    const penilaianAkhirRataRata =
      penilaianAkhirSudah > 0
        ? Number(
            (
              dinilaiPeserta.reduce(
                (acc, p) => acc + (Number(p.penilaianAkhir?.nilaiRataRata) || 0),
                0,
              ) / penilaianAkhirSudah
            ).toFixed(2),
          )
        : null;

    const summary = {
      totalPeserta: enrichedPeserta.length,
      sedangMagang: sedangMagangList.length,
      belumMulai: enrichedPeserta.filter((p) => p.phase === "belum_mulai").length,
      selesaiMagang: enrichedPeserta.filter((p) => p.phase === "selesai").length,
      pesertaDenganLogbookMenunggu: enrichedPeserta.filter(
        (p) => p.logbookStats.menunggu > 0,
      ).length,
      totalLogbookMenunggu: enrichedPeserta.reduce(
        (acc, p) => acc + p.logbookStats.menunggu,
        0,
      ),
      pesertaDenganLogbookRevisi: enrichedPeserta.filter(
        (p) => p.logbookStats.revisi > 0,
      ).length,
      totalLogbookRevisi: enrichedPeserta.reduce(
        (acc, p) => acc + p.logbookStats.revisi,
        0,
      ),
      totalLogbookDisetujui: enrichedPeserta.reduce(
        (acc, p) => acc + p.logbookStats.disetujui,
        0,
      ),
      pesertaBelumIsiLogbook: enrichedPeserta.filter(
        (p) => (p.logbookStats.missedCount ?? 0) > 0,
      ).length,
      totalLogbookBelumIsi: enrichedPeserta.reduce(
        (acc, p) => acc + (p.logbookStats.missedCount ?? 0),
        0,
      ),
      laporanAkhirMenunggu: enrichedPeserta.filter(
        (p) => p.laporanAkhir?.status === "Menunggu",
      ).length,
      laporanAkhirDisetujui: enrichedPeserta.filter(
        (p) => p.laporanAkhir?.status === "Disetujui",
      ).length,
      laporanAkhirDitolak: enrichedPeserta.filter(
        (p) => p.laporanAkhir?.status === "Ditolak",
      ).length,
      totalLaporanAkhir: enrichedPeserta.filter((p) => Boolean(p.laporanAkhir)).length,
      feedbackTotal: enrichedPeserta.reduce(
        (acc, p) => acc + p.feedbackStats.total,
        0,
      ),
      feedbackBelumDirespon: enrichedPeserta.reduce(
        (acc, p) => acc + p.feedbackStats.belumDirespon,
        0,
      ),
      absensiHadirHariIni,
      absensiBelumHariIni,
      penilaianAkhirSudah,
      penilaianAkhirBelum,
      penilaianAkhirRataRata,
      penilaianSiapDinilai: enrichedPeserta.filter(
        (p) => !p.penilaianAkhir && p.penilaianSchedule.canRate,
      ).length,
      penilaianBelumWaktunya: enrichedPeserta.filter(
        (p) => !p.penilaianAkhir && p.penilaianSchedule.reason === "too_early",
      ).length,
      evaluasiMenunggu: enrichedPeserta.filter(
        (p) => p.evaluasi?.status === "Menunggu",
      ).length,
      evaluasiRevisi: enrichedPeserta.filter(
        (p) => p.evaluasi?.status === "Revisi",
      ).length,
      evaluasiDisetujui: enrichedPeserta.filter(
        (p) => p.evaluasi?.status === "Disetujui",
      ).length,
      evaluasiBelumMengisi: enrichedPeserta.filter((p) => !p.evaluasi).length,
    };

    res.json({
      mentor: mentorUser
        ? {
            name: mentorUser.name,
            email: mentorUser.email,
            posisiMentor: mentorUser.posisiMentor || "",
          }
        : null,
      summary,
      peserta: enrichedPeserta,
      holidayDates: Array.from(holidayDates),
      overrideWorkdays: Array.from(overrideWorkdays),
    });
  } catch (err) {
    console.error("[GET MENTOR DASHBOARD SUMMARY]", err);
    res.status(500).json({
      message: "Gagal memuat ringkasan dashboard mentor",
    });
  }
};

/* ================= GET DETAIL PESERTA ================= */
export const getPesertaDetail = async (req: Request, res: Response) => {
  try {
    const { pesertaId } = req.params;

    const pendaftaran = await Pendaftaran.findOne({
      "peserta._id": pesertaId,
    });

    if (!pendaftaran) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    const peserta = pendaftaran.peserta.find(
      (p: any) => p._id.toString() === pesertaId,
    );

    res.json(peserta);
  } catch (err) {
    console.error("[GET PESERTA DETAIL]", err);
    res.status(500).json({
      message: "Gagal memuat detail peserta",
    });
  }
};

// Di MentorController.js
export const getLogbookPesertaByDate = async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;

    console.log("Mencari logbook untuk:", { userId, date });

    // Validasi input
    if (!userId || userId === "undefined") {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    // Cari user berdasarkan userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User tidak ditemukan",
      });
    }

    // Cari logbook berdasarkan user._id (ObjectId) dan date
    const logbook = await Logbook.findOne({
      user: user._id,
      date,
    }).populate("user", "name email");

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    res.json(logbook);
  } catch (err) {
    console.error("[GET LOGBOOK BY DATE]", err);
    res.status(500).json({
      message: "Gagal memuat logbook",
    });
  }
};
