import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth.ts";
import { db, dbRead } from "../lib/database.ts";
import { users, workerProfiles, wallets } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import { ok, err } from "../lib/response.ts";

const profile = new Hono();

// GET /profile/me — Profil lengkap current user
profile.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await dbRead.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      password_hash: false,
    },
    with: {
      workerProfile: true,
    },
  });
  if (!user) return c.json(err("NOT_FOUND", "User tidak ditemukan"), 404);
  return c.json(ok(user));
});

// PATCH /profile/me — Update profil dasar (display name, avatar, bio)
profile.patch(
  "/me",
  requireAuth,
  zValidator("json", z.object({
    displayName: z.string().min(2).max(100).optional(),
    avatarUrl: z.string().url().optional(),
  })),
  async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (body.displayName) updates.display_name = body.displayName;
    if (body.avatarUrl) updates.avatar_url = body.avatarUrl;

    await db.update(users).set(updates).where(eq(users.id, userId));
    return c.json(ok(null, { message: "Profil berhasil diperbarui" }));
  }
);

// PATCH /profile/worker — Update profil worker (bio, availability, max_active_orders)
profile.patch(
  "/worker",
  requireAuth,
  requireRole("worker"),
  zValidator("json", z.object({
    bio: z.string().max(1000).optional(),
    isOnline: z.boolean().optional(),
    isOnLeave: z.boolean().optional(),
    maxActiveOrders: z.number().int().min(1).max(10).optional(),
    activeHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    activeHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })),
  async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.isOnline !== undefined) updates.is_online = body.isOnline;
    if (body.isOnLeave !== undefined) updates.is_on_leave = body.isOnLeave;
    if (body.maxActiveOrders !== undefined) updates.max_active_orders = body.maxActiveOrders;
    if (body.activeHoursStart !== undefined) updates.active_hours_start = body.activeHoursStart;
    if (body.activeHoursEnd !== undefined) updates.active_hours_end = body.activeHoursEnd;

    await db.update(workerProfiles)
      .set(updates)
      .where(eq(workerProfiles.user_id, userId));

    return c.json(ok(null, { message: "Profil worker berhasil diperbarui" }));
  }
);

// PATCH /profile/bank — Update rekening bank worker (untuk withdraw)
profile.patch(
  "/bank",
  requireAuth,
  requireRole("worker"),
  zValidator("json", z.object({
    bankName: z.string().min(2).max(100),
    bankAccountNumber: z.string().min(6).max(30),
    bankAccountName: z.string().min(2).max(100),
  })),
  async (c) => {
    const userId = c.get("userId");
    const { bankName, bankAccountNumber, bankAccountName } = c.req.valid("json");

    await db.update(wallets).set({
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_name: bankAccountName,
      is_bank_verified: false, // admin harus verifikasi ulang jika ganti rekening
    }).where(eq(wallets.user_id, userId));

    return c.json(ok(null, { message: "Rekening bank berhasil diperbarui. Menunggu verifikasi admin." }));
  }
);

export default profile;
