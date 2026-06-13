import { db } from "../lib/database.ts";
import { notifications } from "../../database/schema.ts";
import { emitToUser } from "../lib/socket.ts";
import { notifyQueue } from "../lib/queue.ts";
import { eq, and } from "drizzle-orm";

export type NotificationType =
  | "order_broadcast"
  | "order_accepted"
  | "order_submitted"
  | "order_approved"
  | "order_revision"
  | "order_completed"
  | "order_cancelled"
  | "payment_confirmed"
  | "wallet_credited"
  | "wallet_debited"
  | "withdrawal_processed"
  | "chat_message"
  | "otp_verify"
  | "penalty_applied"
  | "badge_upgrade";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: ("in_app" | "whatsapp" | "email")[];
}

// Simpan notifikasi ke DB + emit Socket.io real-time
export async function sendNotification(payload: NotificationPayload) {
  const channels = payload.channels ?? ["in_app"];

  // Simpan in-app notification
  if (channels.includes("in_app")) {
    const [notif] = await db.insert(notifications).values({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channel: "in_app",
    }).returning();

    // Real-time emit
    emitToUser(payload.userId, "notification", {
      id: notif!.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      createdAt: notif!.created_at,
    });
  }

  // WhatsApp via Fonnte (queue)
  if (channels.includes("whatsapp") && process.env.FONNTE_TOKEN) {
    await notifyQueue.add("whatsapp", {
      userId: payload.userId,
      message: `*${payload.title}*\n\n${payload.body}`,
    });
  }

  // Email via Resend (queue)
  if (channels.includes("email") && process.env.RESEND_API_KEY) {
    await notifyQueue.add("email", {
      userId: payload.userId,
      subject: payload.title,
      body: payload.body,
    });
  }
}

// Preset notifications untuk event-event umum
export const notify = {
  orderBroadcast: (workerId: string, orderId: string, title: string) =>
    sendNotification({
      userId: workerId,
      type: "order_broadcast",
      title: "Order Baru Tersedia!",
      body: `Ada order "${title}" yang cocok dengan keahlianmu. Segera ambil sebelum kehabisan!`,
      data: { orderId },
      channels: ["in_app", "whatsapp"],
    }),

  orderAccepted: (customerId: string, orderId: string, workerName: string) =>
    sendNotification({
      userId: customerId,
      type: "order_accepted",
      title: "Worker Ditemukan!",
      body: `${workerName} telah menerima ordermu. Kamu bisa mulai chat sekarang.`,
      data: { orderId },
      channels: ["in_app", "whatsapp"],
    }),

  orderSubmitted: (customerId: string, orderId: string) =>
    sendNotification({
      userId: customerId,
      type: "order_submitted",
      title: "Hasil Order Sudah Dikirim",
      body: "Worker telah mengirim hasil. Silakan review dan approve dalam 48 jam.",
      data: { orderId },
      channels: ["in_app", "whatsapp"],
    }),

  orderApproved: (workerId: string, orderId: string, amount: number) =>
    sendNotification({
      userId: workerId,
      type: "order_approved",
      title: "Order Disetujui!",
      body: `Customer menyetujui hasil kerjamu. Dana Rp ${amount.toLocaleString("id")} sedang diproses.`,
      data: { orderId, amount },
      channels: ["in_app"],
    }),

  revisionRequested: (workerId: string, orderId: string, note: string) =>
    sendNotification({
      userId: workerId,
      type: "order_revision",
      title: "Permintaan Revisi",
      body: `Customer meminta revisi: "${note.slice(0, 100)}"`,
      data: { orderId },
      channels: ["in_app", "whatsapp"],
    }),

  walletCredited: (userId: string, amount: number) =>
    sendNotification({
      userId,
      type: "wallet_credited",
      title: "Dana Masuk",
      body: `Rp ${amount.toLocaleString("id")} telah ditambahkan ke saldo tersediamu.`,
      data: { amount },
      channels: ["in_app"],
    }),

  withdrawalProcessed: (userId: string, netAmount: number) =>
    sendNotification({
      userId,
      type: "withdrawal_processed",
      title: "Penarikan Diproses",
      body: `Rp ${netAmount.toLocaleString("id")} sedang dalam proses transfer. Estimasi masuk T+1 hari kerja.`,
      data: { netAmount },
      channels: ["in_app", "whatsapp"],
    }),

  penaltyApplied: (workerId: string, type: string, points: number) =>
    sendNotification({
      userId: workerId,
      type: "penalty_applied",
      title: "Penalti Diberikan",
      body: `Kamu mendapat penalti ${points} poin karena: ${type.replace(/_/g, " ")}`,
      data: { penaltyType: type, points },
      channels: ["in_app", "whatsapp"],
    }),

  badgeUpgrade: (workerId: string, newBadge: string) =>
    sendNotification({
      userId: workerId,
      type: "badge_upgrade",
      title: "Selamat! Badge Naik Level",
      body: `Reputasimu meningkat! Kamu sekarang punya badge ${newBadge}.`,
      data: { badge: newBadge },
      channels: ["in_app", "whatsapp"],
    }),

  newChatMessage: (recipientId: string, orderId: string, senderName: string) =>
    sendNotification({
      userId: recipientId,
      type: "chat_message",
      title: `Pesan baru dari ${senderName}`,
      body: "Kamu mendapat pesan baru. Buka untuk membalas.",
      data: { orderId },
      channels: ["in_app"],
    }),
};

// Get user notifications
export async function getUserNotifications(userId: string, unreadOnly = false) {
  const { dbRead } = await import("../lib/database.ts");
  return dbRead.query.notifications.findMany({
    where: unreadOnly
      ? and(eq(notifications.user_id, userId), eq(notifications.is_read, false))
      : eq(notifications.user_id, userId),
    orderBy: (n, { desc }) => [desc(n.created_at)],
    limit: 50,
  });
}

// Mark notifications as read
export async function markNotificationsRead(userId: string, notifIds?: string[]) {
  const { inArray } = await import("drizzle-orm");
  const where = notifIds
    ? and(eq(notifications.user_id, userId), inArray(notifications.id, notifIds))
    : and(eq(notifications.user_id, userId), eq(notifications.is_read, false));

  await db.update(notifications).set({ is_read: true, read_at: new Date() }).where(where);
}
