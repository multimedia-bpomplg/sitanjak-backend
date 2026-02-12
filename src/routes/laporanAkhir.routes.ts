// routes/laporanAkhir.routes.ts
import { Router } from "express";
import {
  getLaporanAkhir,
  uploadLaporanAkhirPdf,
  downloadLaporanAkhirPdf,
  viewLaporanAkhirPdf,
  getAllLaporanAkhirPesertaBimbingan,
  getLaporanAkhirPesertaByEmail,
  updateStatusDanPenilaian,
  getPenilaianPeserta,
} from "../controllers/laporanAkhir.Controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadLaporanAkhir } from "../middlewares/upload.middleware";

const router = Router();

/* ================= PESERTA ================= */
router.get("/", authMiddleware, getLaporanAkhir);
router.post(
  "/upload",
  authMiddleware,
  uploadLaporanAkhir.single("file"),
  uploadLaporanAkhirPdf,
);
router.get("/download", authMiddleware, downloadLaporanAkhirPdf);
router.get("/view/:id", authMiddleware, viewLaporanAkhirPdf);
router.get("/penilaian", authMiddleware, getPenilaianPeserta);

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
  "/mentor/update-status-penilaian/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  updateStatusDanPenilaian,
);

router.get(
  "/mentor/download/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  downloadLaporanAkhirPdf,
);

router.get(
  "/mentor/view/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  viewLaporanAkhirPdf,
);

export default router;
