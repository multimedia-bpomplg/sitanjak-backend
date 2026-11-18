import { Response } from "express";
import mongoose from "mongoose";
import PenilaianAkhir from "../models/PenilaianAkhir";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import LaporanAkhir from "../models/LaporanAkhir";
import Absensi from "../models/Absensi";

/* ================= HELPERS ================= */

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

    let penilaian = await PenilaianAkhir.findOne({ user: userId }).lean();
    if (!penilaian && email) {
      penilaian = await PenilaianAkhir.findOne({
        pesertaEmail: email,
      }).lean();
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
      .populate("peserta.mentor", "name email posisiMentor")
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

    const [penilaianList, laporanList, absensiAgg] = resolvedUserIds.length
      ? await Promise.all([
          PenilaianAkhir.find({
            $or: [
              { user: { $in: resolvedUserIds } },
              { pesertaEmail: { $in: emails } },
            ],
          }).lean(),
          LaporanAkhir.find({ user: { $in: resolvedUserIds } })
            .select("user status")
            .lean(),
          Absensi.aggregate([
            {
              $match: {
                $or: [
                  { user: { $in: resolvedUserIds } },
                  { email: { $in: emails } },
                ],
              },
            },
            {
              $group: {
                _id: "$email",
                totalHari: { $sum: 1 },
                avgDailyScore: { $avg: "$dailyScore" },
              },
            },
          ]),
        ])
      : [[], [], []];

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

    const absensiByEmail = new Map<
      string,
      { totalHari: number; averageScore: number }
    >();
    for (const agg of absensiAgg as any[]) {
      if (agg._id) {
        absensiByEmail.set(String(agg._id).toLowerCase(), {
          totalHari: agg.totalHari || 0,
          averageScore:
            typeof agg.avgDailyScore === "number"
              ? Math.round(agg.avgDailyScore)
              : 0,
        });
      }
    }

    const items = flatList.map((p) => {
      const uid = p.userId || emailToUserId.get(p.email) || null;
      const pen =
        (uid && penilaianByUserId.get(uid)) ||
        penilaianByEmail.get(p.email) ||
        null;
      const absInfo = absensiByEmail.get(p.email) || {
        totalHari: 0,
        averageScore: null,
      };

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
        laporanStatus: uid ? laporanByUserId.get(uid) || null : null,
        absensiRef: absInfo,
        penilaianAkhir: pen,
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

    const isMentee = pendaftaranList.some((pend: any) =>
      (pend.peserta || []).some((ps: any) => {
        const psMentorId = ps.mentor ? ps.mentor.toString() : "";
        if (psMentorId !== currentUserId) return false;
        const psUserId = ps.user ? ps.user.toString() : "";
        const psEmail = (ps.email || "").trim().toLowerCase();
        return (
          psUserId === pesertaUserId ||
          (Boolean(targetEmailRegex) && psEmail === targetEmailLower)
        );
      }),
    );

    if (!isMentee) {
      return res.status(403).json({
        message:
          "Anda tidak memiliki akses untuk menilai peserta yang bukan bimbingan Anda.",
      });
    }

    // Validasi 5 komponen nilai
    const a1 = parseAspectInput(
      req.body.kehadiranTaatJadwal,
      "1.A Kehadiran dan Taat Jadwal",
    );
    if ("error" in a1) return res.status(400).json({ message: a1.error });

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
    const penilaiNip =
      typeof req.body.penilaiNip === "string" && req.body.penilaiNip.trim()
        ? req.body.penilaiNip.trim()
        : (penilaiUser as any)?.nip || "";
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
