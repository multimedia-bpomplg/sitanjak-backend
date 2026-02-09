// routes/superadminRoutes.ts
import { Router } from "express";
import {
  buatAkunPeserta,
  getPeserta,
  nonaktifkanPeserta,
  aktifkanPeserta,
} from "../controllers/superadminController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import {
  getMentor,
  nonaktifkanMentor,
  aktifkanMentor,
} from "../controllers/mentorController";
import {
  buatAdmin,
  getAdmin,
  nonaktifkanAdmin,
  aktifkanAdmin,
  setSuperAccess,
} from "../controllers/adminController";
import { updatePosisiPeserta } from "../controllers/superadminController";
import {
  getAllLogbook,
  superadminApproveLogbook,
  enableMissedDay,
} from "../controllers/superadminLogbookController";
import { getPesertaDisetujui } from "../controllers/superadminPesertaController";
import { getAllLaporanAkhir } from "../controllers/superadminLaporanAkhirController";
import { getAllLaporanBulanan } from "../controllers/superadminLaporanBulananController";
import { updateStatusMagang } from "../controllers/superadminController";
import { updateStatus } from "../controllers/pendaftaran.controller";

const router = Router();

/* ================= ROUTES UNTUK SUPERADMIN & ADMIN DENGAN SUPER ACCESS ================= */

// ✅ Routes yang bisa diakses admin dengan super access
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

// ✅ Tetap hanya superadmin yang bisa nonaktifkan/aktifkan
router.patch(
  "/peserta/:id/nonaktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  nonaktifkanPeserta,
);

router.patch(
  "/peserta/:id/aktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  aktifkanPeserta,
);

router.get(
  "/mentor",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getMentor,
);

// ✅ IMPORT CONTROLLER MENTOR
import { buatMentor } from "../controllers/mentorController";

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

// ✅ Routes hanya untuk superadmin
router.post(
  "/buat-admin",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  buatAdmin,
);

router.get("/admin", authMiddleware, roleMiddleware(["superadmin"]), getAdmin);

router.patch(
  "/admin/:id/nonaktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  nonaktifkanAdmin,
);

router.patch(
  "/admin/:id/aktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  aktifkanAdmin,
);

/* ================= UPDATE SUPER ACCESS ================= */
router.patch(
  "/admin/:id/super-access",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  setSuperAccess,
);

/* ================= UPDATE POSISI PESERTA ================= */
router.put(
  "/pendaftaran/:id/posisi",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  updatePosisiPeserta,
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

router.post(
  "/logbook/enable-missed-day",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  enableMissedDay,
);

/* ================= PESERTA ================= */
router.get(
  "/peserta/disetujui",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getPesertaDisetujui,
);

/* ================= LAPORAN AKHIR ================= */
router.get(
  "/laporan-akhir",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllLaporanAkhir,
);

/* ================= LAPORAN BULANAN ================= */
router.get(
  "/laporan-bulanan",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllLaporanBulanan,
);

/* ================= UPDATE STATUS MAGANG ================= */
router.put(
  "/pendaftaran/:id/status-magang",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]), // ✅ Hanya admin & superadmin
  updateStatusMagang,
);

/* ================= UPDATE STATUS PENDAFTARAN ================= */
router.put(
  "/pendaftaran/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  updateStatus, // ⬅️ INI YANG AUTO SET statusMagang
);

export default router;
