import { Router } from "express";
import {
  getLaporanAkhir,
  createLaporanAkhir,
  downloadLaporanAkhirPdf,
  approveLaporanAkhir,
} from "../controllers/laporanAkhir.Controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ================= PESERTA ================= */

router.get("/", authMiddleware, getLaporanAkhir);
router.post("/", authMiddleware, createLaporanAkhir);

router.get(
  "/pdf",
  authMiddleware, // 🔒 WAJIB
  downloadLaporanAkhirPdf,
);

/* ================= MENTOR ================= */

router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  approveLaporanAkhir,
);

export default router;
