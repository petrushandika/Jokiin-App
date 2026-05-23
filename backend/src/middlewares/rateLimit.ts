import type { MiddlewareHandler } from "hono";
import { redis } from "../lib/redis.ts";
import { err } from "../lib/response.ts";

interface RateLimitOptions {
  max: number;
  windowSeconds: number;
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string;
}

export const rateLimit = (options: RateLimitOptions): MiddlewareHandler => {
  return async (c, next) => {
    const key = options.keyFn
      ? options.keyFn(c)
      : `rl:${c.req.path}:${c.req.header("x-forwarded-for") ?? "unknown"}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, options.windowSeconds);
    }

    c.header("X-RateLimit-Limit", String(options.max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, options.max - current)));

    if (current > options.max) {
      return c.json(
        err("RATE_LIMIT_EXCEEDED", "Terlalu banyak request. Coba lagi nanti."),
        429
      );
    }

    await next();
  };
};
