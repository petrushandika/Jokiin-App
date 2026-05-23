import { eq, avg, count, and } from "drizzle-orm";
import { db } from "../lib/database.ts";
import { workerProfiles, reviews, orders, penalties, users } from "../../database/schema.ts";

// ─── Recalculate Reputation ────────────────────────────────────────────────────

export async function recalculateReputation(workerId: string) {
  const [ratingResult] = await db
    .select({ avg: avg(reviews.overall_rating) })
    .from(reviews)
    .innerJoin(orders, eq(orders.id, reviews.order_id))
    .where(eq(orders.worker_id, workerId));

  const [completionResult] = await db
    .select({
      total: count(),
      completed: count(orders.completed_at),
    })
    .from(orders)
    .where(eq(orders.worker_id, workerId));

  const [deadlineResult] = await db
    .select({ onTime: count() })
    .from(orders)
    .where(
      and(
        eq(orders.worker_id, workerId),
        eq(orders.status, "completed"),
      )
    );

  const profile = await db.query.workerProfiles.findFirst({
    where: eq(workerProfiles.id, workerId),
  });
  if (!profile) return;

  const ratingScore = Number(ratingResult?.avg ?? 0) * 20;
  const totalOrders = Number(completionResult?.total ?? 0);
  const completedOrders = Number(completionResult?.completed ?? 0);
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
  const deadlineScore = completedOrders > 0
    ? (Number(deadlineResult?.onTime ?? 0) / completedOrders) * 100
    : 0;

  const responseRate = Number(profile.response_rate ?? 0);
  const repeatRate = Number(profile.repeat_customer_rate ?? 0);

  const reputationScore =
    ratingScore * 0.35 +
    completionRate * 0.25 +
    deadlineScore * 0.20 +
    responseRate * 0.10 +
    repeatRate * 0.10;

  const newBadge = calculateBadge(reputationScore, completedOrders, profile.badge);

  await db.update(workerProfiles).set({
    reputation_score: String(Math.round(reputationScore * 100) / 100),
    rating_score: String(Math.round(ratingScore * 100) / 100),
    completion_rate: String(Math.round(completionRate * 100) / 100),
    deadline_score: String(Math.round(deadlineScore * 100) / 100),
    badge: newBadge,
    total_completed: completedOrders,
    updated_at: new Date(),
  }).where(eq(workerProfiles.id, workerId));
}

// ─── Apply Penalty ────────────────────────────────────────────────────────────

export async function applyPenalty(input: {
  workerId: string;
  orderId?: string;
  type: typeof penalties.$inferInsert["type"];
  appliedById?: string;
}) {
  const penaltyConfig: Record<string, { points: number; strikes: number }> = {
    cancel_before_start: { points: 5, strikes: 1 },
    cancel_mid_work: { points: 15, strikes: 2 },
    late_under_30min: { points: 3, strikes: 0 },
    late_over_30min: { points: 10, strikes: 0 },
    no_submission: { points: 25, strikes: 2 },
    rating_manipulation: { points: 30, strikes: 3 },
    scope_violation: { points: 10, strikes: 1 },
    external_contact_attempt: { points: 10, strikes: 1 },
  };

  const config = penaltyConfig[input.type] ?? { points: 5, strikes: 0 };

  await db.transaction(async (tx) => {
    await tx.insert(penalties).values({
      worker_id: input.workerId,
      order_id: input.orderId,
      type: input.type,
      point_deducted: config.points,
      strikes_added: config.strikes,
      reason: `Penalti otomatis: ${input.type}`,
      applied_by_id: input.appliedById,
    });

    const profile = await tx.query.workerProfiles.findFirst({
      where: eq(workerProfiles.id, input.workerId),
    });
    if (!profile) return;

    const newStrikeCount = profile.strike_count + config.strikes;

    await tx.update(workerProfiles).set({
      strike_count: newStrikeCount,
    }).where(eq(workerProfiles.id, input.workerId));

    // Suspend the user account if strike threshold reached
    if (newStrikeCount >= 3) {
      await tx.update(users).set({
        is_suspended: true,
        suspended_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }).where(eq(users.id, profile.user_id));
    }
  });

  await recalculateReputation(input.workerId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateBadge(
  score: number,
  totalCompleted: number,
  currentBadge: string
): "SPROUT" | "SPARK" | "BLAZE" | "PRIME" | "APEX" {
  if (totalCompleted >= 300 && score >= 93) return "APEX";
  if (totalCompleted >= 150 && score >= 88) return "PRIME";
  if (totalCompleted >= 50 && score >= 82) return "BLAZE";
  if (totalCompleted >= 10 && score >= 75) return "SPARK";
  return "SPROUT";
}
