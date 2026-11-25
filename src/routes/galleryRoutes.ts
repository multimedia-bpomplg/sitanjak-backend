import { Router, Request, Response, NextFunction } from "express";
import {
  getGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  toggleGalleryItemStatus,
  deleteGalleryItem,
  resetGalleryToDefault,
} from "../controllers/galleryController";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadGalleryImage } from "../middlewares/upload.middleware";

const router = Router();

const handleGalleryUpload = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  uploadGalleryImage.single("image")(req, res, (err: any) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Ukuran file gambar setelah kompresi maksimal 350 KB"
          : err.message || "File gambar tidak valid";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

// Publik & Dashboard: ambil daftar gambar galeri
router.get("/", getGalleryItems);

// Admin & Superadmin: tambah gambar galeri baru
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  handleGalleryUpload,
  createGalleryItem,
);

// Admin & Superadmin: reset ke 11 gambar default & bersihkan file lama
router.post(
  "/reset-default",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  resetGalleryToDefault,
);

// Admin & Superadmin: ubah judul / urutan / status atau ganti gambar (hapus file lama)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  handleGalleryUpload,
  updateGalleryItem,
);

// Admin & Superadmin: toggle status aktif/nonaktif
router.patch(
  "/:id/toggle",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  toggleGalleryItemStatus,
);

// Admin & Superadmin: hapus item galeri beserta file di disk
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteGalleryItem,
);

export default router;
