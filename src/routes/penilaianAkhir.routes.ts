import { Router } from "express";
import {
  getMyPenilaianAkhir,
  getMentorPenilaianList,
  upsertPenilaianAkhir,
} from "../controllers/penilaianAkhirController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";

const router = Router();

// Peserta melihat penilaian akhir miliknya sendiri
router.get("/me", authMiddleware, getMyPenilaianAkhir);

// Mentor (serta Admin/Superadmin) melihat daftar peserta bimbingan & status penilaian akhir
router.get(
  "/mentor/list",
  authMiddleware,
  roleMiddleware(["mentor", "admin", "superadmin"]),
  getMentorPenilaianList,
);

// Hanya Mentor yang dapat mengisi atau memperbarui penilaian akhir peserta bimbingannya
router.put(
  "/mentor/:pesertaUserId",
  authMiddleware,
  roleMiddleware(["mentor"]),
  upsertPenilaianAkhir,
);

export default router;
