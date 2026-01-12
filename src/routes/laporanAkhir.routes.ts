import { Router } from "express";
import {
  getLaporanAkhir,
  createLaporanAkhir,
  downloadLaporanAkhirPdf,
} from "../controllers/laporanAkhir.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getLaporanAkhir);
router.post("/", authMiddleware, createLaporanAkhir);
router.get("/pdf", authMiddleware, downloadLaporanAkhirPdf); // 🔥 PDF

export default router;
