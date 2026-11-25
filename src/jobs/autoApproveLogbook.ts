import cron from "node-cron";
import Logbook from "../models/Logbook";
import { createNotification } from "../services/notificationService";

const AUTO_APPROVE_DAYS = 7;
const AUTO_APPROVE_MS = AUTO_APPROVE_DAYS * 24 * 60 * 60 * 1000;
const AUTO_APPROVE_NOTE =
  "Disetujui otomatis oleh sistem (melewati batas waktu verifikasi 7 hari).";

let isRunning = false;

/**
 * Menyetujui otomatis logbook berstatus "menunggu" yang tidak diproses mentor
 * setelah 7 hari sejak pengajuan/revisi terakhir.
 */
export async function runAutoApproveLogbook(): Promise<number> {
  if (isRunning) return 0;
  isRunning = true;

  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - AUTO_APPROVE_MS);

    const pendingLogs = await Logbook.find({
      approvalStatus: "menunggu",
      isFinalized: { $ne: true },
      $or: [
        { updatedAt: { $lte: cutoff } },
        { updatedAt: { $exists: false }, createdAt: { $lte: cutoff } },
      ],
    })
      .select("_id user date mentorNote")
      .lean();

    if (pendingLogs.length === 0) return 0;

    let approvedCount = 0;

    for (const lb of pendingLogs as any[]) {
      const nextNote = String(lb.mentorNote || "").trim() || AUTO_APPROVE_NOTE;

      const updateRes = await Logbook.updateOne(
        {
          _id: lb._id,
          approvalStatus: "menunggu",
          isFinalized: { $ne: true },
        },
        {
          $set: {
            approvalStatus: "disetujui",
            approvedByMentor: true,
            approvedAt: now,
            isFinalized: true,
            finalizedAt: now,
            autoApproved: true,
            autoApprovedAt: now,
            mentorNote: nextNote,
          },
        },
      );

      if (updateRes.modifiedCount > 0) {
        approvedCount += 1;
        if (lb.user) {
          createNotification({
            recipientId: lb.user,
            title: "Logbook Disetujui Otomatis",
            message: `Laporan harian Anda untuk tanggal ${lb.date} disetujui otomatis oleh sistem karena melebihi batas waktu verifikasi ${AUTO_APPROVE_DAYS} hari.`,
            type: "success",
            linkUrl: "/dashboard/peserta/isi-logbook",
          });
        }
      }
    }

    if (approvedCount > 0) {
      console.log(
        `✅ Cron Auto-Approve Logbook: ${approvedCount} logbook (> ${AUTO_APPROVE_DAYS} hari) disetujui otomatis`,
      );
    }

    return approvedCount;
  } catch (error) {
    console.error("❌ Cron auto-approve logbook error:", error);
    return 0;
  } finally {
    isRunning = false;
  }
}

/**
 * Menjalankan cron auto-approve logbook setiap jam dan saat server mulai.
 */
export const autoApproveLogbookJob = () => {
  cron.schedule("0 * * * *", () => {
    void runAutoApproveLogbook();
  });
  void runAutoApproveLogbook();
};
