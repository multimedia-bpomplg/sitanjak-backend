import cron from "node-cron";
import User from "../models/User";
import Pendaftaran from "../models/pendaftaran";
import {
  cleanupAbsensiPhotosForInactivePeserta,
  cleanupPendaftaranFilesForInactivePeserta,
} from "../services/absensiCleanupService";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function runAutoNonaktifPeserta() {
  console.log("🔎 Cron Auto Nonaktif Peserta berjalan...");

  const today = new Date();

  try {
    const pendaftaran = await Pendaftaran.find({
      status: "Disetujui",
    });

    for (const data of pendaftaran) {
      for (const peserta of data.peserta) {
        if (peserta.statusMagang === "Selesai Magang") {
          const selesai = new Date(peserta.tanggalSelesaiMagang);
          if (Number.isNaN(selesai.getTime())) continue;

          const diffTime = today.getTime() - selesai.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          /*
          jika lebih dari 7 hari
          */
          if (diffDays >= 7 && peserta.email) {
            const cleanEmail = peserta.email.trim();
            const updatedUser = await User.findOneAndUpdate(
              {
                email: new RegExp(`^${escapeRegex(cleanEmail)}$`, "i"),
                status: { $ne: "Nonaktif" },
              },
              { status: "Nonaktif" },
              { new: true },
            );

            if (updatedUser) {
              console.log(
                `⚠️ Akun peserta ${peserta.email} dinonaktifkan otomatis`,
              );
            }
          }
        }
      }
    }

    // Bersihkan foto absensi serta surat pengantar & surat balasan milik akun peserta Nonaktif (baru maupun lama)
    const [absensiCleanup, suratCleanup] = await Promise.all([
      cleanupAbsensiPhotosForInactivePeserta(),
      cleanupPendaftaranFilesForInactivePeserta(),
    ]);
    if (absensiCleanup.filesDeleted > 0 || absensiCleanup.recordsCleared > 0) {
      console.log(
        `🧹 Cleanup foto absensi peserta nonaktif: ${absensiCleanup.filesDeleted} file dihapus (${absensiCleanup.recordsCleared} entri absensi dibersihkan)`,
      );
    }
    if (suratCleanup.filesDeleted > 0 || suratCleanup.docsCleared > 0) {
      console.log(
        `🧹 Cleanup surat pengantar/balasan peserta nonaktif: ${suratCleanup.filesDeleted} file dihapus (${suratCleanup.docsCleared} pendaftaran dibersihkan)`,
      );
    }
  } catch (error) {
    console.error("❌ Cron auto nonaktif error:", error);
  }
}

/*
CRON BERJALAN SETIAP HARI JAM 00:00
*/
export const autoNonaktifPeserta = () => {
  cron.schedule("0 0 * * *", runAutoNonaktifPeserta);
  void runAutoNonaktifPeserta();
};
