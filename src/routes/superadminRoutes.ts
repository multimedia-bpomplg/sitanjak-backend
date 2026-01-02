import { Router } from "express";
import {
  buatAkunPeserta,
  getPeserta,
  nonaktifkanPeserta,
  aktifkanPeserta,
} from "../controllers/superadminController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { getMentor } from "../controllers/mentorController";

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


export default router;
