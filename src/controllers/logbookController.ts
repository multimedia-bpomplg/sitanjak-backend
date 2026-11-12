import { Request, Response } from "express";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User"; // ✅ TAMBAH IMPORT INI
import mongoose from "mongoose"; // ✅ TAMBAHKAN IMPORT INI
import PDFDocument from "pdfkit";
import { createNotification } from "../services/notificationService";

/* ================= CREATE LOGBOOK ================= */
export const createLogbook = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const exists = await Logbook.findOne({
      user: userId,
      date: req.body.date,
    });

    const uploaded = req.files as {
      files?: Express.Multer.File[];
      pdfFile?: Express.Multer.File[];
    };

    // Proses file upload
    const images: string[] = [];
    let pdfFilePath: string | undefined = undefined;

    uploaded?.files?.forEach((f) => {
      images.push(`uploads/logbook/image/${f.filename}`);
    });

    if (uploaded?.pdfFile?.[0]) {
      pdfFilePath = `uploads/logbook/pdf/${uploaded.pdfFile[0].filename}`;
    }

    // 🔥 CEK STATUS LOGBOOK YANG SUDAH ADA
    if (exists) {
      // Jika sudah disetujui - tidak bisa diubah
      if (exists.approvalStatus === "disetujui") {
        return res.status(400).json({
          message: "Logbook sudah disetujui dan tidak bisa diubah",
        });
      }

      // Jika ditolak - tidak bisa diubah
      if (exists.approvalStatus === "ditolak") {
        return res.status(400).json({
          message: "Logbook ditolak dan tidak bisa diubah",
        });
      }

      // 🔥 Jika dalam status REVISI - update data
      if (exists.approvalStatus === "revisi") {
        // Merge files: existing files + files baru
        const existingFiles = exists.files || [];
        const mergedFiles = [...existingFiles, ...images];

        await Logbook.findByIdAndUpdate(exists._id, {
          status: req.body.status,
          judul: req.body.judul,
          pengalaman: req.body.pengalaman,
          kendala: req.body.kendala,
          keterangan: req.body.keterangan,
          files: mergedFiles,
          pdfFile: pdfFilePath || exists.pdfFile,
          // Reset approval status
          approvalStatus: "menunggu",
          mentorNote: "",
          approvedAt: null,
          isFinalized: false,
        });

        return res.json({
          success: true,
          message: "Revisi logbook berhasil dikirim",
        });
      }

      // Jika sudah ada dan bukan revisi
      return res.status(400).json({
        message: "Logbook untuk tanggal ini sudah diisi",
      });
    }

    // 🔥 CREATE BARU
    const logbook = await Logbook.create({
      user: userId,
      date: req.body.date,
      status: req.body.status,
      judul: req.body.judul,
      pengalaman: req.body.pengalaman,
      kendala: req.body.kendala,
      keterangan: req.body.keterangan,
      files: images,
      pdfFile: pdfFilePath,
      approvalStatus: "menunggu",
      approvedByMentor: false,
      isFinalized: false,
    });

    // Notifikasi ke Mentor
    setImmediate(async () => {
      try {
        const sender = await User.findById(userId);
        if (sender) {
          createNotification({
            recipientRoles: ["mentor"],
            title: "Logbook Baru Dikirim",
            message: `${sender.name || "Peserta"} telah mengisi logbook tanggal ${req.body.date}.`,
            type: "info",
            linkUrl: "/dashboard/mentor/ViewLogbook",
          });
        }
      } catch (e) {
        console.error("Gagal buat notifikasi logbook:", e);
      }
    });

    res.status(201).json({
      success: true,
      message: "Logbook berhasil dibuat",
      data: logbook,
    });
  } catch (err) {
    console.error("[CREATE LOGBOOK]", err);
    res.status(500).json({ message: "Gagal menyimpan logbook" });
  }
};
/* ================= GET FILLED DATES ================= */
export const getFilledDates = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const logs = await Logbook.find({ user: userId }).select(
      "date status approvalStatus _id",
    );

    const result: Record<
      string,
      {
        status: string;
        approvalStatus: string;
        _id: string;
      }
    > = {};

    logs.forEach((l) => {
      result[l.date] = {
        status: l.status,
        approvalStatus: l.approvalStatus || "menunggu",
        _id: l._id.toString(),
      };
    });

    res.json(result);
  } catch (err) {
    console.error("[GET FILLED DATES]", err);
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
      _id: logbook._id,
      status: logbook.status,
      judul: logbook.judul,
      pengalaman: logbook.pengalaman,
      kendala: logbook.kendala,
      keterangan: logbook.keterangan,
      files: logbook.files,
      pdfFile: logbook.pdfFile,
      approvedByMentor: logbook.approvedByMentor,
      mentorNote: logbook.mentorNote,
      revisionNote: logbook.revisionNote,
      approvalStatus: logbook.approvalStatus || "menunggu",
      approvedAt: logbook.approvedAt,
      revisionRequestedAt: logbook.revisionRequestedAt,
      isFinalized: logbook.isFinalized,
    });
  } catch (err) {
    console.error("[GET LOGBOOK BY DATE]", err);
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

    // Notifikasi ke Peserta
    createNotification({
      recipientId: (logbook.user as any)._id,
      title: approvalStatus === "disetujui" ? "Logbook Disetujui" : "Logbook Ditolak",
      message: `Mentor Anda telah ${approvalStatus} logbook tanggal ${logbook.date}.`,
      type: approvalStatus === "disetujui" ? "success" : "alert",
      linkUrl: "/dashboard/peserta/isi-logbook",
    });

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

/* ===== GET FILLED DATES BY PESERTA (MENTOR) ===== */
export const getFilledDatesByPeserta = async (req: any, res: Response) => {
  try {
    const mentorId = req.user.id;
    const { userId } = req.params;

    // Cari user berdasarkan ID
    const peserta = await User.findById(userId);
    if (!peserta) {
      return res.status(404).json({
        message: "Peserta tidak ditemukan",
      });
    }

    // Validasi apakah mentor berhak melihat logbook peserta ini
    const valid = await Pendaftaran.findOne({
      "peserta.email": peserta.email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda tidak berhak mengakses logbook peserta ini",
      });
    }

    // Ambil semua logbook peserta
    const logs = await Logbook.find({ user: userId }).select(
      "date status approvalStatus",
    );

    // Format data seperti yang diharapkan oleh Calendar component
    const result: Record<
      string,
      {
        status:
          | "hadir"
          | "tidak_hadir_keterangan"
          | "tidak_hadir_tanpa_keterangan";
        approvalStatus: "menunggu" | "disetujui" | "ditolak" | "revisi";
      }
    > = {};

    logs.forEach((l) => {
      result[l.date] = {
        status: l.status as
          | "hadir"
          | "tidak_hadir_keterangan"
          | "tidak_hadir_tanpa_keterangan",
        approvalStatus: l.approvalStatus as
          | "menunggu"
          | "disetujui"
          | "ditolak"
          | "revisi",
      };
    });

    res.json(result);
  } catch (err) {
    console.error("[GET FILLED DATES BY PESERTA]", err);
    res.status(500).json({
      message: "Gagal mengambil data kalender peserta",
    });
  }
};

/* ================= GET LOGBOOK DETAIL BY ID ================= */
export const getLogbookDetail = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID logbook tidak valid" });
    }

    const logbook = await Logbook.findById(id);

    if (!logbook) {
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    // Validasi akses
    if (
      req.user.role === "peserta" &&
      logbook.user.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Akses ditolak" });
    }

    res.json({
      _id: logbook._id,
      status: logbook.status,
      judul: logbook.judul,
      pengalaman: logbook.pengalaman,
      kendala: logbook.kendala,
      keterangan: logbook.keterangan,
      files: logbook.files,
      pdfFile: logbook.pdfFile,
      approvedByMentor: logbook.approvedByMentor,
      mentorNote: logbook.mentorNote,
      revisionNote: logbook.revisionNote,
      approvalStatus: logbook.approvalStatus,
      approvedAt: logbook.approvedAt,
      revisionRequestedAt: logbook.revisionRequestedAt,
      isFinalized: logbook.isFinalized,
    });
  } catch (err) {
    console.error("[GET LOGBOOK DETAIL]", err);
    res.status(500).json({ message: "Gagal mengambil detail logbook" });
  }
};

/* ================= REQUEST REVISION (MENTOR) ================= */
export const requestRevision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { revisionNote } = req.body;
    const mentorId = (req as any).user.id;

    if (!revisionNote?.trim()) {
      return res.status(400).json({
        message: "Catatan revisi wajib diisi",
      });
    }

    const logbook = await Logbook.findById(id).populate("user", "email");

    if (!logbook) {
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    // Cek apakah sudah final
    if (logbook.isFinalized) {
      return res.status(400).json({
        message: "Logbook sudah final, tidak bisa direvisi",
      });
    }

    // Validasi mentor
    const valid = await Pendaftaran.findOne({
      "peserta.email": (logbook.user as any).email,
      "peserta.mentor": mentorId,
    });

    if (!valid) {
      return res.status(403).json({
        message: "Anda bukan mentor peserta ini",
      });
    }

    // 🔥 UPDATE STATUS REVISI
    logbook.approvalStatus = "revisi";
    logbook.revisionNote = revisionNote.trim();
    logbook.revisionRequestedAt = new Date();
    logbook.mentorNote = revisionNote.trim(); // Simpan juga di mentorNote untuk kompatibilitas
    logbook.isFinalized = false;
    logbook.approvedAt = null;

    await logbook.save();

    // Notifikasi ke Peserta
    createNotification({
      recipientId: (logbook.user as any)._id,
      title: "Revisi Logbook Diminta",
      message: `Mentor meminta revisi logbook tanggal ${logbook.date}: "${revisionNote.trim()}"`,
      type: "warning",
      linkUrl: "/dashboard/peserta/isi-logbook",
    });

    res.json({
      success: true,
      message: "Permintaan revisi berhasil dikirim ke peserta",
    });
  } catch (err) {
    console.error("[REQUEST REVISION]", err);
    res.status(500).json({
      message: "Gagal meminta revisi logbook",
    });
  }
};

/* ================= SUBMIT REVISION (PESERTA) ================= */
export const submitRevision = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    console.log("📥 Submit Revision - ID:", id);
    console.log("📥 User ID:", userId);
    console.log("📥 Request body:", req.body);
    console.log("📥 Files:", req.files);

    const logbook = await Logbook.findById(id);

    if (!logbook) {
      return res.status(404).json({
        message: "Logbook tidak ditemukan",
      });
    }

    // Validasi kepemilikan
    if (logbook.user.toString() !== userId) {
      return res.status(403).json({
        message: "Akses ditolak",
      });
    }

    // Validasi status
    if (logbook.approvalStatus !== "revisi") {
      return res.status(400).json({
        message: "Logbook bukan dalam status revisi",
        currentStatus: logbook.approvalStatus,
      });
    }

    // Proses file upload
    const uploaded = req.files as {
      files?: Express.Multer.File[];
      pdfFile?: Express.Multer.File[];
    };

    const newImages: string[] = [];
    let newPdfFile: string | undefined = undefined;

    uploaded?.files?.forEach((f) => {
      newImages.push(`uploads/logbook/image/${f.filename}`);
    });

    if (uploaded?.pdfFile?.[0]) {
      newPdfFile = `uploads/logbook/pdf/${uploaded.pdfFile[0].filename}`;
    }

    // 🔥 UPDATE SEMUA FIELD
    const updateData: any = {
      status: req.body.status || logbook.status,
      judul: req.body.judul || logbook.judul,
      pengalaman: req.body.pengalaman || logbook.pengalaman,
      kendala: req.body.kendala || logbook.kendala,
      keterangan: req.body.keterangan || logbook.keterangan,
      approvalStatus: "menunggu",
      mentorNote: "",
      revisionNote: "",
      revisionRequestedAt: null,
      isFinalized: false,
      approvedAt: null,
    };

    // Merge files: existing + new
    if (newImages.length > 0) {
      updateData.files = [...(logbook.files || []), ...newImages];
    }

    if (newPdfFile) {
      updateData.pdfFile = newPdfFile;
    }

    await Logbook.findByIdAndUpdate(id, updateData, { new: true });

    res.json({
      success: true,
      message: "Revisi berhasil dikirim ke mentor",
    });
  } catch (err) {
    console.error("[SUBMIT REVISION]", err);
    res.status(500).json({
      message: "Gagal mengirim revisi",
    });
  }
};
