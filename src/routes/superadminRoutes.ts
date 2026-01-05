import { Router } from "express";
import {
  buatAkunPeserta,
  getPeserta,
  nonaktifkanPeserta,
  aktifkanPeserta,
} from "../controllers/superadminController";
import { authMiddleware } from "../middlelwares/auth.middleware";
import { roleMiddleware } from "../middlelwares/role.middleware";
import { getMentor } from "../controllers/mentorController";
import { buatAdmin, getAdmin } from "../controllers/adminController";

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


export default router;
