import { Request, Response } from "express";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";

/* ================= CREATE ================= */
export const createLogbook = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const exists = await Logbook.findOne({
      user: userId,
      date: req.body.date,
    });

    if (exists) {
      return res.status(400).json({
        message: "Logbook untuk tanggal ini sudah diisi",
      });
    }

    const files =
      (req.files as Express.Multer.File[])?.map(
        (f) => `uploads/logbook/${f.filename}`,
      ) || [];

    const logbook = await Logbook.create({
      user: userId,
      ...req.body,
      files,
    });

    res.status(201).json(logbook);
  } catch (err) {
    res.status(500).json({ message: "Gagal menyimpan logbook" });
  }
};

/* ================= GET FILLED DATES ================= */
export const getFilledDates = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const logs = await Logbook.find({ user: userId }).select("date status");

    const result: Record<string, string> = {};
    logs.forEach((l) => {
      result[l.date] = l.status;
    });

    res.json(result); // ⬅️ OBJECT, BUKAN ARRAY
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil tanggal logbook",
    });
  }
};

/* ================= SUMMARY ================= */
export const getSummary = async (req: any, res: Response) => {
  const userId = req.user.id;

  const total = await Logbook.countDocuments({ user: userId });
  const hadir = await Logbook.countDocuments({
    user: userId,
    status: "hadir",
  });

  const tidakHadirDenganKeterangan = await Logbook.countDocuments({
    user: userId,
    status: "tidak_hadir_keterangan",
  });

  const tidakHadirTanpaKeterangan = await Logbook.countDocuments({
    user: userId,
    status: "tidak_hadir_tanpa_keterangan",
  });

  res.json({
    total,
    hadir,
    tidakHadirDenganKeterangan,
    tidakHadirTanpaKeterangan,
  });
};
/* ================= GET LOGBOOK BY DATE ================= */
export const getLogbookByDate = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { date } = req.params;

    const logbook = await Logbook.findOne({
      user: userId,
      date,
    });

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    res.json({
      status: logbook.status,
      judul: logbook.judul,
      pengalaman: logbook.pengalaman,
      kendala: logbook.kendala,
      keterangan: logbook.keterangan,
      files: logbook.files,

      // ✅ TAMBAHAN
      approvedByMentor: logbook.approvedByMentor,
      mentorNote: logbook.mentorNote, // ✅ TAMBAHAN
    });
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil detail logbook",
    });
  }
};

/* ===== GET LOGBOOK PESERTA (MENTOR) ===== */
export const getLogbookByPeserta = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { userId } = req.params;

    // 🔒 pastikan peserta ini milik mentor
    const valid = await Pendaftaran.findOne({
      "peserta.mentor": mentorId,
      peserta: {
        $elemMatch: { email: { $exists: true } },
      },
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    const logs = await Logbook.find({ user: userId }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil logbook peserta" });
  }
};

export const getLogbookPesertaByDate = async (req: any, res: Response) => {
  try {
    const { userId, date } = req.params;

    const logbook = await Logbook.findOne({
      user: userId,
      date,
    });

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    res.json(logbook);
  } catch (err) {
    console.error("[GET LOGBOOK PESERTA BY DATE]", err);
    res.status(500).json({
      message: "Gagal mengambil logbook peserta",
    });
  }
};

/* ===== APPROVE LOGBOOK (MENTOR) ===== */
export const approveLogbook = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedByMentor, mentorNote } = req.body;

    const logbook = await Logbook.findById(id);

    if (!logbook) {
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    logbook.approvedByMentor = approvedByMentor;
    logbook.mentorNote = mentorNote || "";

    await logbook.save();

    res.json({
      message: approvedByMentor
        ? "Logbook disetujui mentor"
        : "Logbook ditolak mentor",
      logbook,
    });
  } catch (err) {
    console.error("[APPROVE LOGBOOK]", err);
    res.status(500).json({ message: "Gagal memproses logbook" });
  }
};

export const getLogbookByPesertaByEmail = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { email } = req.params;

    // cari user berdasarkan email
    const peserta = await Pendaftaran.findOne({
      "peserta.email": email,
      "peserta.mentor": mentorId,
    });

    if (!peserta) {
      return res.status(403).json({
        message: "Peserta bukan bimbingan Anda",
      });
    }

    // ambil logbook via email → USER ID (kalau ada)
    const logs = await Logbook.find({ email }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil logbook peserta",
    });
  }
};
