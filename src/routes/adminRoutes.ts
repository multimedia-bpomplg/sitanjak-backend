// routes/adminRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

// Import controllers
import {
  buatAkunPeserta,
  getPeserta,
  updatePosisiPeserta,
} from "../controllers/superadminController";

import {
  getMentor,
  buatMentor,
  nonaktifkanMentor,
  aktifkanMentor,
} from "../controllers/mentorController";

import {
  getAllPendaftaran,
  updateStatus,
  setMentorPeserta,
} from "../controllers/pendaftaran.controller";

import {
  getAllLogbook,
  superadminApproveLogbook,
} from "../controllers/superadminLogbookController";

import { getPesertaDisetujui } from "../controllers/superadminPesertaController";

import { getAllLaporanAkhir } from "../controllers/superadminLaporanAkhirController";

import { getAllLaporanBulanan } from "../controllers/superadminLaporanBulananController";

import { uploadSuratBalasan } from "../middlewares/upload.middleware";

const router = Router();

/* ================= PENDAFTARAN ================= */
router.get(
  "/pendaftaran",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllPendaftaran,
);

router.put(
  "/pendaftaran/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadSuratBalasan.single("suratBalasan"),
  updateStatus,
);

router.put(
  "/pendaftaran/:id/mentor-peserta",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  setMentorPeserta,
);

router.put(
  "/pendaftaran/:id/posisi",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  updatePosisiPeserta,
);

/* ================= MENTOR ================= */
router.get(
  "/mentor",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getMentor,
);

router.post(
  "/buat-mentor",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  buatMentor,
);

router.patch(
  "/mentor/:id/nonaktif",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  nonaktifkanMentor,
);

router.patch(
  "/mentor/:id/aktif",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  aktifkanMentor,
);

/* ================= AKUN PESERTA ================= */
router.post(
  "/buat-peserta",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  buatAkunPeserta,
);

router.get(
  "/peserta",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getPeserta,
);

/* ================= LOGBOOK ================= */
router.get(
  "/logbook",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllLogbook,
);

router.put(
  "/logbook/:id/approve",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  superadminApproveLogbook,
);

/* ================= PESERTA DISETUJUI ================= */
router.get(
  "/peserta/disetujui",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getPesertaDisetujui,
);

/* ================= LAPORAN ================= */
router.get(
  "/laporan-akhir",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllLaporanAkhir,
);

router.get(
  "/laporan-bulanan",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllLaporanBulanan,
);

export default router;
