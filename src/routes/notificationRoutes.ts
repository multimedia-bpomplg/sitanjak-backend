import { Router } from "express";
import {
  getMyNotifications,
  readNotification,
  readAllNotifications,
  getVapidPublicKey,
  getPushSubscriptionStatus,
  subscribePush,
  unsubscribePush,
} from "../controllers/NotificationController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/push/vapid-public-key", authMiddleware, getVapidPublicKey);
router.get("/push/status", authMiddleware, getPushSubscriptionStatus);
router.post("/push/subscribe", authMiddleware, subscribePush);
router.delete("/push/unsubscribe", authMiddleware, unsubscribePush);
router.post("/push/unsubscribe", authMiddleware, unsubscribePush);

router.get("/", authMiddleware, getMyNotifications);
router.patch("/read-all", authMiddleware, readAllNotifications);
router.patch("/:id/read", authMiddleware, readNotification);

export default router;
