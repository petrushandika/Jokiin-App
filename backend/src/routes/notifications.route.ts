import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.ts";
import * as notificationService from "../services/notification.service.ts";
import { ok } from "../lib/response.ts";

const notificationsRoute = new Hono();

// GET /notifications — Daftar notifikasi user
notificationsRoute.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const unreadOnly = c.req.query("unread") === "true";
  const list = await notificationService.getUserNotifications(userId, unreadOnly);
  return c.json(ok(list));
});

// POST /notifications/read — Mark notifikasi sebagai sudah dibaca
notificationsRoute.post(
  "/read",
  requireAuth,
  zValidator("json", z.object({
    ids: z.array(z.string().uuid()).optional(), // kosong = mark semua
  })),
  async (c) => {
    const userId = c.get("userId");
    const { ids } = c.req.valid("json");
    await notificationService.markNotificationsRead(userId, ids);
    return c.json(ok(null, { message: "Notifikasi ditandai sudah dibaca" }));
  }
);

export default notificationsRoute;
