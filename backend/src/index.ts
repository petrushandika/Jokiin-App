import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import authRoute from "./routes/auth.route.ts";
import ordersRoute from "./routes/orders.route.ts";
import chatRoute from "./routes/chat.route.ts";
import walletsRoute from "./routes/wallets.route.ts";
import webhooksRoute from "./routes/webhooks.route.ts";
import categoriesRoute from "./routes/categories.route.ts";
import profileRoute from "./routes/profile.route.ts";
import workerRoute from "./routes/worker.route.ts";
import uploadRoute from "./routes/upload.route.ts";
import notificationsRoute from "./routes/notifications.route.ts";
import adminRoute from "./routes/admin.route.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import type { AppVariables } from "./lib/context.ts";
import { createSocketServer } from "./lib/socket.ts";

// ─── BullMQ Workers ───────────────────────────────────────────────────────────
import "./workers/broadcast.worker.ts";
import "./workers/auto-approve.worker.ts";
import "./workers/reputation.worker.ts";
import "./workers/deadline.worker.ts";
import "./workers/notify.worker.ts";

const app = new Hono<{ Variables: AppVariables }>();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", cors({
  origin: process.env.APP_URL ?? "http://localhost:3000",
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route("/api/auth", authRoute);
app.route("/api/orders", ordersRoute);
app.route("/api/chats", chatRoute);
app.route("/api/wallets", walletsRoute);
app.route("/api/webhooks", webhooksRoute);
app.route("/api/categories", categoriesRoute);
app.route("/api/profile", profileRoute);
app.route("/api/workers", workerRoute);
app.route("/api/upload", uploadRoute);
app.route("/api/notifications", notificationsRoute);
app.route("/api/admin", adminRoute);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: { code: "NOT_FOUND", message: "Route tidak ditemukan" } }, 404)
);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.onError(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001);

const server = Bun.serve({ port, fetch: app.fetch });

// Inisialisasi Socket.io setelah server berjalan
const io = createSocketServer();
// @ts-ignore — Socket.io attach ke Bun server via engine
io.attach(port + 1); // WebSocket di port terpisah (3002 by default)

console.log(`🚀 API running → http://localhost:${port}`);
console.log(`🔌 WebSocket running → ws://localhost:${port + 1}`);
