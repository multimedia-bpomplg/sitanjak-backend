import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { notifications, unreadCount } = await getUserNotifications(
      req.user.id,
      req.user.roles,
      25
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

