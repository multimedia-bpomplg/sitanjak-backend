import { Router } from "express";
import authRoutes from "./authRoutes";
import superadminRoutes from "./superadminRoutes";
import adminRoutes from "./adminRoutes";
import pendaftaranRoutes from "./pendaftaran.route";
import mentorRoutes from "./mentor.route";
import logbookRoutes from "./logbook.routes";
import laporanAkhirRoutes from "./laporanAkhir.routes";
import pesertaRoutes from "./peserta.route";
import userRoutes from "./userRoutes";
import overviewRoutes from "./overview.routes";
import formasiRoutes from "./formasiRoutes";
import suratSelesaiMagangRoutes from "./suratSelesaiMagangRoutes";
import sertifikatRoutes from "./sertifikatRoutes";
import feedbackRoutes from "./FeedbackRoutes";
import whatsappRoutes from "./whatsappRoutes";
import announcementRoutes from "./announcementRoutes";
import informasiFungsiRoutes from "./informasiFungsiRoutes";
import maintenanceRoutes from "./maintenanceRoutes";
import notificationRoutes from "./notificationRoutes";
import absensiRoutes from "./absensi.routes";
import panduanRoutes from "./panduanRoutes";
import penilaianAkhirRoutes from "./penilaianAkhir.routes";
import evaluasiRoutes from "./evaluasiRoutes";
import heroSettingRoutes from "./heroSettingRoutes";
import holidayRoutes from "./holidayRoutes";

const router = Router();

/* TEST */
router.get("/test", (req, res) => {
  res.json({ message: "API route test successful!" });
});

/* ROUTES */
router.use("/auth", authRoutes);
router.use("/superadmin", superadminRoutes);
router.use("/admin", adminRoutes);
router.use("/pendaftaran", pendaftaranRoutes);
router.use("/mentor", mentorRoutes);
router.use("/logbook", logbookRoutes);
router.use("/laporan-akhir", laporanAkhirRoutes);
router.use("/peserta", pesertaRoutes);
router.use("/users", userRoutes);
router.use("/oversistem", overviewRoutes);
router.use("/formasi", formasiRoutes);
router.use("/surat-selesai", suratSelesaiMagangRoutes);
router.use("/sertifikat", sertifikatRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/announcements", announcementRoutes);
router.use("/informasi-fungsi", informasiFungsiRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/absensi", absensiRoutes);
router.use("/panduan", panduanRoutes);
router.use("/penilaian-akhir", penilaianAkhirRoutes);
router.use("/evaluasi", evaluasiRoutes);
router.use("/hero-setting", heroSettingRoutes);
router.use("/holidays", holidayRoutes);

export default router;
