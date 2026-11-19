import { Response } from "express";
import mongoose from "mongoose";
import EvaluasiMagang from "../models/EvaluasiMagang";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { resolveKategoriMagang } from "../utils/pesertaKategori";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRoleNames(user: any): string[] {
  const raw = user?.roles;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => (typeof r === "string" ? r : r?.name || ""))
    .map((s: string) => s.toLowerCase())
    .filter(Boolean);
}

function isValidRating(val: unknown): val is number {
  return (
    typeof val === "number" &&
    Number.isInteger(val) &&
    val >= 1 &&
    val <= 5
  );
}

function parseAndValidateEvaluasiBody(body: any):
  | {
      data: {
        fasilitator: {
          nama: string;
          judulMateri: string;
          skor1: number;
          skor2: number;
          skor3: number;
          skor4: number;
          skor5: number;
          adaSaran: "Ya" | "Tidak";
          saran: string;
        };
        penyelenggara: {
          skor1: number;
          skor2: number;
          skor3: number;
          skor4: number;
          skor5: number;
          bermanfaat: "Ya" | "Tidak";
          adaMasukan: "Ya" | "Tidak";
          masukan: string;
        };
        suratPernyataan: {
          nama: string;
          nim: string;
          programPendidikan: string;
          universitas: string;
          tanggalSurat: string;
          ttdImage: string;
        };
      };
    }
  | { error: string } {
  const { fasilitator, penyelenggara, suratPernyataan } = body || {};

  if (!fasilitator || !penyelenggara || !suratPernyataan) {
    return { error: "Data evaluasi dan surat pernyataan belum lengkap" };
  }

  const fNama = String(fasilitator.nama || "").trim();
  const fJudul = String(fasilitator.judulMateri || "").trim();
  if (!fNama) {
    return { error: "Nama fasilitator/pembimbing wajib diisi" };
  }

  const fScores = [
    Number(fasilitator.skor1),
    Number(fasilitator.skor2),
    Number(fasilitator.skor3),
    Number(fasilitator.skor4),
    Number(fasilitator.skor5),
  ];
  if (fScores.some((s) => !isValidRating(s))) {
    return {
      error: "Seluruh penilaian fasilitator/pembimbing (1–5) wajib diisi",
    };
  }

  const adaSaran = fasilitator.adaSaran === "Tidak" ? "Tidak" : "Ya";
  const fSaran = String(fasilitator.saran || "").trim();
  if (adaSaran === "Ya" && !fSaran) {
    return { error: "Mohon isi saran/masukan untuk fasilitator/pembimbing" };
  }

  const pScores = [
    Number(penyelenggara.skor1),
    Number(penyelenggara.skor2),
    Number(penyelenggara.skor3),
    Number(penyelenggara.skor4),
    Number(penyelenggara.skor5),
  ];
  if (pScores.some((s) => !isValidRating(s))) {
    return { error: "Seluruh penilaian penyelenggara (1–5) wajib diisi" };
  }

  const bermanfaat = penyelenggara.bermanfaat === "Tidak" ? "Tidak" : "Ya";
  const adaMasukan = penyelenggara.adaMasukan === "Tidak" ? "Tidak" : "Ya";
  const pMasukan = String(penyelenggara.masukan || "").trim();
  if (adaMasukan === "Ya" && !pMasukan) {
    return { error: "Mohon isi masukan untuk penyelenggara" };
  }

  const spNama = String(suratPernyataan.nama || "").trim();
  const spNim = String(suratPernyataan.nim || "").trim();
  const spProdi = String(suratPernyataan.programPendidikan || "").trim();
  const spUniv = String(suratPernyataan.universitas || "").trim();
  const spTanggal = String(suratPernyataan.tanggalSurat || "").trim();
  const spTtdImage =
    typeof suratPernyataan.ttdImage === "string"
      ? suratPernyataan.ttdImage.trim()
      : "";

  if (!spNama || !spNim || !spProdi || !spUniv || !spTanggal) {
    return {
      error:
        "Seluruh data Surat Pernyataan (Nama, NIM, Program Pendidikan, Universitas, dan Tanggal) wajib diisi",
    };
  }

  if (spTtdImage) {
    if (!spTtdImage.startsWith("data:image/png;base64,")) {
      return {
        error: "Foto tanda tangan (TTD) harus berformat PNG (.png)",
      };
    }
    if (spTtdImage.length > 3 * 1024 * 1024) {
      return {
        error: "Ukuran file foto tanda tangan (TTD) terlalu besar (maks. 2 MB)",
      };
    }
  }

  return {
    data: {
      fasilitator: {
        nama: fNama,
        judulMateri: fJudul,
        skor1: fScores[0],
        skor2: fScores[1],
        skor3: fScores[2],
        skor4: fScores[3],
        skor5: fScores[4],
        adaSaran,
        saran: adaSaran === "Ya" ? fSaran : "",
      },
      penyelenggara: {
        skor1: pScores[0],
        skor2: pScores[1],
        skor3: pScores[2],
        skor4: pScores[3],
        skor5: pScores[4],
        bermanfaat,
        adaMasukan,
        masukan: adaMasukan === "Ya" ? pMasukan : "",
      },
      suratPernyataan: {
        nama: spNama,
        nim: spNim,
        programPendidikan: spProdi,
        universitas: spUniv,
        tanggalSurat: spTanggal,
        ttdImage: spTtdImage,
      },
    },
  };
}

// GET /api/evaluasi/me
export const getMyEvaluasi = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || "").trim().toLowerCase();

    let doc: any = await EvaluasiMagang.findOne({ user: userId })
      .populate("reviewedBy", "name")
      .lean();
    if (!doc && email) {
      doc = await EvaluasiMagang.findOne({ email })
        .populate("reviewedBy", "name")
        .lean();
    }

    if (doc && !doc.status) {
      doc = { ...doc, status: "Menunggu" };
    }

    return res.json({ evaluasi: doc || null });
  } catch (err) {
    console.error("[GET MY EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat data evaluasi & surat pernyataan" });
  }
};

// PUT /api/evaluasi/me
export const upsertMyEvaluasi = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || "").trim().toLowerCase();

    let existing: any = await EvaluasiMagang.findOne({ user: userId }).lean();
    if (!existing && email) {
      existing = await EvaluasiMagang.findOne({ email }).lean();
    }

    if (existing) {
      const currentStatus = existing.status || "Menunggu";
      if (currentStatus === "Menunggu") {
        return res.status(403).json({
          message:
            "Evaluasi & Surat Pernyataan sudah dikirim dan sedang menunggu penindakan mentor pembimbing.",
        });
      }
      if (currentStatus === "Disetujui") {
        return res.status(403).json({
          message:
            "Evaluasi & Surat Pernyataan sudah disetujui oleh mentor dan tidak dapat diubah lagi.",
        });
      }
    }

    const parsed = parseAndValidateEvaluasiBody(req.body);
    if ("error" in parsed) {
      return res.status(400).json({ message: parsed.error });
    }

    const saved = await EvaluasiMagang.findOneAndUpdate(
      existing ? { _id: existing._id } : { user: userId },
      {
        $set: {
          user: userId,
          email,
          ...parsed.data,
          status: "Menunggu",
          mentorNote: "",
          reviewedBy: null,
          reviewedByName: "",
          reviewedAt: null,
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return res.json({
      success: true,
      message: existing
        ? "Revisi Evaluasi & Surat Pernyataan berhasil dikirim ulang dan menunggu penindakan mentor."
        : "Evaluasi & Surat Pernyataan berhasil dikirim dan menunggu penindakan mentor.",
      evaluasi: saved,
    });
  } catch (err) {
    console.error("[UPSERT EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan data evaluasi & surat pernyataan" });
  }
};

// GET /api/evaluasi/manage (Mentor, Admin, Superadmin)
export const getManageEvaluasiList = async (req: any, res: Response) => {
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
      .populate("peserta.mentor", "name email")
      .lean();

    type FlatPeserta = {
      userId: string | null;
      nama: string;
      email: string;
      posisi: string;
      jurusan: string;
      kategoriMagang: string;
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
          kategoriMagang: resolveKategoriMagang(ps.jurusan, ps.kategoriMagang),
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

    const evaluasiDocs =
      resolvedUserIds.length > 0 || emails.length > 0
        ? await EvaluasiMagang.find({
            $or: [
              ...(resolvedUserIds.length > 0
                ? [{ user: { $in: resolvedUserIds } }]
                : []),
              ...(emails.length > 0 ? [{ email: { $in: emails } }] : []),
            ],
          })
            .populate("reviewedBy", "name")
            .lean()
        : [];

    const evalByUserId = new Map<string, any>();
    const evalByEmail = new Map<string, any>();
    for (const ev of evaluasiDocs as any[]) {
      const normalized = {
        ...ev,
        status: ev.status || "Menunggu",
      };
      if (ev.user) evalByUserId.set(ev.user.toString(), normalized);
      if (ev.email) evalByEmail.set(String(ev.email).toLowerCase(), normalized);
    }

    const items = flatList.map((p) => {
      const uid = p.userId || emailToUserId.get(p.email) || null;
      const ev =
        (uid && evalByUserId.get(uid)) || evalByEmail.get(p.email) || null;
      return {
        ...p,
        userId: uid,
        evaluasi: ev,
      };
    });

    const summary = {
      totalPeserta: items.length,
      belumMengisi: items.filter((i) => !i.evaluasi).length,
      menunggu: items.filter((i) => i.evaluasi?.status === "Menunggu").length,
      revisi: items.filter((i) => i.evaluasi?.status === "Revisi").length,
      disetujui: items.filter((i) => i.evaluasi?.status === "Disetujui").length,
    };

    return res.json({ summary, items });
  } catch (err) {
    console.error("[GET MANAGE EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memuat daftar evaluasi & surat pernyataan" });
  }
};

// PATCH /api/evaluasi/:id/review (Khusus Mentor Pembimbing)
export const reviewEvaluasi = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status, mentorNote } = req.body || {};
    const currentUserId = String(req.user.id);
    const roles = getRoleNames(req.user);

    if (!roles.includes("mentor")) {
      return res.status(403).json({
        message:
          "Hanya Mentor pembimbing yang dapat menyetujui atau meminta revisi Evaluasi & Surat Pernyataan.",
      });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID evaluasi tidak valid" });
    }

    if (status !== "Disetujui" && status !== "Revisi") {
      return res.status(400).json({
        message: "Status penindakan harus 'Disetujui' atau 'Revisi'",
      });
    }

    const cleanNote = typeof mentorNote === "string" ? mentorNote.trim() : "";
    if (status === "Revisi" && !cleanNote) {
      return res.status(400).json({
        message: "Catatan revisi wajib diisi agar peserta tahu hal yang harus diperbaiki.",
      });
    }

    const doc: any = await EvaluasiMagang.findById(id);
    if (!doc) {
      return res
        .status(404)
        .json({ message: "Data evaluasi & surat pernyataan tidak ditemukan" });
    }

    const targetEmail = (doc.email || "").trim().toLowerCase();
    const emailRegex = targetEmail
      ? new RegExp(`^${escapeRegex(targetEmail)}$`, "i")
      : null;

    const pendaftaran = await Pendaftaran.findOne({
      status: "Disetujui",
      "peserta.mentor": currentUserId,
      $or: [
        { "peserta.user": doc.user },
        ...(emailRegex ? [{ "peserta.email": emailRegex }] : []),
      ],
    }).lean();

    const validMentee = (pendaftaran as any)?.peserta?.some((ps: any) => {
      const psMentorId = ps.mentor ? ps.mentor.toString() : "";
      if (psMentorId !== currentUserId) return false;
      const psUserId = ps.user ? ps.user.toString() : "";
      const psEmail = (ps.email || "").trim().toLowerCase();
      return (
        psUserId === String(doc.user) ||
        (Boolean(targetEmail) && psEmail === targetEmail)
      );
    });

    if (!validMentee) {
      return res.status(403).json({
        message:
          "Anda tidak memiliki akses untuk menindak evaluasi peserta yang bukan bimbingan Anda.",
      });
    }

    const reviewer = await User.findById(currentUserId).select("name").lean();
    doc.status = status;
    doc.mentorNote = cleanNote;
    doc.reviewedBy = currentUserId;
    doc.reviewedByName = reviewer?.name || req.user?.name || "Pembimbing";
    doc.reviewedAt = new Date();
    await doc.save();

    return res.json({
      success: true,
      message:
        status === "Disetujui"
          ? "Evaluasi & Surat Pernyataan berhasil disetujui. Peserta kini dapat mengunduh PDF."
          : "Permintaan revisi berhasil dikirim ke peserta.",
      evaluasi: doc,
    });
  } catch (err) {
    console.error("[REVIEW EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memproses penindakan evaluasi" });
  }
};

// PUT /api/evaluasi/:id (Admin & Superadmin mengelola data isian tanpa mengubah status persetujuan mentor)
export const adminUpdateEvaluasi = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID evaluasi tidak valid" });
    }

    const existing = await EvaluasiMagang.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ message: "Data evaluasi & surat pernyataan tidak ditemukan" });
    }

    const parsed = parseAndValidateEvaluasiBody(req.body);
    if ("error" in parsed) {
      return res.status(400).json({ message: parsed.error });
    }

    existing.fasilitator = parsed.data.fasilitator as any;
    existing.penyelenggara = parsed.data.penyelenggara as any;
    existing.suratPernyataan = parsed.data.suratPernyataan as any;

    await existing.save();

    return res.json({
      success: true,
      message: "Data Evaluasi & Surat Pernyataan berhasil diperbarui.",
      evaluasi: existing,
    });
  } catch (err) {
    console.error("[ADMIN UPDATE EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal memperbarui data evaluasi & surat pernyataan" });
  }
};

// DELETE /api/evaluasi/:id (Admin & Superadmin reset/hapus data)
export const adminDeleteEvaluasi = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID evaluasi tidak valid" });
    }

    const deleted = await EvaluasiMagang.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Data evaluasi & surat pernyataan tidak ditemukan" });
    }

    return res.json({
      success: true,
      message:
        "Data Evaluasi & Surat Pernyataan berhasil dihapus. Peserta dapat mengisi ulang dari awal.",
    });
  } catch (err) {
    console.error("[ADMIN DELETE EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menghapus data evaluasi & surat pernyataan" });
  }
};
