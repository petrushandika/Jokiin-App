import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.ts";
import { requireAdmin, requireSuperAdmin } from "../middlewares/adminAuth.ts";
import { db, dbRead } from "../lib/database.ts";
import {
  users, workerProfiles, orders, withdrawals, wallets,
  walletTransactions, auditLogs, categories,
} from "../../database/schema.ts";
import { eq, desc, and, count, like, sql } from "drizzle-orm";
import { ok, err } from "../lib/response.ts";
import { logAudit } from "../services/audit.service.ts";
import { notify } from "../services/notification.service.ts";
import { applyPenalty } from "../services/reputation.service.ts";
import type { AppVariables } from "../lib/context.ts";

const admin = new Hono<{ Variables: AppVariables }>();

// Semua route admin wajib auth + admin role
admin.use("*", requireAuth, requireAdmin);

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

admin.get("/stats", async (c) => {
  const [
    totalUsers,
    totalOrders,
    totalWorkers,
    pendingWithdrawals,
  ] = await Promise.all([
    dbRead.select({ count: count() }).from(users),
    dbRead.select({ count: count() }).from(orders),
    dbRead.select({ count: count() }).from(workerProfiles),
    dbRead.select({ count: count() }).from(withdrawals).where(eq(withdrawals.status, "pending")),
  ]);

  return c.json(ok({
    totalUsers: totalUsers[0]?.count ?? 0,
    totalOrders: totalOrders[0]?.count ?? 0,
    totalWorkers: totalWorkers[0]?.count ?? 0,
    pendingWithdrawals: pendingWithdrawals[0]?.count ?? 0,
  }));
});

// ─── User Management ──────────────────────────────────────────────────────────

admin.get("/users", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const search = c.req.query("search");
  const role = c.req.query("role");

  const offset = (page - 1) * limit;
  const whereConditions = [];

  if (search) whereConditions.push(like(users.email, `%${search}%`));
  if (role) whereConditions.push(eq(users.role, role as "customer" | "worker" | "admin" | "super_admin"));

  const [list, total] = await Promise.all([
    dbRead.query.users.findMany({
      where: whereConditions.length ? and(...whereConditions) : undefined,
      orderBy: [desc(users.created_at)],
      limit,
      offset,
      columns: { password_hash: false },
    }),
    dbRead.select({ count: count() }).from(users).where(whereConditions.length ? and(...whereConditions) : undefined),
  ]);

  return c.json(ok(list, { total: total[0]?.count ?? 0, page, limit }));
});

admin.get("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const user = await dbRead.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { password_hash: false },
    with: { workerProfile: true },
  });
  if (!user) return c.json(err("NOT_FOUND", "User tidak ditemukan"), 404);
  return c.json(ok(user));
});

// Suspend user
admin.post(
  "/users/:id/suspend",
  zValidator("json", z.object({
    durationDays: z.number().int().min(1).max(365),
    reason: z.string().min(10),
  })),
  async (c) => {
    const userId = c.req.param("id");
    const { durationDays, reason } = c.req.valid("json");
    const actorId = c.get("userId");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json(err("NOT_FOUND", "User tidak ditemukan"), 404);

    const suspendedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    await db.update(users).set({ is_suspended: true, suspended_until: suspendedUntil }).where(eq(users.id, userId));

    await logAudit({
      action: "user_suspended",
      actorId,
      targetId: userId,
      targetType: "user",
      before: { is_suspended: user.is_suspended },
      after: { is_suspended: true, suspended_until: suspendedUntil },
      metadata: { reason, durationDays },
      ipAddress: c.req.header("x-forwarded-for"),
    });

    return c.json(ok(null, { message: `User disuspend hingga ${suspendedUntil.toISOString()}` }));
  }
);

// Unsuspend user
admin.post("/users/:id/unsuspend", async (c) => {
  const userId = c.req.param("id");
  const actorId = c.get("userId");

  await db.update(users).set({ is_suspended: false, suspended_until: null }).where(eq(users.id, userId));

  await logAudit({
    action: "admin_override",
    actorId,
    targetId: userId,
    targetType: "user",
    metadata: { action: "unsuspend" },
  });

  return c.json(ok(null, { message: "Suspend dicabut" }));
});

// Ban user
admin.post(
  "/users/:id/ban",
  requireSuperAdmin,
  zValidator("json", z.object({ reason: z.string().min(10) })),
  async (c) => {
    const userId = c.req.param("id");
    const { reason } = c.req.valid("json");
    const actorId = c.get("userId");

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json(err("NOT_FOUND", "User tidak ditemukan"), 404);

    await db.update(users).set({ is_banned: true }).where(eq(users.id, userId));

    await logAudit({
      action: "user_banned",
      actorId,
      targetId: userId,
      targetType: "user",
      metadata: { reason },
    });

    return c.json(ok(null, { message: "User berhasil di-ban" }));
  }
);

// ─── Worker Verification ──────────────────────────────────────────────────────

admin.get("/workers/pending", async (c) => {
  // Worker yang belum terverifikasi (is_verified = false di user table)
  const unverified = await dbRead.query.workerProfiles.findMany({
    with: {
      user: {
        columns: { id: true, display_name: true, email: true, phone: true, created_at: true, is_verified: true },
      },
    },
    orderBy: (wp, { asc }) => [asc(wp.created_at)],
    limit: 50,
  });

  return c.json(ok(unverified.filter((w) => !w.user.is_verified)));
});

admin.post("/workers/:workerId/verify", async (c) => {
  const workerId = c.req.param("workerId");
  const actorId = c.get("userId");

  const profile = await db.query.workerProfiles.findFirst({
    where: eq(workerProfiles.id, workerId),
  });
  if (!profile) return c.json(err("NOT_FOUND", "Worker tidak ditemukan"), 404);

  await db.update(users).set({ is_verified: true }).where(eq(users.id, profile.user_id));

  await logAudit({
    action: "admin_override",
    actorId,
    targetId: workerId,
    targetType: "user",
    metadata: { action: "worker_verified" },
  });

  return c.json(ok(null, { message: "Worker berhasil diverifikasi" }));
});

// Manual penalty untuk worker
admin.post(
  "/workers/:workerId/penalty",
  zValidator("json", z.object({
    type: z.enum([
      "cancel_before_start", "cancel_mid_work", "late_under_30min", "late_over_30min",
      "no_submission", "rating_manipulation", "scope_violation", "external_contact_attempt",
    ]),
    orderId: z.string().uuid().optional(),
    reason: z.string().min(10),
  })),
  async (c) => {
    const workerId = c.req.param("workerId");
    const { type, orderId, reason } = c.req.valid("json");
    const actorId = c.get("userId");

    await applyPenalty({ workerId, orderId, type, appliedById: actorId });

    await logAudit({
      action: "penalty_applied",
      actorId,
      targetId: workerId,
      targetType: "user",
      metadata: { type, reason, orderId },
    });

    return c.json(ok(null, { message: "Penalti berhasil diterapkan" }));
  }
);

// Verify rekening bank worker
admin.post("/workers/:workerId/verify-bank", async (c) => {
  const workerId = c.req.param("workerId");
  const actorId = c.get("userId");

  const profile = await db.query.workerProfiles.findFirst({
    where: eq(workerProfiles.id, workerId),
  });
  if (!profile) return c.json(err("NOT_FOUND", "Worker tidak ditemukan"), 404);

  await db.update(wallets).set({
    is_bank_verified: true,
    bank_verified_at: new Date(),
  }).where(eq(wallets.user_id, profile.user_id));

  await logAudit({
    action: "admin_override",
    actorId,
    targetId: workerId,
    targetType: "user",
    metadata: { action: "bank_verified" },
  });

  return c.json(ok(null, { message: "Rekening bank berhasil diverifikasi" }));
});

// ─── Withdrawal Management ────────────────────────────────────────────────────

admin.get("/withdrawals", async (c) => {
  const status = c.req.query("status") ?? "pending";
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const offset = (page - 1) * limit;

  const [list, total] = await Promise.all([
    dbRead.query.withdrawals.findMany({
      where: eq(withdrawals.status, status as "pending" | "processing" | "completed" | "failed" | "rejected"),
      orderBy: [desc(withdrawals.created_at)],
      limit,
      offset,
      with: {
        user: { columns: { display_name: true, email: true } },
      },
    }),
    dbRead.select({ count: count() }).from(withdrawals)
      .where(eq(withdrawals.status, status as "pending" | "processing" | "completed" | "failed" | "rejected")),
  ]);

  return c.json(ok(list, { total: total[0]?.count ?? 0, page, limit }));
});

admin.post(
  "/withdrawals/:id/process",
  zValidator("json", z.object({
    action: z.enum(["approve", "reject"]),
    rejectionReason: z.string().optional(),
  })),
  async (c) => {
    const withdrawId = c.req.param("id");
    const { action, rejectionReason } = c.req.valid("json");
    const actorId = c.get("userId");

    const withdrawal = await db.query.withdrawals.findFirst({
      where: eq(withdrawals.id, withdrawId),
    });
    if (!withdrawal) return c.json(err("NOT_FOUND", "Withdrawal tidak ditemukan"), 404);
    if (withdrawal.status !== "pending") return c.json(err("ALREADY_PROCESSED", "Withdrawal sudah diproses"), 400);

    if (action === "approve") {
      await db.transaction(async (tx) => {
        await tx.update(withdrawals).set({
          status: "completed",
          processed_by_id: actorId,
          processed_at: new Date(),
          updated_at: new Date(),
        }).where(eq(withdrawals.id, withdrawId));

        // Increment total_withdrawn di wallet
        await tx.update(wallets).set({
          total_withdrawn: sql`${wallets.total_withdrawn} + ${withdrawal.net_amount}`,
        }).where(eq(wallets.id, withdrawal.wallet_id));
      });

      await notify.withdrawalProcessed(withdrawal.user_id, Number(withdrawal.net_amount));

      await logAudit({
        action: "withdrawal_processed",
        actorId,
        targetId: withdrawId,
        targetType: "withdrawal",
        after: { status: "completed" },
        ipAddress: c.req.header("x-forwarded-for"),
      });
    } else {
      // Refund saldo jika ditolak
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.id, withdrawal.wallet_id),
      });

      if (wallet) {
        await db.transaction(async (tx) => {
          const balanceBefore = Number(wallet.balance);
          const balanceAfter = balanceBefore + Number(withdrawal.amount);

          await tx.update(wallets).set({
            balance: String(balanceAfter),
          }).where(eq(wallets.id, wallet.id));

          await tx.insert(walletTransactions).values({
            wallet_id: wallet.id,
            type: "credit",
            amount: withdrawal.amount,
            balance_before: String(balanceBefore),
            balance_after: String(balanceAfter),
            description: `Refund penarikan ditolak: ${rejectionReason ?? "Alasan tidak diketahui"}`,
          });

          await tx.update(withdrawals).set({
            status: "rejected",
            failure_reason: rejectionReason,
            processed_by_id: actorId,
            processed_at: new Date(),
            updated_at: new Date(),
          }).where(eq(withdrawals.id, withdrawId));
        });
      }
    }

    return c.json(ok(null, { message: action === "approve" ? "Withdrawal disetujui" : "Withdrawal ditolak" }));
  }
);

// ─── Order Management ─────────────────────────────────────────────────────────

admin.get("/orders", async (c) => {
  const status = c.req.query("status");
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const offset = (page - 1) * limit;

  const list = await dbRead.query.orders.findMany({
    where: status ? eq(orders.status, status as typeof orders.$inferSelect["status"]) : undefined,
    orderBy: [desc(orders.created_at)],
    limit,
    offset,
    with: {
      category: { columns: { name: true } },
      customer: { columns: { display_name: true, email: true } },
      worker: { with: { user: { columns: { display_name: true } } } },
    },
  });

  return c.json(ok(list));
});

// Cancel order (admin override)
admin.post(
  "/orders/:id/cancel",
  zValidator("json", z.object({ reason: z.string().min(10) })),
  async (c) => {
    const orderId = c.req.param("id");
    const { reason } = c.req.valid("json");
    const actorId = c.get("userId");

    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) return c.json(err("NOT_FOUND", "Order tidak ditemukan"), 404);

    await db.update(orders).set({
      status: "cancelled",
      cancelled_by_id: actorId,
      cancel_reason: reason,
      cancel_category: "admin_override",
      updated_at: new Date(),
    }).where(eq(orders.id, orderId));

    await logAudit({
      action: "admin_override",
      actorId,
      targetId: orderId,
      targetType: "order",
      before: { status: order.status },
      after: { status: "cancelled" },
      metadata: { reason },
    });

    return c.json(ok(null, { message: "Order dibatalkan oleh admin" }));
  }
);

// ─── Audit Logs ────────────────────────────────────────────────────────────────

admin.get("/audit-logs", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const action = c.req.query("action");
  const targetType = c.req.query("targetType");
  const offset = (page - 1) * limit;

  const conditions = [];
  if (action) conditions.push(eq(auditLogs.action, action as typeof auditLogs.$inferSelect["action"]));
  if (targetType) conditions.push(eq(auditLogs.target_type, targetType));

  const list = await dbRead.query.auditLogs.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(auditLogs.created_at)],
    limit,
    offset,
    with: {
      actor: { columns: { display_name: true, email: true } },
    },
  });

  return c.json(ok(list));
});

// ─── Category Management ──────────────────────────────────────────────────────

admin.post(
  "/categories",
  zValidator("json", z.object({
    name: z.string().min(2).max(100),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
    icon: z.string().max(50).optional(),
    parentId: z.string().uuid().optional(),
    baseDifficultyMin: z.number().int().min(1).max(5).optional(),
    baseDifficultyMax: z.number().int().min(1).max(5).optional(),
    minPricePerPage: z.number().positive().optional(),
    estimatedHoursBase: z.number().positive().optional(),
    sortOrder: z.number().int().optional(),
  })),
  async (c) => {
    const body = c.req.valid("json");

    const [category] = await db.insert(categories).values({
      name: body.name,
      slug: body.slug,
      icon: body.icon,
      parent_id: body.parentId,
      base_difficulty_min: body.baseDifficultyMin ?? 1,
      base_difficulty_max: body.baseDifficultyMax ?? 5,
      min_price_per_page: body.minPricePerPage ? String(body.minPricePerPage) : null,
      estimated_hours_base: body.estimatedHoursBase ? String(body.estimatedHoursBase) : null,
      sort_order: body.sortOrder ?? 0,
    }).returning();

    return c.json(ok(category), 201);
  }
);

admin.patch(
  "/categories/:id",
  zValidator("json", z.object({
    name: z.string().min(2).max(100).optional(),
    icon: z.string().max(50).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    minPricePerPage: z.number().positive().optional(),
    estimatedHoursBase: z.number().positive().optional(),
  })),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;
    if (body.minPricePerPage !== undefined) updates.min_price_per_page = String(body.minPricePerPage);
    if (body.estimatedHoursBase !== undefined) updates.estimated_hours_base = String(body.estimatedHoursBase);

    await db.update(categories).set(updates).where(eq(categories.id, id));

    return c.json(ok(null, { message: "Kategori berhasil diperbarui" }));
  }
);

export default admin;
