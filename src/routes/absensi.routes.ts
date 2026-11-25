import { Router } from "express";
import {
  getTodayAbsensi,
  getRiwayatAbsensi,
  getAbsensiSummary,
  submitCheckIn,
  submitCheckOut,
  submitIzin,
  getManageAbsensiList,
  getManageRekapPeserta,
  koreksiAbsensi,
  getAttendanceTolerances,
  upsertAttendanceTolerance,
  deleteAttendanceTolerance,
} from "../controllers/absensiController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadAbsensi } from "../middlewares/upload.middleware";

const router = Router();

/* ================= PESERTA ================= */

router.get("/today", authMiddleware, getTodayAbsensi);
router.get("/riwayat", authMiddleware, getRiwayatAbsensi);
router.get("/summary", authMiddleware, getAbsensiSummary);

router.post(
  "/check-in",
  authMiddleware,
  uploadAbsensi.single("photo"),
  submitCheckIn,
);

router.post(
  "/check-out",
  authMiddleware,
  uploadAbsensi.single("photo"),
  submitCheckOut,
);

router.post("/izin", authMiddleware, submitIzin);

/* ================= MENTOR, ADMIN & SUPERADMIN ================= */

router.get(
  "/manage/list",
  authMiddleware,
  roleMiddleware(["mentor", "admin", "superadmin"]),
  getManageAbsensiList,
);

router.get(
  "/manage/rekap-peserta",
  authMiddleware,
  roleMiddleware(["mentor", "admin", "superadmin"]),
  getManageRekapPeserta,
);

router.patch(
  "/manage/:id/koreksi",
  authMiddleware,
  roleMiddleware(["mentor"]),
  koreksiAbsensi,
);

/* ================= TOLERANSI JAM MASUK (ADMIN & SUPERADMIN) ================= */

router.get(
  "/toleransi",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAttendanceTolerances,
);

router.post(
  "/toleransi",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  upsertAttendanceTolerance,
);

router.delete(
  "/toleransi/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteAttendanceTolerance,
);

export default router;
