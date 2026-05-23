import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { rateLimit } from "../middlewares/rateLimit";
import { requireAuth } from "../middlewares/auth";
import * as authService from "../services/auth.service";
import { ok, err } from "../lib/response";

const auth = new Hono();

// POST /auth/register
auth.post(
  "/register",
  rateLimit({ max: 5, windowSeconds: 60 }),
  zValidator("json", z.object({
    email: z.string().email(),
    phone: z.string().regex(/^(\+62|08)[0-9]{8,11}$/, "Format nomor HP tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    displayName: z.string().min(2).max(100),
    role: z.enum(["customer", "worker"]).default("customer"),
  })),
  async (c) => {
    const body = c.req.valid("json");
    try {
      const result = await authService.registerUser(body);
      return c.json(ok(result, { message: "Kode OTP dikirim ke WhatsApp Anda" }), 201);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "EMAIL_TAKEN") return c.json(err("EMAIL_TAKEN", "Email sudah terdaftar"), 409);
      if (msg === "PHONE_TAKEN") return c.json(err("PHONE_TAKEN", "Nomor HP sudah terdaftar"), 409);
      throw error;
    }
  }
);

// POST /auth/otp/verify
auth.post(
  "/otp/verify",
  rateLimit({ max: 5, windowSeconds: 60, keyFn: (c) => `otp:${c.req.header("x-forwarded-for")}` }),
  zValidator("json", z.object({
    phone: z.string(),
    code: z.string().length(6),
  })),
  async (c) => {
    const { phone, code } = c.req.valid("json");
    try {
      await authService.verifyOtp(phone, code);
      return c.json(ok(null, { message: "Nomor HP berhasil diverifikasi" }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "INVALID_OTP") return c.json(err("INVALID_OTP", "Kode OTP tidak valid atau kadaluarsa"), 400);
      throw error;
    }
  }
);

// POST /auth/otp/resend
auth.post(
  "/otp/resend",
  rateLimit({ max: 3, windowSeconds: 600 }),
  zValidator("json", z.object({ phone: z.string() })),
  async (c) => {
    const { phone } = c.req.valid("json");
    try {
      const result = await authService.sendOtp(phone);
      return c.json(ok(result, { message: "Kode OTP dikirim ulang" }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "OTP_RATE_LIMIT") return c.json(err("OTP_RATE_LIMIT", "Terlalu banyak permintaan OTP"), 429);
      throw error;
    }
  }
);

// POST /auth/login
auth.post(
  "/login",
  rateLimit({ max: 10, windowSeconds: 60 }),
  zValidator("json", z.object({
    email: z.string().email(),
    password: z.string(),
  })),
  async (c) => {
    const { email, password } = c.req.valid("json");
    try {
      const result = await authService.loginUser({ email, password });
      c.header("Set-Cookie", `session_token=${result.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=${result.expiresAt.toUTCString()}`);
      return c.json(ok({ user: result.user, expiresAt: result.expiresAt }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "INVALID_CREDENTIALS") return c.json(err("INVALID_CREDENTIALS", "Email atau password salah"), 401);
      if (msg === "EMAIL_NOT_VERIFIED") return c.json(err("EMAIL_NOT_VERIFIED", "Verifikasi nomor HP Anda terlebih dahulu"), 403);
      if (msg === "ACCOUNT_BANNED") return c.json(err("ACCOUNT_BANNED", "Akun Anda telah diblokir"), 403);
      throw error;
    }
  }
);

// POST /auth/logout
auth.post("/logout", requireAuth, async (c) => {
  const token = c.req.header("authorization")?.replace("Bearer ", "") ?? "";
  await authService.logoutUser(token);
  c.header("Set-Cookie", "session_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  return c.json(ok(null, { message: "Berhasil logout" }));
});

// GET /auth/me
auth.get("/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json(ok(authService.sanitizeUser(user)));
});

export default auth;
