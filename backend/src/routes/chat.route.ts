import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.ts";
import { rateLimit } from "../middlewares/rateLimit.ts";
import * as chatService from "../services/chat.service.ts";
import { ok, err } from "../lib/response.ts";

const chat = new Hono();

// GET /chats/:orderId/messages
chat.get("/:orderId/messages", requireAuth, async (c) => {
  const orderId = c.req.param("orderId");
  const userId = c.get("userId");
  try {
    const messages = await chatService.getChatMessages(orderId, userId);
    return c.json(ok(messages));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "CHAT_NOT_FOUND") return c.json(err("CHAT_NOT_FOUND", "Chat tidak ditemukan"), 404);
    if (msg === "FORBIDDEN") return c.json(err("FORBIDDEN", "Akses ditolak"), 403);
    throw error;
  }
});

// POST /chats/:orderId/messages
chat.post(
  "/:orderId/messages",
  requireAuth,
  rateLimit({ max: 60, windowSeconds: 60 }),
  zValidator("json", z.object({
    content: z.string().min(1).max(4000),
    fileUrls: z.array(z.string().url()).max(5).optional(),
  })),
  async (c) => {
    const orderId = c.req.param("orderId");
    const userId = c.get("userId");
    const { content, fileUrls } = c.req.valid("json");

    try {
      const result = await chatService.sendMessage({
        orderId,
        senderId: userId,
        content,
        fileUrls,
      });

      if (result.blocked) {
        return c.json(
          err("MESSAGE_BLOCKED", "Pesan diblokir: mengandung kontak eksternal", {
            reason: result.reason,
          }),
          400
        );
      }

      return c.json(ok(result.message), 201);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "CHAT_NOT_FOUND") return c.json(err("CHAT_NOT_FOUND", "Chat tidak ditemukan"), 404);
      if (msg === "CHAT_LOCKED") return c.json(err("CHAT_LOCKED", "Chat sudah dikunci"), 400);
      if (msg === "FORBIDDEN") return c.json(err("FORBIDDEN", "Akses ditolak"), 403);
      throw error;
    }
  }
);

// POST /chats/:chatId/read
chat.post("/:chatId/read", requireAuth, async (c) => {
  const chatId = c.req.param("chatId");
  const userId = c.get("userId");
  await chatService.markMessagesRead(chatId, userId);
  return c.json(ok(null));
});

export default chat;
