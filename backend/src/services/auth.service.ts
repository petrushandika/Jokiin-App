import { eq, and, gt } from "drizzle-orm";
import { db } from "../lib/database.ts";
import { users, sessions, otpCodes, wallets } from "../../database/schema.ts";
import { redis } from "../lib/redis.ts";
import * as argon2 from "argon2";
import * as crypto from "crypto";

// ─── Register ────────────────────────────────────────────────────────────────

export async function registerUser(input: {
  email: string;
  phone: string;
  password: string;
  displayName: string;
  role: "customer" | "worker";
}) {
  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (existingEmail) throw new Error("EMAIL_TAKEN");

  const existingPhone = await db.query.users.findFirst({
    where: eq(users.phone, input.phone),
  });
  if (existingPhone) throw new Error("PHONE_TAKEN");

  const passwordHash = await argon2.hash(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      phone: input.phone,
      password_hash: passwordHash,
      display_name: input.displayName,
      role: input.role,
      is_verified: false,
    })
    .returning();

  // Buat wallet untuk setiap user
  await db.insert(wallets).values({ user_id: user!.id });

  await sendOtp(input.phone);

  return { userId: user!.id };
}

// ─── OTP ─────────────────────────────────────────────────────────────────────

export async function sendOtp(phone: string) {
  // Rate limit: max 3 OTP per 10 menit per nomor
  const rateLimitKey = `otp_rate:${phone}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) await redis.expire(rateLimitKey, 600);
  if (count > 3) throw new Error("OTP_RATE_LIMIT");

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

  await db.insert(otpCodes).values({ phone, code, expiresAt });

  await sendWhatsAppOtp(phone, code);

  return { expiresAt };
}

export async function verifyOtp(phone: string, code: string) {
  const otp = await db.query.otpCodes.findFirst({
    where: and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.code, code),
      eq(otpCodes.isUsed, false),
      gt(otpCodes.expiresAt, new Date())
    ),
  });

  if (!otp) throw new Error("INVALID_OTP");

  await db.update(otpCodes).set({ isUsed: true }).where(eq(otpCodes.id, otp.id));

  await db
    .update(users)
    .set({ is_verified: true, updated_at: new Date() })
    .where(eq(users.phone, phone));

  return true;
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function loginUser(input: { email: string; password: string }) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user || !user.password_hash) throw new Error("INVALID_CREDENTIALS");
  if (!user.is_verified) throw new Error("EMAIL_NOT_VERIFIED");
  if (user.is_banned) throw new Error("ACCOUNT_BANNED");

  const valid = await argon2.verify(user.password_hash, input.password);
  if (!valid) throw new Error("INVALID_CREDENTIALS");

  // Hapus session lama jika ada lebih dari 5
  const existingSessions = await db.query.sessions.findMany({
    where: eq(sessions.userId, user.id),
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });
  if (existingSessions.length >= 5) {
    await db.delete(sessions).where(eq(sessions.id, existingSessions[0]!.id));
  }

  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 hari

  await db.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt,
  });

  await db
    .update(users)
    .set({ last_active_at: new Date() })
    .where(eq(users.id, user.id));

  return { token, expiresAt, user: sanitizeUser(user) };
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutUser(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function sanitizeUser(user: typeof users.$inferSelect) {
  const { password_hash, ...safe } = user;
  return safe;
}

async function sendWhatsAppOtp(phone: string, code: string) {
  if (!process.env.FONNTE_TOKEN) {
    console.log(`[OTP Dev] Phone: ${phone}, Code: ${code}`);
    return;
  }

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: phone,
      message: `Kode OTP JokiIn Anda: *${code}*\n\nKode berlaku 5 menit. Jangan bagikan ke siapapun.`,
    }),
  });

  if (!res.ok) throw new Error("OTP_SEND_FAILED");
}
