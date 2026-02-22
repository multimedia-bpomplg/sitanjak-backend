import { Request, Response } from "express";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";

/* ================= GET ALL LOGBOOK (SUPERADMIN) ================= */
export const getAllLogbook = async (req: any, res: Response) => {
  try {
    // Ambil semua logbook yang sudah di-approve mentor
    const logbooks = await Logbook.find({
      approvalStatus: { $in: ["disetujui", "ditolak"] },
    })
      .populate("user", "name email")
      .populate("approvedBy", "name email")
      .sort({ date: -1 });

    res.json(logbooks);
  } catch (err) {
    console.error("[GET ALL LOGBOOK]", err);
    res.status(500).json({ message: "Gagal mengambil data logbook" });
  }
};

/* ================= SUPERADMIN APPROVE/REJECT LOGBOOK ================= */
export const superadminApproveLogbook = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { approvalStatus, mentorNote } = req.body;
    const superadminId = req.user.id;

    const logbook = await Logbook.findById(id).populate("user", "name email");

    if (!logbook) {
      return res.status(404).json({ message: "Logbook tidak ditemukan" });
    }

    // Update status oleh superadmin
    logbook.approvalStatus = approvalStatus;
    logbook.mentorNote = mentorNote || logbook.mentorNote;
    logbook.approvedByMentor = approvalStatus === "disetujui";
    logbook.approvedAt = new Date();
    logbook.approvedBy = superadminId;

    await logbook.save();

    const message =
      approvalStatus === "disetujui"
        ? "Logbook berhasil disetujui oleh Superadmin"
        : "Logbook berhasil ditolak oleh Superadmin";

    res.json({
      success: true,
      message,
      logbook,
    });
  } catch (err) {
    console.error("[SUPERADMIN APPROVE LOGBOOK]", err);
    res.status(500).json({ message: "Gagal memproses logbook" });
  }
};

/* ================= ENABLE MISSED DAY (SUPERADMIN ONLY) ================= */
export const enableMissedDay = async (req: any, res: Response) => {
  try {
    const { userId, date } = req.body;
    const superadminId = req.user.id;

    // Cek apakah sudah ada logbook untuk tanggal tersebut
    const existing = await Logbook.findOne({ user: userId, date });
    if (existing) {
      return res.status(400).json({
        message: "Logbook untuk tanggal ini sudah ada",
      });
    }

    // Buat logbook kosong untuk hari yang terlewat
    const missedLogbook = await Logbook.create({
      user: userId,
      date,
      status: "hadir",
      judul: "Hari terlewat - diaktifkan oleh superadmin",
      pengalaman: "Peserta diizinkan mengisi untuk hari ini",
      kendala: "-",
      approvalStatus: "menunggu",
      approvedByMentor: false,
      isMissedDay: true,
      enabledBy: superadminId,
      enabledAt: new Date(),
    } as any);

    res.status(201).json({
      success: true,
      message: "Pengisian logbook untuk hari terlewat berhasil diaktifkan",
      logbook: missedLogbook,
    });
  } catch (err) {
    console.error("[ENABLE MISSED DAY]", err);
    res.status(500).json({ message: "Gagal mengaktifkan hari terlewat" });
  }
};
