import { Worker } from "bullmq";
import { redis } from "../lib/redis.ts";
import { db } from "../lib/database.ts";
import { orders, workerProfiles } from "../../database/schema.ts";
import { eq, and, lt, inArray } from "drizzle-orm";
import { applyPenalty } from "../services/reputation.service.ts";
import { releaseEscrow } from "../services/escrow.service.ts";

const connection = { host: redis.options.host, port: redis.options.port };

export const deadlineWorker = new Worker(
  "deadline-reminders",
  async (job) => {
    const { name, data } = job;

    if (name === "check-overdue") {
      // Cek order yang sudah lewat worker_deadline tapi masih in_progress
      const overdue = await db.query.orders.findMany({
        where: and(
          inArray(orders.status, ["in_progress", "matched"]),
          lt(orders.worker_deadline, new Date()),
        ),
      });

      for (const order of overdue) {
        if (!order.worker_id) continue;

        const minutesLate = Math.floor(
          (Date.now() - (order.worker_deadline?.getTime() ?? Date.now())) / 60_000
        );

        const penaltyType = minutesLate <= 30
          ? "late_under_30min" as const
          : "late_over_30min" as const;

        await applyPenalty({
          workerId: order.worker_id,
          orderId: order.id,
          type: penaltyType,
        });

        console.log(`[Deadline] Order ${order.id} is ${minutesLate}m late — penalty applied`);
      }

      return { checked: overdue.length };
    }

    if (name === "no-submission-timeout") {
      // Order yang deadline customer sudah lewat dan masih broadcast/matched
      const { orderId } = data as { orderId: string };

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) return { skipped: true };

      if (order.status === "in_progress" || order.status === "matched") {
        if (order.worker_id) {
          await applyPenalty({
            workerId: order.worker_id,
            orderId: order.id,
            type: "no_submission",
          });
        }

        await db.update(orders).set({
          status: "cancelled",
          cancel_reason: "Worker tidak submit sebelum deadline",
          cancel_category: "no_submission",
          updated_at: new Date(),
        }).where(eq(orders.id, orderId));

        // TODO: Refund customer via escrow
        console.log(`[Deadline] Order ${orderId} cancelled — no submission`);
      }

      return { processed: true };
    }
  },
  { connection, concurrency: 3 }
);

deadlineWorker.on("failed", (job, err) => {
  console.error(`[DeadlineWorker] Job ${job?.id} failed:`, err.message);
});
