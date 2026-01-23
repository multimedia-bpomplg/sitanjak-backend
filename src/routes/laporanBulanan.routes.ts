// routes/laporanbulanan.routes.ts
import { Router } from "express";
import {
  createLaporanBulanan,
  getLaporanByMonth,
  getRiwayatLaporanBulanan,
  getLaporanPesertaForMentor,
  updateStatusLaporanBulanan,
  getAllLaporanPesertaBimbingan,
  getLaporanPesertaByEmail, // TAMBAHKAN
  approveLaporanBulananOld,
} from "../controllers/laporanBulananController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* ================= PESERTA ================= */
router.post("/", authMiddleware, createLaporanBulanan);
router.get("/riwayat", authMiddleware, getRiwayatLaporanBulanan);
router.get("/:month", authMiddleware, getLaporanByMonth);

/* ================= MENTOR ================= */
router.get(
  "/mentor/semua-laporan",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getAllLaporanPesertaBimbingan,
);

// Endpoint baru dengan email
router.get(
  "/mentor/peserta-email/:pesertaEmail/:month",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLaporanPesertaByEmail,
);

// Endpoint lama dengan ID (opsional)
router.get(
  "/mentor/peserta/:pesertaId/:month",
  authMiddleware,
  roleMiddleware(["mentor"]),
  getLaporanPesertaForMentor,
);

router.put(
  "/mentor/update-status/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  updateStatusLaporanBulanan,
);

/* ================= ENDPOINT LAMA ================= */
router.put(
  "/mentor/approve/:id",
  authMiddleware,
  roleMiddleware(["mentor"]),
  approveLaporanBulananOld,
);

export default router;
