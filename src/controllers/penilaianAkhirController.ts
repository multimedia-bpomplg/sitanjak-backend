import { Response } from "express";
import mongoose from "mongoose";
import PenilaianAkhir from "../models/PenilaianAkhir";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import LaporanAkhir from "../models/LaporanAkhir";
import Absensi from "../models/Absensi";
import {
  calculateFinalAttendanceScore,
  getPenilaianAkhirSchedule,
} from "../utils/absensiScoring";
import { createNotification } from "../services/notificationService";
import { getHolidayDateSet } from "../services/holidayService";

/* ================= HELPERS ================= */

function formatIsoIndo(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPredikatFromNilai(nilai: number): string {
  if (nilai >= 91) return "Sangat Baik";
  if (nilai >= 76) return "Baik";
  if (nilai >= 61) return "Cukup";
  return "Kurang";
}

function parseAspectInput(
  raw: any,
  label: string,
): { nilai: number; keterangan: string } | { error: string } {
  const num = Number(raw?.nilai);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return {
      error: `Nilai "${label}" harus berupa angka antara 0 sampai 100.`,
    };
  }
  const cleanNilai = Number(num.toFixed(2));
  const rawKet = typeof raw?.keterangan === "string" ? raw.keterangan.trim() : "";
  return {
    nilai: cleanNilai,
    keterangan: rawKet || getPredikatFromNilai(cleanNilai),
  };
}

function getRoleNames(user: any): string[] {
  const raw = user?.roles;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => (typeof r === "string" ? r : r?.name || ""))
    .map((s: string) => s.toLowerCase())
    .filter(Boolean);
}

/* ================= GET PENILAIAN AKHIR PESERTA LOGIN ================= */

// GET /api/penilaian-akhir/me
export const getMyPenilaianAkhir = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || "").trim().toLowerCase();

    let penilaian: any = await PenilaianAkhir.findOne({ user: userId })
      .populate("mentor", "name nip")
      .lean();
    if (!penilaian && email) {
      penilaian = await PenilaianAkhir.findOne({
        pesertaEmail: email,
      })
        .populate("mentor", "name nip")
        .lean();
    }

    if (penilaian) {
      const emailRegex = email ? new RegExp(`^${escapeRegex(email)}$`, "i") : null;
      const [pendaftaran, absensiRecords, holidayDates] = await Promise.all([
        Pendaftaran.findOne({
          status: "Disetujui",
          $or: [
            { "peserta.user": userId },
            ...(emailRegex ? [{ "peserta.email": emailRegex }] : []),
          ],
        })
          .sort({ createdAt: -1 })
          .populate("peserta.mentor", "name email nip")
          .lean(),
        Absensi.find({
          $or: [
            { user: userId },
            ...(emailRegex ? [{ email: emailRegex }] : []),
          ],
        }).lean(),
        getHolidayDateSet(),
      ]);

      const ps = (pendaftaran as any)?.peserta?.find(
        (p: any) =>
          p.user?.toString() === String(userId) ||
          (email && p.email?.trim().toLowerCase() === email),
      );

      const calc = calculateFinalAttendanceScore(
        absensiRecords,
        ps?.tanggalMulaiMagang,
        ps?.tanggalSelesaiMagang,
        holidayDates,
      );

      const a1 = {
        nilai: calc.averageScore,
        keterangan: getPredikatFromNilai(calc.averageScore),
      };
      const a2Val = Number((penilaian as any).sikapKerja?.nilai ?? 0);
      const b1Val = Number((penilaian as any).penguasaanMateri?.nilai ?? 0);
      const b2Val = Number((penilaian as any).praktikKerja?.nilai ?? 0);
      const b3Val = Number((penilaian as any).inisiatifKomunikasi?.nilai ?? 0);
      const nilaiRataRata = Number(
        ((a1.nilai + a2Val + b1Val + b2Val + b3Val) / 5).toFixed(2),
      );

      const resolvedPenilaiNama =
        (penilaian as any).penilaiNama ||
        (penilaian as any).mentor?.name ||
        ps?.mentor?.name ||
        "";
      const resolvedPenilaiNip =
        (penilaian as any).penilaiNip?.trim() ||
        (penilaian as any).mentor?.nip ||
        ps?.mentor?.nip ||
        "";

      penilaian = {
        ...penilaian,
        penilaiNama: resolvedPenilaiNama,
        penilaiNip: resolvedPenilaiNip,
        kehadiranTaatJadwal: a1,
        nilaiRataRata,
        keteranganRataRata: getPredikatFromNilai(nilaiRataRata),
      };
    }

    return res.json({
      penilaian: penilaian || null,
    });
  } catch (err) {
    console.error("[GET MY PENILAIAN AKHIR ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat data penilaian akhir magang" });
  }
};

/* ================= GET DAFTAR PENILAIAN PESERTA (MENTOR / ADMIN / SUPERADMIN) ================= */

// GET /api/penilaian-akhir/mentor/list
export const getMentorPenilaianList = async (req: any, res: Response) => {
  try {
    const currentUserId = String(req.user.id);
    const roles = getRoleNames(req.user);
    const isAdminOrSuperadmin =
      roles.includes("admin") || roles.includes("superadmin");

    const pendaftaranFilter: any = { status: "Disetujui" };
    if (!isAdminOrSuperadmin) {
      pendaftaranFilter["peserta.mentor"] = currentUserId;
    }

    const pendaftaranList = await Pendaftaran.find(pendaftaranFilter)
      .populate("peserta.mentor", "name email posisiMentor nip")
      .lean();

    type FlatPeserta = {
      userId: string | null;
      nama: string;
      email: string;
      posisi: string;
      jurusan: string;
      asal: { jenis: string; nama: string } | null;
      tanggalMulaiMagang: string;
      tanggalSelesaiMagang: string;
      statusMagang: string;
      mentorName: string;
      mentorNip: string;
    };

    const flatList: FlatPeserta[] = [];
    const seenEmail = new Set<string>();

    for (const pend of pendaftaranList as any[]) {
      for (const ps of pend.peserta || []) {
        if (!isAdminOrSuperadmin) {
          const psMentorId = ps.mentor?._id
            ? ps.mentor._id.toString()
            : ps.mentor?.toString();
          if (psMentorId !== currentUserId) continue;
        }

        const emailLower = (ps.email || "").trim().toLowerCase();
        if (!emailLower || seenEmail.has(emailLower)) continue;
        seenEmail.add(emailLower);

        flatList.push({
          userId: ps.user ? ps.user.toString() : null,
          nama: ps.nama || "Peserta Magang",
          email: emailLower,
          posisi: ps.posisi || "-",
          jurusan: ps.jurusan || "-",
          asal: ps.asal
            ? {
                jenis: ps.asal.jenis || "",
                nama: ps.asal.nama || "",
              }
            : null,
          tanggalMulaiMagang: ps.tanggalMulaiMagang || "",
          tanggalSelesaiMagang: ps.tanggalSelesaiMagang || "",
          statusMagang: ps.statusMagang || "Sedang Magang",
          mentorName: ps.mentor?.name || "-",
          mentorNip: ps.mentor?.nip || "",
        });
      }
    }

    // Resolve User _id by email for any peserta whose ps.user is not linked
    const emails = flatList.map((p) => p.email);
    const matchedUsers = emails.length
      ? await User.find({
          email: {
            $in: emails.map((e) => new RegExp(`^${escapeRegex(e)}$`, "i")),
          },
        })
          .select("_id email")
          .lean()
      : [];

    const emailToUserId = new Map<string, string>();
    for (const u of matchedUsers as any[]) {
      if (u.email) {
        emailToUserId.set(u.email.toLowerCase(), u._id.toString());
      }
    }

    const resolvedUserIds = Array.from(
      new Set(
        flatList
          .map((p) => p.userId || emailToUserId.get(p.email))
          .filter((id): id is string =>
            Boolean(id && mongoose.Types.ObjectId.isValid(id)),
          ),
      ),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const hasAnyTarget = resolvedUserIds.length > 0 || emails.length > 0;
    const absensiMatchConditions: any[] = [];
    if (resolvedUserIds.length > 0) {
      absensiMatchConditions.push({ user: { $in: resolvedUserIds } });
    }
    if (emails.length > 0) {
      absensiMatchConditions.push({ email: { $in: emails } });
    }

    const [penilaianList, laporanList, allAbsensiDocs, holidayDates] = hasAnyTarget
      ? await Promise.all([
          PenilaianAkhir.find({
            $or: [
              ...(resolvedUserIds.length > 0
                ? [{ user: { $in: resolvedUserIds } }]
                : []),
              ...(emails.length > 0
                ? [{ pesertaEmail: { $in: emails } }]
                : []),
            ],
          }).lean(),
          resolvedUserIds.length > 0
            ? LaporanAkhir.find({ user: { $in: resolvedUserIds } })
                .select("user status")
                .lean()
            : Promise.resolve([]),
          Absensi.find({ $or: absensiMatchConditions }).lean(),
          getHolidayDateSet(),
        ])
      : [[], [], [], new Set<string>()];

    const penilaianByUserId = new Map<string, any>();
    const penilaianByEmail = new Map<string, any>();
    for (const pen of penilaianList as any[]) {
      if (pen.user) penilaianByUserId.set(pen.user.toString(), pen);
      if (pen.pesertaEmail)
        penilaianByEmail.set(pen.pesertaEmail.toLowerCase(), pen);
    }

    const laporanByUserId = new Map<string, string>();
    for (const lap of laporanList as any[]) {
      if (lap.user) laporanByUserId.set(lap.user.toString(), lap.status);
    }

    const absensiDocsByEmail = new Map<string, any[]>();
    const absensiDocsByUserId = new Map<string, any[]>();
    for (const rec of allAbsensiDocs as any[]) {
      const em = rec.email ? String(rec.email).trim().toLowerCase() : "";
      const uid = rec.user ? rec.user.toString() : "";
      if (em) {
        const list = absensiDocsByEmail.get(em) || [];
        list.push(rec);
        absensiDocsByEmail.set(em, list);
      }
      if (uid) {
        const list = absensiDocsByUserId.get(uid) || [];
        list.push(rec);
        absensiDocsByUserId.set(uid, list);
      }
    }

    const items = flatList.map((p) => {
      const uid = p.userId || emailToUserId.get(p.email) || null;
      const rawPen =
        (uid && penilaianByUserId.get(uid)) ||
        penilaianByEmail.get(p.email) ||
        null;

      const byEmailRecords = absensiDocsByEmail.get(p.email) || [];
      const byUidRecords = uid ? absensiDocsByUserId.get(uid) || [] : [];
      const mergedRecords = [...byEmailRecords, ...byUidRecords];

      const calc = calculateFinalAttendanceScore(
        mergedRecords,
        p.tanggalMulaiMagang,
        p.tanggalSelesaiMagang,
        holidayDates,
      );

      const absInfo = {
        totalHari: calc.totalHariHadir,
        totalHariKerja: calc.totalHariKerja,
        tidakAbsen: calc.tidakAbsen,
        cutoffEndIso: calc.cutoffEndIso,
        averageScore: calc.averageScore,
      };

      let pen = rawPen;
      if (rawPen) {
        const a1 = {
          nilai: calc.averageScore,
          keterangan: getPredikatFromNilai(calc.averageScore),
        };
        const a2Val = Number(rawPen.sikapKerja?.nilai ?? 0);
        const b1Val = Number(rawPen.penguasaanMateri?.nilai ?? 0);
        const b2Val = Number(rawPen.praktikKerja?.nilai ?? 0);
        const b3Val = Number(rawPen.inisiatifKomunikasi?.nilai ?? 0);
        const nilaiRataRata = Number(
          ((a1.nilai + a2Val + b1Val + b2Val + b3Val) / 5).toFixed(2),
        );
        pen = {
          ...rawPen,
          penilaiNip: rawPen.penilaiNip?.trim() || p.mentorNip || "",
          kehadiranTaatJadwal: a1,
          nilaiRataRata,
          keteranganRataRata: getPredikatFromNilai(nilaiRataRata),
        };
      }

      const ratingSchedule = getPenilaianAkhirSchedule(
        p.tanggalMulaiMagang,
        p.tanggalSelesaiMagang,
        p.statusMagang,
      );

      return {
        userId: uid,
        nama: p.nama,
        email: p.email,
        posisi: p.posisi,
        jurusan: p.jurusan,
        asal: p.asal,
        tanggalMulaiMagang: p.tanggalMulaiMagang,
        tanggalSelesaiMagang: p.tanggalSelesaiMagang,
        statusMagang: p.statusMagang,
        mentorName: p.mentorName,
        mentorNip: p.mentorNip,
        laporanStatus: uid ? laporanByUserId.get(uid) || null : null,
        absensiRef: absInfo,
        penilaianAkhir: pen,
        ratingSchedule,
      };
    });

    const dinilaiItems = items.filter((i) => Boolean(i.penilaianAkhir));
    const avgNilaiSum = dinilaiItems.reduce(
      (sum, i) => sum + (Number(i.penilaianAkhir?.nilaiRataRata) || 0),
      0,
    );

    return res.json({
      summary: {
        totalPeserta: items.length,
        sudahDinilai: dinilaiItems.length,
        belumDinilai: items.length - dinilaiItems.length,
        siapDinilai: items.filter(
          (i) => !i.penilaianAkhir && i.ratingSchedule.canRate,
        ).length,
        belumWaktunya: items.filter(
          (i) => !i.penilaianAkhir && i.ratingSchedule.reason === "too_early",
        ).length,
        rataRataNilai:
          dinilaiItems.length > 0
            ? Number((avgNilaiSum / dinilaiItems.length).toFixed(2))
            : null,
      },
      items,
    });
  } catch (err) {
    console.error("[GET MENTOR PENILAIAN LIST ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat daftar penilaian akhir peserta" });
  }
};

/* ================= SIMPAN / PERBARUI PENILAIAN AKHIR (MENTOR) ================= */

// PUT /api/penilaian-akhir/mentor/:pesertaUserId
export const upsertPenilaianAkhir = async (req: any, res: Response) => {
  try {
    const { pesertaUserId } = req.params;
    const currentUserId = String(req.user.id);
    const roles = getRoleNames(req.user);

    if (!roles.includes("mentor")) {
      return res.status(403).json({
        message:
          "Hanya Mentor pembimbing yang dapat mengisi atau mengubah nilai akhir magang.",
      });
    }

    if (!pesertaUserId || !mongoose.Types.ObjectId.isValid(pesertaUserId)) {
      return res.status(400).json({ message: "ID peserta tidak valid." });
    }

    const targetUser = await User.findById(pesertaUserId)
      .select("_id name email")
      .lean();
    if (!targetUser) {
      return res.status(404).json({ message: "Akun peserta tidak ditemukan." });
    }

    const targetEmailLower = (targetUser.email || "").trim().toLowerCase();

    // Verifikasi apakah peserta benar bimbingan mentor yang login
    const targetEmailRegex = targetEmailLower
      ? new RegExp(`^${escapeRegex(targetEmailLower)}$`, "i")
      : null;

    const pendaftaranList = await Pendaftaran.find({
      status: "Disetujui",
      "peserta.mentor": currentUserId,
    }).lean();

    let matchedMentee: any = null;
    for (const pend of pendaftaranList as any[]) {
      for (const ps of pend.peserta || []) {
        const psMentorId = ps.mentor ? ps.mentor.toString() : "";
        if (psMentorId !== currentUserId) continue;
        const psUserId = ps.user ? ps.user.toString() : "";
        const psEmail = (ps.email || "").trim().toLowerCase();
        if (
          psUserId === pesertaUserId ||
          (Boolean(targetEmailRegex) && psEmail === targetEmailLower)
        ) {
          matchedMentee = ps;
          break;
        }
      }
      if (matchedMentee) break;
    }

    if (!matchedMentee) {
      return res.status(403).json({
        message:
          "Anda tidak memiliki akses untuk menilai peserta yang bukan bimbingan Anda.",
      });
    }

    const ratingSchedule = getPenilaianAkhirSchedule(
      matchedMentee?.tanggalMulaiMagang,
      matchedMentee?.tanggalSelesaiMagang,
      matchedMentee?.statusMagang,
    );

    if (ratingSchedule.reason === "inactive") {
      return res.status(403).json({
        message:
          "Peserta berstatus Tidak Magang sehingga penilaian akhir tidak dapat diisi.",
      });
    }

    if (!ratingSchedule.canRate && ratingSchedule.openDateIso) {
      return res.status(403).json({
        message: `Pengisian Penilaian Akhir Magang hanya dibuka mulai H-3 sebelum selesai magang (${formatIsoIndo(ratingSchedule.openDateIso)}).`,
      });
    }

    // 1.A Kehadiran dan Taat Jadwal dikunci otomatis dari total nilai absensi dibagi seluruh hari kerja magang sampai H-3
    const absensiMatchOr: any[] = [
      { user: new mongoose.Types.ObjectId(pesertaUserId) },
    ];
    if (targetEmailRegex) {
      absensiMatchOr.push({ email: targetEmailRegex });
    }
    const [absensiDocs, holidayDates] = await Promise.all([
      Absensi.find({ $or: absensiMatchOr }).lean(),
      getHolidayDateSet(),
    ]);
    const attendanceCalc = calculateFinalAttendanceScore(
      absensiDocs,
      matchedMentee?.tanggalMulaiMagang,
      matchedMentee?.tanggalSelesaiMagang,
      holidayDates,
    );
    const autoKehadiranNilai = attendanceCalc.averageScore;
    const a1 = {
      nilai: autoKehadiranNilai,
      keterangan: getPredikatFromNilai(autoKehadiranNilai),
    };

    const a2 = parseAspectInput(req.body.sikapKerja, "1.B Sikap Kerja");
    if ("error" in a2) return res.status(400).json({ message: a2.error });

    const b1 = parseAspectInput(
      req.body.penguasaanMateri,
      "2.A Penguasaan Materi",
    );
    if ("error" in b1) return res.status(400).json({ message: b1.error });

    const b2 = parseAspectInput(req.body.praktikKerja, "2.B Praktik Kerja");
    if ("error" in b2) return res.status(400).json({ message: b2.error });

    const b3 = parseAspectInput(
      req.body.inisiatifKomunikasi,
      "2.C Inisiatif dan Hubungan Kerja/Komunikasi",
    );
    if ("error" in b3) return res.status(400).json({ message: b3.error });

    const nilaiRataRata = Number(
      ((a1.nilai + a2.nilai + b1.nilai + b2.nilai + b3.nilai) / 5).toFixed(2),
    );
    const rawKetRata =
      typeof req.body.keteranganRataRata === "string"
        ? req.body.keteranganRataRata.trim()
        : "";
    const keteranganRataRata =
      rawKetRata || getPredikatFromNilai(nilaiRataRata);

    const penilaiUser = await User.findById(currentUserId)
      .select("name nip")
      .lean();
    const penilaiNama = penilaiUser?.name || req.user?.name || "Pembimbing";
    const penilaiNip = ((penilaiUser as any)?.nip || "").trim();
    const penilaiTtdImage =
      typeof req.body.penilaiTtdImage === "string"
        ? req.body.penilaiTtdImage.trim()
        : "";

    if (penilaiTtdImage) {
      if (!penilaiTtdImage.startsWith("data:image/png;base64,")) {
        return res.status(400).json({
          message: "Gambar tanda tangan (TTD) harus berformat PNG (.png).",
        });
      }
      if (penilaiTtdImage.length > 3 * 1024 * 1024) {
        return res.status(400).json({
          message: "Ukuran file tanda tangan (TTD) maksimal 2 MB.",
        });
      }
    }

    const kesan = typeof req.body.kesan === "string" ? req.body.kesan.trim() : "";
    const saran = typeof req.body.saran === "string" ? req.body.saran.trim() : "";

    const saved = await PenilaianAkhir.findOneAndUpdate(
      { user: pesertaUserId },
      {
        $set: {
          user: pesertaUserId,
          pesertaEmail: targetEmailLower,
          mentor: currentUserId,
          penilaiNama,
          penilaiNip,
          penilaiTtdImage,
          kehadiranTaatJadwal: a1,
          sikapKerja: a2,
          penguasaanMateri: b1,
          praktikKerja: b2,
          inisiatifKomunikasi: b3,
          nilaiRataRata,
          keteranganRataRata,
          kesan,
          saran,
          tanggalPenilaian: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    createNotification({
      recipientId: pesertaUserId,
      title: "Nilai Akhir Magang Tersedia",
      message: `Mentor telah mengisi nilai akhir magang Anda (Nilai rata-rata: ${nilaiRataRata} - ${keteranganRataRata}).`,
      type: "success",
      linkUrl: "/dashboard/peserta/penilaian-akhir",
    });

    return res.json({
      success: true,
      message: "Penilaian Akhir Magang berhasil disimpan.",
      penilaian: saved,
    });
  } catch (err) {
    console.error("[UPSERT PENILAIAN AKHIR ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan penilaian akhir magang" });
  }
};
