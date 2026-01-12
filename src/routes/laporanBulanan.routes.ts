import { Router } from "express";
import {
  createLaporanBulanan,
  getLaporanByMonth,
  getRiwayatLaporanBulanan,
} from "../controllers/laporanBulananController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

/* CREATE */
router.post("/", authMiddleware, createLaporanBulanan);

/* RIWAYAT */
router.get("/riwayat", authMiddleware, getRiwayatLaporanBulanan);

/* DETAIL BY MONTH */
router.get("/:month", authMiddleware, getLaporanByMonth);

export default router;
