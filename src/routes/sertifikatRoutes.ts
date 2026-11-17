import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadSertifikatMagang } from "../middlewares/upload.middleware";
import {
  uploadSertifikatMagangController,
  getSertifikatByEmail,
  getAllSertifikat,
  downloadSertifikat,
} from "../controllers/sertifikatController";

const router = Router();

router.get("/cek", authMiddleware, getSertifikatByEmail);
router.get("/download", authMiddleware, downloadSertifikat);

router.get(
  "/all",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  getAllSertifikat,
);

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadSertifikatMagang.single("file"),
  uploadSertifikatMagangController,
);

export default router;
