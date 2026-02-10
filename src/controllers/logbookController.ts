import { Request, Response } from "express";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User"; // ✅ TAMBAH IMPORT INI
import mongoose from "mongoose"; // ✅ TAMBAHKAN IMPORT INI
import PDFDocument from "pdfkit";

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

    const uploaded = req.files as {
      files?: Express.Multer.File[];
      pdfFile?: Express.Multer.File[];
    };

    const images: string[] = [];
    let pdfFile: string | null = null;

    // FOTO
    uploaded?.files?.forEach((f) => {
      images.push(`uploads/logbook/image/${f.filename}`);
    });

    // PDF
    if (uploaded?.pdfFile?.[0]) {
      pdfFile = `uploads/logbook/pdf/${uploaded.pdfFile[0].filename}`;
    }

    const logbook = await Logbook.create({
      user: userId,
      ...req.body,
      files: images,
      pdfFile,
      approvalStatus: "menunggu",
      approvedByMentor: false,
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

    const logs = await Logbook.find({ user: userId }).select(
      "date status approvalStatus",
    );

    const result: Record<string, { status: string; approvalStatus: string }> =
      {};

    logs.forEach((l) => {
      result[l.date] = {
        status: l.status,
        approvalStatus: l.approvalStatus || "menunggu",
      };
    });

    res.json(result);
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

  // ✅ HADIR VALID (DISSETUJUI)
  const hadir = await Logbook.countDocuments({
    user: userId,
    status: "hadir",
    approvalStatus: "disetujui",
  });

  // ❌ TIDAK HADIR (KETERANGAN)
  const tidakHadirDenganKeterangan = await Logbook.countDocuments({
    user: userId,
    status: "tidak_hadir_keterangan",
    approvalStatus: "disetujui",
  });

  // ❌ TIDAK HADIR (TANPA KETERANGAN)
  const tidakHadirTanpaKeterangan = await Logbook.countDocuments({
    user: userId,
    status: "tidak_hadir_tanpa_keterangan",
    approvalStatus: "disetujui",
  });

  // ⛔ DITOLAK MENTOR (SEMUA STATUS)
  const ditolak = await Logbook.countDocuments({
    user: userId,
    approvalStatus: "ditolak",
  });

  res.json({
    total,
    hadir,
    tidakHadirDenganKeterangan,
    tidakHadirTanpaKeterangan,
    ditolak,
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

      // ✅ TAMBAH INI
      pdfFile: logbook.pdfFile,

      approvedByMentor: logbook.approvedByMentor,
      mentorNote: logbook.mentorNote,
      approvalStatus: logbook.approvalStatus || "menunggu",
      approvedAt: logbook.approvedAt,
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

    // 🔥 VALIDASI: Pastikan userId valid
    if (
      !userId ||
      userId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    // Cari peserta untuk validasi
    const peserta = await User.findById(userId);
    if (!peserta) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    // 🔒 Pastikan peserta ini milik mentor
    const valid = await Pendaftaran.findOne({
      "peserta.email": peserta.email,
      "peserta.mentor": mentorId,
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

/* ===== GET LOGBOOK PESERTA BY DATE - KASIH INFO FINAL ===== */
export const getLogbookPesertaByDate = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { userId, date } = req.params;

    // Validasi
    if (!userId || userId === "undefined") {
      return res.status(400).json({
        message: "User ID tidak valid",
      });
    }

    // Cari peserta
    const peserta = await User.findById(userId);
    if (!peserta) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    // Validasi mentor
    const valid = await Pendaftaran.findOne({
      "peserta.email": peserta.email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda tidak berhak mengakses logbook peserta ini",
      });
    }

    // Cari logbook
    const logbook = await Logbook.findOne({
      user: userId,
      date,
    }).populate("approvedBy", "name email");

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    res.json({
      ...logbook.toObject(),
      canBeEdited:
        !logbook.isFinalized && logbook.approvalStatus === "menunggu",
    });
  } catch (err) {
    console.error("[GET LOGBOOK PESERTA BY DATE]", err);
    res.status(500).json({
      message: "Gagal mengambil logbook peserta",
    });
  }
};

/* ===== APPROVE LOGBOOK (MENTOR) - HANYA SEKALI ===== */
export const approveLogbook = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approvalStatus, mentorNote } = req.body;
    const mentorId = (req as any).user.id;

    // Cari logbook
    const logbook = await Logbook.findById(id).populate("user", "name email");

    if (!logbook) {
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    // 🔥 CEK 1: Apakah sudah difinalisasi (hanya sekali)
    if (logbook.isFinalized) {
      return res.status(400).json({
        message: "Logbook sudah diproses dan tidak dapat diubah lagi",
        currentStatus: logbook.approvalStatus,
        finalizedAt: logbook.finalizedAt,
      });
    }

    // 🔥 CEK 2: Apakah sudah ada status (selain menunggu)
    if (logbook.approvalStatus !== "menunggu") {
      return res.status(400).json({
        message: `Logbook sudah ${logbook.approvalStatus === "disetujui" ? "disetujui" : "ditolak"} sebelumnya`,
        currentStatus: logbook.approvalStatus,
        approvedAt: logbook.approvedAt,
      });
    }

    // 🔥 VALIDASI: Hanya mentor yang bisa approve logbook peserta bimbingannya
    const isMentorOfPeserta = await Pendaftaran.findOne({
      "peserta.email": (logbook.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!isMentorOfPeserta) {
      return res.status(403).json({
        message: "Anda tidak berhak mengubah status logbook peserta ini",
      });
    }

    // 🔥 UPDATE STATUS DENGAN FINALIZATION
    logbook.approvalStatus = approvalStatus;
    logbook.mentorNote = mentorNote || "";
    logbook.approvedByMentor = approvalStatus === "disetujui";
    logbook.approvedAt = new Date();
    logbook.approvedBy = mentorId;

    // 🔥 TANDAI SUDAH FINAL (HANYA SEKALI)
    logbook.isFinalized = true;
    logbook.finalizedAt = new Date();

    await logbook.save();

    // 🔥 RESPONSE
    const message =
      approvalStatus === "disetujui"
        ? "Logbook berhasil disetujui"
        : approvalStatus === "ditolak"
          ? "Logbook berhasil ditolak"
          : "Status logbook diubah";

    res.json({
      success: true,
      message,
      logbook: {
        ...logbook.toObject(),
        approvalStatus,
        approvedByMentor: logbook.approvedByMentor,
        mentorNote: logbook.mentorNote,
        isFinalized: true,
        finalizedAt: logbook.finalizedAt,
      },
    });
  } catch (err) {
    console.error("[APPROVE LOGBOOK]", err);
    res.status(500).json({
      success: false,
      message: "Gagal memproses logbook",
    });
  }
};

/* ===== GET LOGBOOK BY PESERTA EMAIL ===== */
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

    // Cari user dengan email tersebut
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // ambil logbook berdasarkan user ID
    const logs = await Logbook.find({ user: user._id }).sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Gagal mengambil logbook peserta",
    });
  }
};
