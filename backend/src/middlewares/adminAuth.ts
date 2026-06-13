import { createMiddleware } from "hono/factory";
import { err } from "../lib/response.ts";
import type { AppVariables } from "../lib/context.ts";

// Middleware khusus admin — wajib role admin atau super_admin
export const requireAdmin = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const role = c.get("userRole");
  if (role !== "admin" && role !== "super_admin") {
    return c.json(err("FORBIDDEN", "Akses admin diperlukan"), 403);
  }

  // IP whitelist check (opsional — aktifkan di production)
  if (process.env.ADMIN_PANEL_ALLOWED_IPS && process.env.NODE_ENV === "production") {
    const allowedIPs = process.env.ADMIN_PANEL_ALLOWED_IPS.split(",").map((ip) => ip.trim());
    const clientIP = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "";
    if (!allowedIPs.includes(clientIP)) {
      return c.json(err("FORBIDDEN", "Akses ditolak dari IP ini"), 403);
    }
  }

  await next();
});

export const requireSuperAdmin = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const role = c.get("userRole");
  if (role !== "super_admin") {
    return c.json(err("FORBIDDEN", "Akses super admin diperlukan"), 403);
  }
  await next();
});
