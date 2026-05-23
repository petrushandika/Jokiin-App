import { eq, and, sql } from "drizzle-orm";
import { db, dbRead } from "../lib/database";
import { orders, workerProfiles, workerCategoryScores, broadcastLogs } from "../../database/schema";
import { broadcastQueue } from "../lib/queue";
import { redis } from "../lib/redis";

// ─── Start Broadcast ──────────────────────────────────────────────────────────

export async function startBroadcast(orderId: string) {
  await broadcastQueue.add("broadcast", { orderId, batch: 1 }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

// ─── Get Eligible Workers ─────────────────────────────────────────────────────

export async function getEligibleWorkers(orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const minBadge = getMinBadgeForDifficulty(order.difficulty_score as string);
  const badgeValues = getBadgesAbove(minBadge);

  const eligible = await dbRead.query.workerProfiles.findMany({
    where: and(
      eq(workerProfiles.is_online, true),
      eq(workerProfiles.is_on_leave, false),
      sql`${workerProfiles.current_active_orders} < ${workerProfiles.max_active_orders}`,
    ),
    with: {
      categoryScores: {
        where: eq(workerCategoryScores.category_id, order.category_id),
      },
      user: { columns: { is_banned: true, is_suspended: true } },
    },
  });

  const now = new Date();

  const filtered = eligible.filter((w) => {
    if (w.user.is_banned || w.user.is_suspended) return false;
    if (!badgeValues.includes(w.badge)) return false;
    if (w.categoryScores.length === 0) return false;

    const estimatedFinish = new Date(
      now.getTime() + Number(order.estimated_hours) * 60 * 60 * 1000 + 60 * 60 * 1000
    );
    if (order.worker_deadline && estimatedFinish > order.worker_deadline) return false;

    return true;
  });

  const sorted = filtered.sort((a, b) => {
    const scoreA = calcMatchScore(a);
    const scoreB = calcMatchScore(b);
    return scoreB - scoreA;
  });

  return sorted.slice(0, 15);
}

// ─── Accept Order ─────────────────────────────────────────────────────────────

export async function acceptOrder(orderId: string, workerId: string) {
  const lockKey = `order_lock:${orderId}`;
  const locked = await redis.setnx(lockKey, workerId);

  if (!locked) throw new Error("ORDER_ALREADY_TAKEN");

  await redis.expire(lockKey, 300);

  try {
    await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.status, "broadcast")),
      });

      if (!order) throw new Error("ORDER_NOT_AVAILABLE");

      const platformFee = calculatePlatformFeeByBadge(
        Number(order.agreed_price),
        "SPROUT"
      );

      await tx.update(orders).set({
        status: "matched",
        worker_id: workerId,
        started_at: new Date(),
        platform_fee: String(platformFee),
        worker_earnings: String(Number(order.agreed_price) - platformFee),
        updated_at: new Date(),
      }).where(eq(orders.id, orderId));

      await tx.update(workerProfiles).set({
        current_active_orders: sql`${workerProfiles.current_active_orders} + 1`,
      }).where(eq(workerProfiles.id, workerId));
    });

    await broadcastQueue.add("order-taken", { orderId, workerId });
    return true;
  } catch (error) {
    await redis.del(lockKey);
    throw error;
  }
}

// ─── Reject Order ─────────────────────────────────────────────────────────────

export async function rejectOrder(orderId: string, workerId: string) {
  await db.insert(broadcastLogs).values({
    order_id: orderId,
    worker_id: workerId,
    batch_number: 1,
    response: "rejected",
    responded_at: new Date(),
  });
  return true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMinBadgeForDifficulty(difficulty: string): string {
  const map: Record<string, string> = {
    "1": "SPROUT", "2": "SPROUT",
    "3": "SPARK",
    "4": "BLAZE",
    "5": "PRIME",
  };
  return map[difficulty] ?? "SPROUT";
}

function getBadgesAbove(minBadge: string): string[] {
  const order = ["SPROUT", "SPARK", "BLAZE", "PRIME", "APEX"];
  const idx = order.indexOf(minBadge);
  return order.slice(idx);
}

function calcMatchScore(worker: {
  reputation_score: string | null;
  badge: "SPROUT" | "SPARK" | "BLAZE" | "PRIME" | "APEX";
  is_pro: boolean;
  categoryScores: { rating: string | null }[];
}): number {
  const reputation = Number(worker.reputation_score ?? 50);
  const categoryScore = Number(worker.categoryScores[0]?.rating ?? 0) * 20; // 0-5 → 0-100
  const badgeBonus: Record<string, number> = {
    SPROUT: 0, SPARK: 10, BLAZE: 20, PRIME: 30, APEX: 40,
  };
  const badge = badgeBonus[worker.badge] ?? 0;
  const proPts = worker.is_pro ? 5 : 0;

  return reputation * 0.5 + categoryScore * 0.3 + (badge + proPts) * 0.2;
}

function calculatePlatformFeeByBadge(amount: number, badge: string): number {
  const rates: Record<string, number> = {
    SPROUT: 0.15, SPARK: 0.13, BLAZE: 0.12, PRIME: 0.10, APEX: 0.08,
  };
  return Math.round(amount * (rates[badge] ?? 0.15));
}
