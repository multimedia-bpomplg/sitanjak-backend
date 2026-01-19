import { Router } from "express";
import {
  createLaporanBulanan,
  getLaporanByMonth,
  getRiwayatLaporanBulanan,
  approveLaporanBulanan,
} from "../controllers/laporanBulananController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ================= PESERTA ================= */

/* CREATE */
router.post("/", authMiddleware, createLaporanBulanan);

/* RIWAYAT */
router.get("/riwayat", authMiddleware, getRiwayatLaporanBulanan);

/* DETAIL BY MONTH */
router.get("/:month", authMiddleware, getLaporanByMonth);

/* ================= MENTOR ================= */

/* APPROVE LAPORAN BULANAN */
router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  approveLaporanBulanan,
);

export default router;
