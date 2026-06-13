import { Worker } from "bullmq";
import { redis } from "../lib/redis.ts";
import { db } from "../lib/database.ts";
import { users } from "../../database/schema.ts";
import { eq } from "drizzle-orm";

const connection = { host: redis.options.host, port: redis.options.port };

export const notifyWorker = new Worker(
  "notifications",
  async (job) => {
    const { name, data } = job;

    if (name === "whatsapp") {
      const { userId, message } = data as { userId: string; message: string };

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { phone: true },
      });

      if (!user?.phone || !process.env.FONNTE_TOKEN) {
        return { skipped: true, reason: "no_phone_or_token" };
      }

      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: process.env.FONNTE_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: user.phone,
          message,
        }),
      });

      if (!res.ok) throw new Error(`Fonnte error: ${res.status}`);
      return { sent: true, phone: user.phone };
    }

    if (name === "email") {
      const { userId, subject, body } = data as { userId: string; subject: string; body: string };

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true, display_name: true },
      });

      if (!user?.email || !process.env.RESEND_API_KEY) {
        return { skipped: true, reason: "no_email_or_key" };
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "JokiIn <noreply@jokiin.id>",
          to: user.email,
          subject,
          html: `<p>Halo ${user.display_name},</p><p>${body}</p><br><p>Tim JokiIn</p>`,
        }),
      });

      if (!res.ok) throw new Error(`Resend error: ${res.status}`);
      return { sent: true, email: user.email };
    }
  },
  { connection, concurrency: 10 }
);

notifyWorker.on("failed", (job, err) => {
  console.error(`[NotifyWorker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});
