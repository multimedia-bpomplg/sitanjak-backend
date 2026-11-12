import { Router } from "express";
import {
  getMyNotifications,
  readNotification,
  readAllNotifications,
} from "../controllers/NotificationController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, getMyNotifications);
router.patch("/read-all", authMiddleware, readAllNotifications);
router.patch("/:id/read", authMiddleware, readNotification);

export default router;

