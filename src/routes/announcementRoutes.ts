import { Router } from "express";
import {
  createAnnouncement,
  getAnnouncementByType,
  getAllAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
  toggleAnnouncementStatus,
} from "../controllers/announcementController";

import { authMiddleware } from "../middlewares/auth.middleware";
import { roleMiddleware } from "../middlewares/role.middleware";
import { uploadBanner } from "../middlewares/upload.middleware";

const router = Router();

/* SUPERADMIN */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  uploadBanner.single("image"),
  createAnnouncement,
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  getAllAnnouncements,
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  deleteAnnouncement,
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  uploadBanner.single("image"),
  updateAnnouncement,
);

router.patch(
  "/:id/toggle",
  authMiddleware,
  roleMiddleware(["superadmin", "admin"]),
  toggleAnnouncementStatus,
);

/* PUBLIC */
router.get("/:type", getAnnouncementByType);

export default router;
