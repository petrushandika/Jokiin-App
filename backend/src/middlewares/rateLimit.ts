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

        const results = await redis
      .multi()
      .incr(key)
      .ttl(key)
      .exec();

    if (!results) {
      return c.json(
        err("RATE_LIMIT_ERROR", "Gagal memproses rate limit."),
        500
      );
    }

    const resultIncr = results[0];
    const resultTtl = results[1];

    if (!resultIncr || !resultTtl) {
      return c.json(
        err("RATE_LIMIT_ERROR", "Gagal memproses rate limit."),
        500
      );
    }

    const [incrErr, currentVal] = resultIncr;
    const [ttlErr, ttlVal] = resultTtl;

    if (incrErr) throw incrErr as Error;
    if (ttlErr) throw ttlErr as Error;

    const current = currentVal as number;
    const ttl = ttlVal as number;

    if (ttl === -1) {
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
