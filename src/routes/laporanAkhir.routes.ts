// routes/laporanAkhir.routes.ts
import { Router } from "express";
import {
  getLaporanAkhir,
  createLaporanAkhir,
  downloadLaporanAkhirPdf,
  getAllLaporanAkhirPesertaBimbingan,
  getLaporanAkhirPesertaByEmail,
  updateStatusLaporanAkhir,
  approveLaporanAkhir,
} from "../controllers/laporanAkhir.Controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ================= PESERTA ================= */
router.get("/", authMiddleware, getLaporanAkhir);
router.post("/", authMiddleware, createLaporanAkhir);
router.get("/pdf", authMiddleware, downloadLaporanAkhirPdf);

/* ================= MENTOR ================= */
router.get(
  "/mentor/semua-laporan",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getAllLaporanAkhirPesertaBimbingan,
);

router.get(
  "/mentor/peserta-email/:pesertaEmail",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLaporanAkhirPesertaByEmail,
);

router.put(
  "/mentor/update-status/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  updateStatusLaporanAkhir,
);

/* ================= ENDPOINT LAMA ================= */
router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  approveLaporanAkhir,
);

export default router;
