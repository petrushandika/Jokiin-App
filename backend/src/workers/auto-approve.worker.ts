import { Worker } from "bullmq";
import { redis } from "../lib/redis.ts";
import { db } from "../lib/database.ts";
import { orders } from "../../database/schema.ts";
import { eq, and } from "drizzle-orm";
import { reputationQueue } from "../lib/queue.ts";
import { releaseEscrow } from "../services/escrow.service.ts";

const connection = { host: redis.options.host, port: redis.options.port };

export const autoApproveWorker = new Worker(
  "auto-approve",
  async (job) => {
    const { orderId } = job.data as { orderId: string };

    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.status, "submitted")),
    });

    if (!order) return { skipped: true, reason: "order_not_submitted" };

    // Update order status to completed first
    await db.update(orders).set({
      status: "completed",
      completed_at: new Date(),
      updated_at: new Date(),
    }).where(eq(orders.id, orderId));

    // releaseEscrow handles both the escrow status update and wallet credit atomically
    await releaseEscrow(orderId);
    await reputationQueue.add("update-score", { orderId });

    console.log(`[AutoApprove] Order ${orderId} auto-approved after 48h timeout`);
    return { approved: true };
  },
  { connection, concurrency: 10 }
);

autoApproveWorker.on("failed", (job, err) => {
  console.error(`[AutoApproveWorker] Job ${job?.id} failed:`, err.message);
});
