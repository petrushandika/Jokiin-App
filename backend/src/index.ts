import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import type { AppVariables } from "./lib/context";

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
app.route("/api", routes);

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
