import { Worker } from "bullmq";
import { redis } from "../lib/redis.ts";
import { db } from "../lib/database.ts";
import { orders, broadcastLogs } from "../../database/schema.ts";
import { eq, and } from "drizzle-orm";
import { getEligibleWorkers } from "../services/matchmaking.service.ts";
import { broadcastQueue } from "../lib/queue.ts";

const connection = { host: redis.options.host, port: redis.options.port };

export const broadcastWorker = new Worker(
  "broadcast-orders",
  async (job) => {
    const { name, data } = job;

    if (name === "broadcast") {
      const { orderId, batch } = data as { orderId: string; batch: number };

      const order = await db.query.orders.findFirst({
        where: and(eq(orders.id, orderId), eq(orders.status, "broadcast")),
      });

      if (!order) return { skipped: true, reason: "order_not_broadcast" };

      const eligibleWorkers = await getEligibleWorkers(orderId);

      if (eligibleWorkers.length === 0) {
        if (batch >= 3) {
          // Batalkan order setelah 3 batch gagal
          await db.update(orders).set({
            status: "cancelled",
            cancel_reason: "Tidak ada worker tersedia setelah 3 batch broadcast",
            cancel_category: "no_worker",
            updated_at: new Date(),
          }).where(eq(orders.id, orderId));
          return { cancelled: true, reason: "no_eligible_workers" };
        }

        // Coba batch berikutnya setelah 5 menit
        await broadcastQueue.add(
          "broadcast",
          { orderId, batch: batch + 1 },
          { delay: 5 * 60 * 1000 }
        );
        return { nextBatch: batch + 1 };
      }

      // Log broadcast ke semua worker eligible
      await db.insert(broadcastLogs).values(
        eligibleWorkers.map((w) => ({
          order_id: orderId,
          worker_id: w.id,
          batch_number: batch,
          response: "pending" as const,
        }))
      );

      // Set expiry untuk batch ini (5 menit)
      const broadcastExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await db.update(orders).set({
        broadcast_batch: batch,
        broadcast_expires_at: broadcastExpiresAt,
        updated_at: new Date(),
      }).where(eq(orders.id, orderId));

      // TODO: Push notifikasi ke worker via Socket.io / Push notification
      console.log(`[Broadcast] Order ${orderId} batch ${batch}: ${eligibleWorkers.length} workers notified`);

      // Schedule next batch jika tidak ada yang accept dalam 5 menit
      await broadcastQueue.add(
        "check-batch",
        { orderId, batch },
        { delay: 5 * 60 * 1000 }
      );

      return { broadcastCount: eligibleWorkers.length, batch };
    }

    if (name === "check-batch") {
      const { orderId, batch } = data as { orderId: string; batch: number };

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order || order.status !== "broadcast") return { skipped: true };

      // Order masih broadcast setelah 5 menit — lanjut ke batch berikutnya
      if (batch >= 3) {
        await db.update(orders).set({
          status: "cancelled",
          cancel_reason: "Tidak ada worker yang menerima setelah 3 batch broadcast",
          cancel_category: "no_worker_accept",
          updated_at: new Date(),
        }).where(eq(orders.id, orderId));
        return { cancelled: true };
      }

      await broadcastQueue.add("broadcast", { orderId, batch: batch + 1 }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      });

      return { nextBatch: batch + 1 };
    }

    if (name === "order-taken") {
      // Order sudah diambil worker — tidak ada aksi tambahan untuk sekarang
      // TODO: Push notifikasi ke customer
      console.log(`[Broadcast] Order ${data.orderId} taken by worker ${data.workerUserId}`);
      return { notified: true };
    }
  },
  { connection, concurrency: 5 }
);

broadcastWorker.on("failed", (job, err) => {
  console.error(`[BroadcastWorker] Job ${job?.id} failed:`, err.message);
});
