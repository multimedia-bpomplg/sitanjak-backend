import { Router, Request, Response, NextFunction } from "express";
import {
  getHeroSetting,
  uploadHeroImageSetting,
  resetHeroSetting,
} from "../controllers/heroSettingController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadHeroImage } from "../middlewares/upload.middleware";

const router = Router();

const handleHeroUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadHeroImage.single("image")(req, res, (err: any) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ukuran gambar hero maksimal 5MB"
          : err.message || "File gambar tidak valid";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

// Publik: baca gambar hero aktif untuk Landing Page
router.get("/", getHeroSetting);

// Admin & Superadmin mengelola gambar hero
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  handleHeroUpload,
  uploadHeroImageSetting,
);

router.delete(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  resetHeroSetting,
);

export default router;
