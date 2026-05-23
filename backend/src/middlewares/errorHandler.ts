import type { Context } from "hono";
import { err } from "../lib/response";

export const errorHandler = (error: Error, c: Context) => {
  console.error("[Error]", error.message, error.stack);

  if (error.message === "Unauthorized") {
    return c.json(err("UNAUTHORIZED", "Autentikasi diperlukan"), 401);
  }

  if (error.message === "Forbidden") {
    return c.json(err("FORBIDDEN", "Akses ditolak"), 403);
  }

  return c.json(
    err("INTERNAL_ERROR", "Terjadi kesalahan internal", {
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    }),
    500
  );
};
