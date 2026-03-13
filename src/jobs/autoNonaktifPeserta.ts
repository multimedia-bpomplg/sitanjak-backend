import cron from "node-cron";
import User from "../models/User";
import Pendaftaran from "../models/pendaftaran";

/*
CRON BERJALAN SETIAP HARI JAM 00:00
*/
export const autoNonaktifPeserta = () => {
  cron.schedule("0 0 * * *", async () => {
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

            const diffTime = today.getTime() - selesai.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            /*
            jika lebih dari 7 hari
            */
            if (diffDays >= 7) {
              await User.updateOne(
                { email: peserta.email },
                { status: "Nonaktif" },
              );

              console.log(
                `⚠️ Akun peserta ${peserta.email} dinonaktifkan otomatis`,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Cron auto nonaktif error:", error);
    }
  });
};
