import { Queue } from "bullmq";
import { redis } from "./redis.ts";

const connection = { host: redis.options.host, port: redis.options.port };

export const broadcastQueue = new Queue("broadcast-orders", { connection });
export const deadlineQueue = new Queue("deadline-reminders", { connection });
export const notifyQueue = new Queue("notifications", { connection });
export const autoApproveQueue = new Queue("auto-approve", { connection });
export const reputationQueue = new Queue("reputation-update", { connection });
