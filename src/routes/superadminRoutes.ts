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

const router = Router();

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
  roleMiddleware(["superadmin"]),
  getAllLogbook,
);
router.put(
  "/logbook/:id/approve",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  superadminApproveLogbook,
);
router.post(
  "/logbook/enable-missed-day",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  enableMissedDay,
);

/* ================= PESERTA ================= */
router.get(
  "/peserta/disetujui",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getPesertaDisetujui,
);

/* ================= LAPORAN AKHIR ================= */
router.get(
  "/laporan-akhir",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getAllLaporanAkhir,
);

/* ================= LAPORAN BULANAN ================= */
router.get(
  "/laporan-bulanan",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getAllLaporanBulanan,
);

export default router;
