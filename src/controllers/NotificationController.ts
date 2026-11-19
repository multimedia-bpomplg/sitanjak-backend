import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";
import PushSubscription from "../models/PushSubscription";
import { getPublicVapidKey } from "../services/pushNotificationService";

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { notifications, unreadCount } = await getUserNotifications(
      req.user.id,
      req.user.roles,
      50
    );

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Error getMyNotifications:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat notifikasi",
    });
  }
};

export const readNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    await markNotificationAsRead(id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notifikasi telah dibaca",
    });
  } catch (error) {
    console.error("Error readNotification:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui notifikasi",
    });
  }
};

export const readAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await markAllNotificationsAsRead(req.user.id, req.user.roles);

    return res.status(200).json({
      success: true,
      message: "Semua notifikasi telah ditandai sudah dibaca",
    });
  } catch (error) {
    console.error("Error readAllNotifications:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui semua notifikasi",
    });
  }
};

export const getVapidPublicKey = async (_req: AuthRequest, res: Response) => {
  const publicKey = getPublicVapidKey();
  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: "VAPID public key belum dikonfigurasi di server",
    });
  }
  return res.status(200).json({
    success: true,
    publicKey,
  });
};

export const getPushSubscriptionStatus = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const endpoint = String(req.query.endpoint || "").trim();
    if (!endpoint) {
      const count = await PushSubscription.countDocuments({
        user: req.user.id,
        isActive: true,
      });
      return res.status(200).json({
        success: true,
        subscribed: count > 0,
      });
    }

    const exists = await PushSubscription.exists({
      user: req.user.id,
      endpoint,
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      subscribed: Boolean(exists),
    });
  } catch (error) {
    console.error("Error getPushSubscriptionStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memeriksa status langganan notifikasi perangkat",
    });
  }
};

export const subscribePush = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { subscription } = req.body || {};
    const targetSub = subscription || req.body;
    const endpoint = String(targetSub?.endpoint || "").trim();
    const p256dh = String(targetSub?.keys?.p256dh || "").trim();
    const auth = String(targetSub?.keys?.auth || "").trim();

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({
        success: false,
        message: "Data PushSubscription (endpoint & keys) tidak valid",
      });
    }

    const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          user: req.user.id,
          email: (req.user.email || "").toLowerCase(),
          endpoint,
          keys: { p256dh, auth },
          userAgent,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Notifikasi perangkat berhasil diaktifkan",
    });
  } catch (error) {
    console.error("Error subscribePush:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan langganan notifikasi perangkat",
    });
  }
};

export const unsubscribePush = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const endpoint = String(
      req.body?.endpoint || req.query?.endpoint || "",
    ).trim();

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: "Endpoint langganan wajib disertakan",
      });
    }

    await PushSubscription.deleteOne({
      user: req.user.id,
      endpoint,
    });

    return res.status(200).json({
      success: true,
      message: "Notifikasi perangkat dinonaktifkan untuk perangkat ini",
    });
  } catch (error) {
    console.error("Error unsubscribePush:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menonaktifkan notifikasi perangkat",
    });
  }
};

