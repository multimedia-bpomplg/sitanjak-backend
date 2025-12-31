import { Router } from "express";
import {
  buatAkunPeserta,
  getPeserta,
  nonaktifkanPeserta,
  aktifkanPeserta,
} from "../controllers/superadminController";
import { authMiddleware } from "../middelwares/auth.middleware";
import { roleMiddleware } from "../middelwares/role.middleware";

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

export default router;
