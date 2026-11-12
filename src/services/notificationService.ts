import Notification from "../models/Notification";
import { Types } from "mongoose";

export interface CreateNotificationDTO {
  recipientId?: string | Types.ObjectId;
  recipientRoles?: string[];
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "alert";
  linkUrl?: string;
}

/**
 * Membuat notifikasi baru secara fleksibel untuk user tertentu atau role tertentu
 */
export const createNotification = async (dto: CreateNotificationDTO) => {
  try {
    const notif = await Notification.create({
      recipientId: dto.recipientId ? new Types.ObjectId(dto.recipientId.toString()) : null,
      recipientRoles: dto.recipientRoles || [],
      title: dto.title,
      message: dto.message,
      type: dto.type || "info",
      linkUrl: dto.linkUrl || "",
      readBy: [],
    });
    return notif;
  } catch (error) {
    console.error("❌ [NotificationService] Gagal membuat notifikasi:", error);
    return null;
  }
};

/**
 * Mengambil daftar notifikasi untuk user (berdasarkan ID spesifik atau role user)
 */
export const getUserNotifications = async (userId: string, userRoles: string[], limit: number = 20) => {
  const userObjId = new Types.ObjectId(userId);

  const filter = {
    $or: [
      { recipientId: userObjId },
      { recipientRoles: { $in: userRoles } },
    ],
  };

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const formatted = notifications.map((n: any) => ({
    id: n._id.toString(),
    title: n.title,
    message: n.message,
    type: n.type,
    linkUrl: n.linkUrl,
    createdAt: n.createdAt,
    isRead: Array.isArray(n.readBy) && n.readBy.some((uid: any) => uid.toString() === userId),
  }));

  const unreadCount = await Notification.countDocuments({
    ...filter,
    readBy: { $ne: userObjId },
  });

  return {
    notifications: formatted,
    unreadCount,
  };
};

/**
 * Menandai satu notifikasi sebagai telah dibaca
 */
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  const userObjId = new Types.ObjectId(userId);
  await Notification.findByIdAndUpdate(
    notificationId,
    { $addToSet: { readBy: userObjId } },
    { new: true }
  );
  return true;
};

/**
 * Menandai semua notifikasi milik user sebagai telah dibaca
 */
export const markAllNotificationsAsRead = async (userId: string, userRoles: string[]) => {
  const userObjId = new Types.ObjectId(userId);
  const filter = {
    $or: [
      { recipientId: userObjId },
      { recipientRoles: { $in: userRoles } },
    ],
  };

  await Notification.updateMany(filter, {
    $addToSet: { readBy: userObjId },
  });
  return true;
};

