import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import authRoute from "./routes/auth.route.ts";
import ordersRoute from "./routes/orders.route.ts";
import chatRoute from "./routes/chat.route.ts";
import walletsRoute from "./routes/wallets.route.ts";
import webhooksRoute from "./routes/webhooks.route.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import type { AppVariables } from "./lib/context.ts";

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
Bun.serve({ port, fetch: app.fetch });
console.log(`🚀 API running → http://localhost:${port}`);
