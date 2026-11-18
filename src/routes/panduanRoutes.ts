import { Router, Request, Response, NextFunction } from "express";
import {
  getAllPanduan,
  getPublicPanduan,
  uploadPanduanByTarget,
  deletePanduanByTarget,
} from "../controllers/panduanController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadPanduan } from "../middlewares/upload.middleware";

const router = Router();

const handlePanduanUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadPanduan.single("file")(req, res, (err: any) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ukuran file PDF maksimal 10MB"
          : err.message || "File tidak valid";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

// Publik: baca link panduan pendaftaran untuk landing page
router.get("/public", getPublicPanduan);

// Semua user login dapat membaca metadata panduan aktif
router.get("/", authMiddleware, getAllPanduan);

// Hanya admin & superadmin yang dapat mengunggah atau menghapus file panduan
router.post(
  "/:target",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  handlePanduanUpload,
  uploadPanduanByTarget,
);

router.delete(
  "/:target",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deletePanduanByTarget,
);

export default router;
