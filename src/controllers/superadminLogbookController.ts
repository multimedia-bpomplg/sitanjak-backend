import { Request, Response } from "express";
import Logbook from "../models/Logbook";
import Pendaftaran from "../models/pendaftaran";
import User from "../models/User";
import { createNotification } from "../services/notificationService";
import { getHolidayDateSet } from "../services/holidayService";
import {
  getMissedCutoffDateWib,
  getWorkdaysInRange,
  parseDateIso,
} from "../utils/absensiScoring";

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

/* ================= MONITORING LOGBOOK + BELUM MENGISI (ADMIN & SUPERADMIN) ================= */
export const getLogbookMonitoringOverview = async (_req: any, res: Response) => {
  try {
    const [logbooks, pendaftaranList, activeUsers, holidayDates] =
      await Promise.all([
        Logbook.find()
          .populate("user", "name email")
          .populate("approvedBy", "name email")
          .sort({ date: -1 })
          .lean(),
        Pendaftaran.find({ status: "Disetujui" })
          .select("peserta")
          .populate("peserta.mentor", "name email")
          .lean(),
        User.find().select("_id name email").lean(),
        getHolidayDateSet(),
      ]);

    const cutoffDate = getMissedCutoffDateWib();

    const userByEmail = new Map<
      string,
      { _id: string; name: string; email: string }
    >();
    const userById = new Map<
      string,
      { _id: string; name: string; email: string }
    >();
    for (const u of activeUsers as any[]) {
      const uid = u._id?.toString();
      if (!uid) continue;
      const emailLower = (u.email || "").trim().toLowerCase();
      const entry = { _id: uid, name: u.name || "Peserta", email: emailLower };
      userById.set(uid, entry);
      if (emailLower) userByEmail.set(emailLower, entry);
    }

    const logbooksByUserId = new Map<string, any[]>();
    for (const lb of logbooks as any[]) {
      const uid = lb.user?._id ? lb.user._id.toString() : lb.user?.toString();
      if (!uid) continue;
      const arr = logbooksByUserId.get(uid) || [];
      arr.push(lb);
      logbooksByUserId.set(uid, arr);
    }

    type MonitoringRow = {
      _id: string;
      name: string;
      email: string;
      posisi: string;
      mentorName: string;
      tanggalMulaiMagang: string;
      tanggalSelesaiMagang: string;
      statusMagang: string;
      totalLogbooks: number;
      approvedLogbooks: number;
      pendingLogbooks: number;
      rejectedLogbooks: number;
      revisiLogbooks: number;
      missedCount: number;
      missedDates: string[];
      expectedWorkdaysCount: number;
    };

    const monitoringMap = new Map<string, MonitoringRow>();

    for (const pend of pendaftaranList as any[]) {
      for (const ps of pend.peserta || []) {
        if (ps.statusMagang === "Tidak Magang") continue;
        const emailLower = (ps.email || "").trim().toLowerCase();
        const rawUid = ps.user ? ps.user.toString() : "";
        const resolvedUser =
          (rawUid && userById.get(rawUid)) ||
          (emailLower && userByEmail.get(emailLower)) ||
          null;

        const keyId = resolvedUser?._id || emailLower;
        if (!keyId || monitoringMap.has(keyId)) continue;

        const userLogbooks = resolvedUser
          ? logbooksByUserId.get(resolvedUser._id) || []
          : [];

        let approvedLogbooks = 0;
        let pendingLogbooks = 0;
        let rejectedLogbooks = 0;
        let revisiLogbooks = 0;
        const filledDateSet = new Set<string>();

        for (const lb of userLogbooks) {
          if (lb.date) filledDateSet.add(String(lb.date).trim());
          if (lb.approvalStatus === "disetujui") approvedLogbooks += 1;
          else if (lb.approvalStatus === "ditolak") rejectedLogbooks += 1;
          else if (lb.approvalStatus === "revisi") revisiLogbooks += 1;
          else pendingLogbooks += 1;
        }

        const startIso = parseDateIso(ps.tanggalMulaiMagang);
        const endIso = parseDateIso(ps.tanggalSelesaiMagang);
        const capEndIso =
          endIso && endIso < cutoffDate ? endIso : cutoffDate;

        const expectedWorkdays =
          startIso && capEndIso >= startIso
            ? getWorkdaysInRange(startIso, capEndIso, holidayDates)
            : [];
        const missedDates = expectedWorkdays
          .filter((d) => !filledDateSet.has(d))
          .sort((a, b) => b.localeCompare(a));

        monitoringMap.set(keyId, {
          _id: resolvedUser?._id || `peserta_${emailLower}`,
          name: ps.nama || resolvedUser?.name || "Peserta Magang",
          email: emailLower || resolvedUser?.email || "-",
          posisi: ps.posisi || "-",
          mentorName: ps.mentor?.name || "Belum Ditentukan",
          tanggalMulaiMagang: ps.tanggalMulaiMagang || "",
          tanggalSelesaiMagang: ps.tanggalSelesaiMagang || "",
          statusMagang: ps.statusMagang || "Sedang Magang",
          totalLogbooks: userLogbooks.length,
          approvedLogbooks,
          pendingLogbooks,
          rejectedLogbooks,
          revisiLogbooks,
          missedCount: missedDates.length,
          missedDates,
          expectedWorkdaysCount: expectedWorkdays.length,
        });
      }
    }

    // Pastikan user yang punya logbook namun tidak ditemukan di pendaftaran tetap ikut tampil
    for (const [uid, userLogbooks] of logbooksByUserId.entries()) {
      if (monitoringMap.has(uid)) continue;
      const sampleUser = userLogbooks[0]?.user || userById.get(uid);
      let approvedLogbooks = 0;
      let pendingLogbooks = 0;
      let rejectedLogbooks = 0;
      let revisiLogbooks = 0;
      for (const lb of userLogbooks) {
        if (lb.approvalStatus === "disetujui") approvedLogbooks += 1;
        else if (lb.approvalStatus === "ditolak") rejectedLogbooks += 1;
        else if (lb.approvalStatus === "revisi") revisiLogbooks += 1;
        else pendingLogbooks += 1;
      }

      monitoringMap.set(uid, {
        _id: uid,
        name: sampleUser?.name || "Peserta",
        email: sampleUser?.email || "-",
        posisi: "-",
        mentorName: "-",
        tanggalMulaiMagang: "",
        tanggalSelesaiMagang: "",
        statusMagang: "Sedang Magang",
        totalLogbooks: userLogbooks.length,
        approvedLogbooks,
        pendingLogbooks,
        rejectedLogbooks,
        revisiLogbooks,
        missedCount: 0,
        missedDates: [],
        expectedWorkdaysCount: userLogbooks.length,
      });
    }

    const pesertaMonitoring = Array.from(monitoringMap.values()).sort((a, b) => {
      if (b.missedCount !== a.missedCount) return b.missedCount - a.missedCount;
      if (b.pendingLogbooks !== a.pendingLogbooks) {
        return b.pendingLogbooks - a.pendingLogbooks;
      }
      if (b.totalLogbooks !== a.totalLogbooks) {
        return b.totalLogbooks - a.totalLogbooks;
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      logbooks,
      pesertaMonitoring,
      holidayDates: Array.from(holidayDates),
      cutoffDate,
    });
  } catch (err) {
    console.error("[GET LOGBOOK MONITORING OVERVIEW]", err);
    res.status(500).json({ message: "Gagal memuat monitoring logbook peserta" });
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
