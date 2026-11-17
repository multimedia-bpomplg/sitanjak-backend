import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadSuratSelesaiMagang } from "../middlewares/upload.middleware";
import {
  uploadSuratSelesaiMagang as uploadSuratSelesaiController,
  getSuratSelesaiMagangByEmail,
  getAllSuratSelesaiMagang,
  downloadSuratSelesaiMagang,
} from "../controllers/suratSelesaiMagangController";

const router = Router();

router.get("/cek", authMiddleware, getSuratSelesaiMagangByEmail);
router.get("/download", authMiddleware, downloadSuratSelesaiMagang);

router.get(
  "/all",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllSuratSelesaiMagang,
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadSuratSelesaiMagang.single("file"),
  uploadSuratSelesaiController,
);

export default router;
