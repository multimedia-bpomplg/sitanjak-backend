// routes/overviewRoutes.ts
import { Router } from "express";
import {
  getOverviewStats,
  getTimeSeriesData,
  getStatistikPosisi,
  getStatistikAsal,
  getStatistikGender,
  getStatistikSelesai,
  getAvailableYears,
  exportOverviewData,
  getDetailedTimeSeries,
  getLogbookStatistics,
  getPendaftaranStatistics,
  verifyDataSync,
  checkDataAvailability,
  getApiStatus,
} from "../controllers/overviewController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ================= GET OVERVIEW STATS ================= */
router.get(
  "/stats",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getOverviewStats,
);

/* ================= GET TIME SERIES DATA ================= */
router.get(
  "/timeseries",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getTimeSeriesData,
);

/* ================= GET DETAILED TIME SERIES (HARIAN) ================= */
router.get(
  "/timeseries/detailed",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getDetailedTimeSeries,
);

/* ================= GET STATISTIK LOGBOOK ================= */
router.get(
  "/statistik/logbook",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getLogbookStatistics,
);

/* ================= GET STATISTIK PENDAFTARAN ================= */
router.get(
  "/statistik/pendaftaran",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getPendaftaranStatistics,
);

/* ================= GET STATISTIK POSISI ================= */
router.get(
  "/statistik/posisi",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getStatistikPosisi,
);

/* ================= GET STATISTIK ASAL ================= */
router.get(
  "/statistik/asal",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getStatistikAsal,
);

/* ================= GET STATISTIK GENDER ================= */
router.get(
  "/statistik/gender",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getStatistikGender,
);

/* ================= GET STATISTIK SELESAI ================= */
router.get(
  "/statistik/selesai",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getStatistikSelesai,
);

/* ================= GET AVAILABLE YEARS ================= */
router.get(
  "/years",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getAvailableYears,
);

/* ================= EXPORT DATA ================= */
router.get(
  "/export",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  exportOverviewData,
);

/* ================= VERIFY DATA SYNC ================= */
router.get(
  "/verify-sync",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  verifyDataSync,
);

/* ================= CHECK DATA AVAILABILITY ================= */
router.get(
  "/check-data",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  checkDataAvailability,
);

/* ================= GET API STATUS ================= */
router.get(
  "/status",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getApiStatus,
);

export default router;
