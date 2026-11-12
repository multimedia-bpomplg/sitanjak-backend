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
import feedbackRoutes from "./FeedbackRoutes";
import whatsappRoutes from "./whatsappRoutes";
import announcementRoutes from "./announcementRoutes";
import informasiFungsiRoutes from "./informasiFungsiRoutes";
import maintenanceRoutes from "./maintenanceRoutes";
import notificationRoutes from "./notificationRoutes";

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
router.use("/feedback", feedbackRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/announcements", announcementRoutes);
router.use("/informasi-fungsi", informasiFungsiRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/notifications", notificationRoutes);

export default router;
