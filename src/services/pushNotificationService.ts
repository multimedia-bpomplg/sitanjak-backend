import webpush from "web-push";
import { Types } from "mongoose";
import PushSubscription from "../models/PushSubscription";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let vapidInitialized = false;
let vapidMissingWarned = false;

function ensureVapidConfigured(): boolean {
  if (vapidInitialized) return true;

  const publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = (
    process.env.VAPID_SUBJECT || "mailto:admin@sitanjak.tech"
  ).trim();

  if (!publicKey || !privateKey) {
    if (!vapidMissingWarned) {
      vapidMissingWarned = true;
      console.warn(
        "⚠️ [PushService] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum dikonfigurasi. Web Push tidak akan dikirim.",
      );
    }
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialized = true;
  return true;
}

export function getPublicVapidKey(): string {
  return (process.env.VAPID_PUBLIC_KEY || "").trim();
}

/**
 * Mengirim Web Push Notification ke semua perangkat aktif milik user tertentu.
 * Subscription yang sudah kedaluwarsa (404/410) akan otomatis dinonaktifkan/dihapus.
 */
export async function sendPushToUser(
  userId: string | Types.ObjectId,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0 };
  }

  let userObjId: Types.ObjectId;
  try {
    userObjId = new Types.ObjectId(userId.toString());
  } catch {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await PushSubscription.find({
    user: userObjId,
    isActive: true,
  }).lean();

  if (!subscriptions.length) {
    return { sent: 0, failed: 0 };
  }

  const serializedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard/peserta",
    tag: payload.tag || `sitanjak-${Date.now()}`,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          serializedPayload,
          { TTL: 60 * 60 * 12 }, // Simpan maksimal 12 jam di push service jika HP sedang offline
        );
        sent++;
        await PushSubscription.updateOne(
          { _id: sub._id },
          { $set: { lastSuccessAt: new Date() } },
        ).catch(() => {});
      } catch (err: any) {
        failed++;
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription sudah tidak valid atau dicabut oleh browser/OS
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
          await PushSubscription.updateOne(
            { _id: sub._id },
            { $set: { lastErrorAt: new Date() } },
          ).catch(() => {});
          console.warn(
            `⚠️ [PushService] Gagal kirim push ke ${sub.email}:`,
            err?.message || err,
          );
        }
      }
    }),
  );

  return { sent, failed };
}
