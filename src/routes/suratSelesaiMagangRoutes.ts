import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadSuratSelesaiMagang } from "../middlewares/upload.middleware";
import {
  uploadSuratSelesaiMagang as uploadSuratSelesaiController,
  getSuratSelesaiMagangByEmail,
  getAllSuratSelesaiMagang,
} from "../controllers/suratSelesaiMagangController";

const router = Router();

// Upload surat selesai magang - hanya superadmin/admin
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadSuratSelesaiMagang.single("file"),
  uploadSuratSelesaiController,
);

// Get surat by email - untuk peserta
router.get("/cek", authMiddleware, getSuratSelesaiMagangByEmail);

// Get all surat - untuk superadmin
router.get(
  "/all",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllSuratSelesaiMagang,
);

export default router;
