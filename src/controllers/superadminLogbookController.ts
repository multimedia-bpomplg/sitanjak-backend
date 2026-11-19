import { Request, Response } from "express";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { createNotification } from "../services/notificationService";

/* ================= GET ALL LOGBOOK (SUPERADMIN & ADMIN) ================= */
export const getAllLogbook = async (req: any, res: Response) => {
  try {
    const logbooks = await Logbook.find()
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

    // Update status oleh admin / superadmin
    logbook.approvalStatus = approvalStatus;
    logbook.mentorNote = mentorNote || logbook.mentorNote;
    logbook.approvedByMentor = approvalStatus === "disetujui";
    logbook.approvedAt = new Date();
    logbook.approvedBy = superadminId;

    await logbook.save();

    if ((logbook.user as any)?._id) {
      const statusTitle =
        approvalStatus === "disetujui"
          ? "Laporan Harian Disetujui"
          : approvalStatus === "revisi"
            ? "Revisi Logbook Diminta"
            : "Laporan Harian Ditolak";
      const statusMsg =
        approvalStatus === "disetujui"
          ? `Laporan harian Anda untuk tanggal ${logbook.date} telah disetujui.`
          : approvalStatus === "revisi"
            ? `Admin meminta revisi logbook tanggal ${logbook.date}${mentorNote ? `: "${mentorNote}"` : "."}`
            : `Laporan harian Anda untuk tanggal ${logbook.date} ditolak.`;

      createNotification({
        recipientId: (logbook.user as any)._id,
        title: statusTitle,
        message: statusMsg,
        type:
          approvalStatus === "disetujui"
            ? "success"
            : approvalStatus === "revisi"
              ? "warning"
              : "alert",
        linkUrl: "/dashboard/peserta/isi-logbook",
      });
    }

    const message =
      approvalStatus === "disetujui"
        ? "Logbook berhasil disetujui"
        : approvalStatus === "revisi"
          ? "Logbook dikembalikan untuk revisi"
          : "Logbook berhasil ditolak";

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
