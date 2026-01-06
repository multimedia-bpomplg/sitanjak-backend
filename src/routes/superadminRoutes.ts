import { Router } from "express";
import {
  buatAkunPeserta,
  getPeserta,
  nonaktifkanPeserta,
  aktifkanPeserta,
} from "../controllers/superadminController";
import { authMiddleware } from "../middlelwares/auth.middleware";
import { roleMiddleware } from "../middlelwares/role.middleware";
import { 
  getMentor,
  nonaktifkanMentor,
  aktifkanMentor,
} from "../controllers/mentorController";
import { buatAdmin, getAdmin, nonaktifkanAdmin, aktifkanAdmin } from "../controllers/adminController";

const router = Router();

router.post(
  "/buat-peserta",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  buatAkunPeserta
);

router.get(
  "/peserta",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getPeserta
);

router.patch(
  "/peserta/:id/nonaktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  nonaktifkanPeserta
);

router.patch(
  "/peserta/:id/aktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  aktifkanPeserta
);


router.get(
  "/mentor",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getMentor
);

router.patch(
  "/mentor/:id/nonaktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  nonaktifkanMentor
);

router.patch(
  "/mentor/:id/aktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  aktifkanMentor
);


router.post(
  "/buat-admin",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  buatAdmin
);

router.get(
  "/admin",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  getAdmin
);

router.patch(
  "/admin/:id/nonaktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  nonaktifkanAdmin
);

router.patch(
  "/admin/:id/aktif",
  authMiddleware,
  roleMiddleware(["superadmin"]),
  aktifkanAdmin
);

export default router;
