import { Worker } from "bullmq";
import { redis } from "../lib/redis.ts";
import { db } from "../lib/database.ts";
import { orders, workerProfiles } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import { recalculateReputation } from "../services/reputation.service.ts";

const connection = { host: redis.options.host, port: redis.options.port };

export const reputationWorker = new Worker(
  "reputation-update",
  async (job) => {
    const { orderId, workerId } = job.data as { orderId: string; workerId?: string };

    let resolvedWorkerId = workerId;

    if (!resolvedWorkerId) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        columns: { worker_id: true },
      });
      resolvedWorkerId = order?.worker_id ?? undefined;
    }

    if (!resolvedWorkerId) return { skipped: true, reason: "no_worker" };

    const profile = await db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.id, resolvedWorkerId),
    });

    if (!profile) return { skipped: true, reason: "worker_not_found" };

    await recalculateReputation(resolvedWorkerId);
    console.log(`[Reputation] Recalculated score for worker ${resolvedWorkerId}`);
    return { updated: true };
  },
  { connection, concurrency: 5 }
);

reputationWorker.on("failed", (job, err) => {
  console.error(`[ReputationWorker] Job ${job?.id} failed:`, err.message);
});
