import { Response } from "express";
import EvaluasiMagang from "../models/EvaluasiMagang";

function isValidRating(val: unknown): val is number {
  return (
    typeof val === "number" &&
    Number.isInteger(val) &&
    val >= 1 &&
    val <= 5
  );
}

// GET /api/evaluasi/me
export const getMyEvaluasi = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const email = (req.user.email || "").trim().toLowerCase();

    let doc = await EvaluasiMagang.findOne({ user: userId }).lean();
    if (!doc && email) {
      doc = await EvaluasiMagang.findOne({ email }).lean();
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
    const { fasilitator, penyelenggara, suratPernyataan } = req.body || {};

    if (!fasilitator || !penyelenggara || !suratPernyataan) {
      return res
        .status(400)
        .json({ message: "Data evaluasi dan surat pernyataan belum lengkap" });
    }

    const fNama = String(fasilitator.nama || "").trim();
    const fJudul = String(fasilitator.judulMateri || "").trim();
    if (!fNama) {
      return res
        .status(400)
        .json({ message: "Nama fasilitator/pembimbing wajib diisi" });
    }

    const fScores = [
      Number(fasilitator.skor1),
      Number(fasilitator.skor2),
      Number(fasilitator.skor3),
      Number(fasilitator.skor4),
      Number(fasilitator.skor5),
    ];
    if (fScores.some((s) => !isValidRating(s))) {
      return res.status(400).json({
        message: "Seluruh penilaian fasilitator/pembimbing (1–5) wajib diisi",
      });
    }

    const adaSaran = fasilitator.adaSaran === "Tidak" ? "Tidak" : "Ya";
    const fSaran = String(fasilitator.saran || "").trim();
    if (adaSaran === "Ya" && !fSaran) {
      return res.status(400).json({
        message: "Mohon isi saran/masukan untuk fasilitator/pembimbing",
      });
    }

    const pScores = [
      Number(penyelenggara.skor1),
      Number(penyelenggara.skor2),
      Number(penyelenggara.skor3),
      Number(penyelenggara.skor4),
      Number(penyelenggara.skor5),
    ];
    if (pScores.some((s) => !isValidRating(s))) {
      return res.status(400).json({
        message: "Seluruh penilaian penyelenggara (1–5) wajib diisi",
      });
    }

    const bermanfaat = penyelenggara.bermanfaat === "Tidak" ? "Tidak" : "Ya";
    const adaMasukan = penyelenggara.adaMasukan === "Tidak" ? "Tidak" : "Ya";
    const pMasukan = String(penyelenggara.masukan || "").trim();
    if (adaMasukan === "Ya" && !pMasukan) {
      return res.status(400).json({
        message: "Mohon isi masukan untuk penyelenggara",
      });
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
      return res.status(400).json({
        message:
          "Seluruh data Surat Pernyataan (Nama, NIM, Program Pendidikan, Universitas, dan Tanggal) wajib diisi",
      });
    }

    if (spTtdImage) {
      if (!spTtdImage.startsWith("data:image/png;base64,")) {
        return res.status(400).json({
          message: "Foto tanda tangan (TTD) harus berformat PNG (.png)",
        });
      }
      if (spTtdImage.length > 3 * 1024 * 1024) {
        return res.status(400).json({
          message: "Ukuran file foto tanda tangan (TTD) terlalu besar (maks. 2 MB)",
        });
      }
    }

    const saved = await EvaluasiMagang.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          user: userId,
          email,
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
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return res.json({
      success: true,
      message: "Data Evaluasi & Surat Pernyataan berhasil disimpan",
      evaluasi: saved,
    });
  } catch (err) {
    console.error("[UPSERT EVALUASI ERROR]", err);
    return res
      .status(500)
      .json({ message: "Gagal menyimpan data evaluasi & surat pernyataan" });
  }
};
