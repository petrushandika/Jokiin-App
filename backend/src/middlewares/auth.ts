import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { db } from "../lib/database";
import { sessions } from "../../database/schema";
import { err } from "../lib/response";
import type { AppVariables } from "../lib/context";

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const token =
    c.req.header("authorization")?.replace("Bearer ", "") ??
    getCookieToken(c.req.header("cookie"));

  if (!token) {
    return c.json(err("UNAUTHORIZED", "Autentikasi diperlukan"), 401);
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
    with: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json(err("UNAUTHORIZED", "Sesi tidak valid atau sudah kadaluarsa"), 401);
  }

  const user = session.user;

  if (user.is_banned) {
    return c.json(err("FORBIDDEN", "Akun Anda telah diblokir"), 403);
  }

  if (user.is_suspended && user.suspended_until && user.suspended_until > new Date()) {
    return c.json(
      err("FORBIDDEN", `Akun Anda di-suspend hingga ${user.suspended_until.toISOString()}`),
      403
    );
  }

  c.set("userId", user.id);
  c.set("userRole", user.role);
  c.set("user", user);

  await next();
});

export const requireRole = (...roles: string[]): MiddlewareHandler => {
  return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
    const role = c.get("userRole");
    if (!roles.includes(role)) {
      return c.json(err("FORBIDDEN", "Akses ditolak"), 403);
    }
    await next();
  });
};

function getCookieToken(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/session_token=([^;]+)/);
  return match?.[1];
}
