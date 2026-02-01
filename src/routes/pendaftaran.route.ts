import { Router } from "express";
import {
  uploadSuratPengantar,
  uploadSuratBalasan,
} from "../middlewares/upload.middleware";
import {
  createPendaftaran,
  getAllPendaftaran,
  cekPendaftaran,
  updateStatus,
  setMentorPeserta,
} from "../controllers/pendaftaran.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

/* CREATE - Publik (untuk form pendaftaran) */
router.post(
  "/",
  uploadSuratPengantar.single("suratPengantar"),
  createPendaftaran,
);

/* READ - Hanya admin/superadmin */
router.get("/cek", cekPendaftaran);
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllPendaftaran,
);

/* UPDATE STATUS - Hanya admin/superadmin */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadSuratBalasan.single("suratBalasan"),
  updateStatus,
);

/* SET MENTOR PER PESERTA - Hanya admin/superadmin */
router.put(
  "/:id/mentor-peserta",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  setMentorPeserta,
);

export default router;
