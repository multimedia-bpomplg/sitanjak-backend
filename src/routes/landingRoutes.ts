// routes/landingRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import {
  getAllLayouts,
  getLayoutBySection,
  createLayout,
  updateLayout,
  deleteImageFromLayout,
  toggleLayoutActive,
  deleteLayout,
  getAvailableSections,
} from "../controllers/landingController";
import {
  uploadLandingImage,
  uploadMultipleImages,
} from "../middlewares/uploadLanding.middleware";

const router = Router();

/* ================= LANDING LAYOUT ROUTES ================= */

// Public routes (untuk frontend)
router.get("/landing/layouts", getAllLayouts);
router.get("/landing/layout/:section", getLayoutBySection);
router.get("/landing/sections", getAvailableSections);

// Protected routes (hanya admin & superadmin)
router.post(
  "/landing/layout",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadMultipleImages,
  createLayout,
);

router.put(
  "/landing/layout/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  uploadMultipleImages,
  updateLayout,
);

router.patch(
  "/landing/layout/:id/toggle",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  toggleLayoutActive,
);

router.delete(
  "/landing/layout/:id/image",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteImageFromLayout,
);

router.delete(
  "/landing/layout/:id",
  authMiddleware,
  roleMiddleware(["admin", "superadmin"]),
  deleteLayout,
);

export default router;
