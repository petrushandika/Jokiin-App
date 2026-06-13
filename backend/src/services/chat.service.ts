import { eq, asc } from "drizzle-orm";
import { db, dbRead } from "../lib/database.ts";
import { chats, messages, orders, users } from "../../database/schema.ts";
import { emitToOrder } from "../lib/socket.ts";
import { notify } from "./notification.service.ts";

// ─── Patterns yang diblokir ───────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  { pattern: /(\+62|08)[0-9]{8,11}/g, reason: "nomor_hp" },
  { pattern: /[\w.-]+@[\w.-]+\.\w{2,}/g, reason: "email" },
  { pattern: /wa\.me\/|chat\.whatsapp\.com/gi, reason: "link_whatsapp" },
  { pattern: /\b[0-9]{10,16}\b/g, reason: "nomor_rekening" },
];

// ─── Get Messages ─────────────────────────────────────────────────────────────

export async function getChatMessages(orderId: string, userId: string) {
  const chat = await dbRead.query.chats.findFirst({
    where: eq(chats.order_id, orderId),
  });

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  if (chat.customer_id !== userId && chat.worker_id !== userId) {
    throw new Error("FORBIDDEN");
  }

  return dbRead.query.messages.findMany({
    where: eq(messages.chat_id, chat.id),
    orderBy: [asc(messages.created_at)],
    with: {
      sender: { columns: { display_name: true, avatar_url: true } },
    },
  });
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendMessage(input: {
  orderId: string;
  senderId: string;
  content: string;
  fileUrls?: string[];
}) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.order_id, input.orderId),
    with: { order: true },
  });

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  if (chat.is_locked) throw new Error("CHAT_LOCKED");
  if (chat.customer_id !== input.senderId && chat.worker_id !== input.senderId) {
    throw new Error("FORBIDDEN");
  }

  // Moderasi konten
  const modResult = moderateContent(input.content);
  if (modResult.blocked) {
    return {
      blocked: true,
      reason: modResult.reason,
      message: null,
    };
  }

  const [msg] = await db
    .insert(messages)
    .values({
      chat_id: chat.id,
      sender_id: input.senderId,
      content: input.content,
      file_urls: input.fileUrls ?? [],
      message_type: input.fileUrls?.length ? "file" : "text",
      is_flagged: modResult.flagged,
      flag_reason: modResult.flagReason,
    })
    .returning();

  // Emit real-time ke semua peserta order
  emitToOrder(input.orderId, "chat:message", msg);

  // Notifikasi ke pihak lain (bukan pengirim)
  const recipientId = chat.customer_id === input.senderId ? chat.worker_id : chat.customer_id;
  const sender = await dbRead.query.users.findFirst({
    where: eq(users.id, input.senderId),
    columns: { display_name: true },
  });
  await notify.newChatMessage(recipientId, input.orderId, sender?.display_name ?? "Pengguna");

  return { blocked: false, message: msg };
}

// ─── Create Chat (dibuat saat order matched) ──────────────────────────────────

export async function createOrderChat(
  orderId: string,
  customerId: string,
  workerId: string
) {
  const [chat] = await db
    .insert(chats)
    .values({ order_id: orderId, customer_id: customerId, worker_id: workerId, is_locked: false })
    .returning();

  return chat!;
}

// ─── Mark as Read ─────────────────────────────────────────────────────────────

export async function markMessagesRead(chatId: string, userId: string) {
  const chat = await db.query.chats.findFirst({ where: eq(chats.id, chatId) });
  if (!chat) return;
  if (chat.customer_id !== userId && chat.worker_id !== userId) return;

  await db
    .update(messages)
    .set({ read_at: new Date() })
    .where(eq(messages.chat_id, chatId));
}

// ─── Moderasi ─────────────────────────────────────────────────────────────────

function moderateContent(content: string): {
  blocked: boolean;
  flagged: boolean;
  reason?: string;
  flagReason?: string;
} {
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      pattern.lastIndex = 0;
      return { blocked: true, flagged: true, reason, flagReason: reason };
    }
    pattern.lastIndex = 0;
  }
  return { blocked: false, flagged: false };
}
