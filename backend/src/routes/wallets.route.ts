import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import * as walletService from "../services/wallet.service";
import { ok, err } from "../lib/response";

const wallets = new Hono();

// GET /wallets — Saldo wallet
wallets.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  try {
    const wallet = await walletService.getWallet(userId);
    return c.json(ok(wallet));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "WALLET_NOT_FOUND") return c.json(err("WALLET_NOT_FOUND", "Wallet tidak ditemukan"), 404);
    throw error;
  }
});

// GET /wallets/transactions — Riwayat transaksi
wallets.get("/transactions", requireAuth, async (c) => {
  const userId = c.get("userId");
  const transactions = await walletService.getWalletTransactions(userId);
  return c.json(ok(transactions));
});

// POST /wallets/withdraw/otp — Minta OTP untuk withdraw
wallets.post(
  "/withdraw/otp",
  requireAuth,
  requireRole("worker"),
  rateLimit({ max: 3, windowSeconds: 300 }),
  async (c) => {
    const user = c.get("user");
    if (!user.phone) {
      return c.json(err("NO_PHONE", "Nomor HP belum terdaftar"), 400);
    }
    try {
      await walletService.sendWithdrawOtp(user.id, user.phone);
      return c.json(ok(null, { message: "OTP dikirim ke WhatsApp Anda" }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "OTP_RATE_LIMIT") return c.json(err("OTP_RATE_LIMIT", "Terlalu banyak permintaan OTP"), 429);
      throw error;
    }
  }
);

// POST /wallets/withdraw — Request penarikan dana
wallets.post(
  "/withdraw",
  requireAuth,
  requireRole("worker"),
  rateLimit({ max: 5, windowSeconds: 300 }),
  zValidator("json", z.object({
    amount: z.number().min(50_000, "Minimum withdraw Rp 50.000"),
    otpCode: z.string().length(6),
  })),
  async (c) => {
    const { amount, otpCode } = c.req.valid("json");
    const userId = c.get("userId");
    try {
      const result = await walletService.requestWithdraw({ userId, amount, otpCode });
      return c.json(ok(result, { message: "Permintaan penarikan berhasil. Dana akan masuk T+1 hari kerja" }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "INVALID_OTP") return c.json(err("INVALID_OTP", "Kode OTP tidak valid"), 400);
      if (msg === "INSUFFICIENT_BALANCE") return c.json(err("INSUFFICIENT_BALANCE", "Saldo tidak mencukupi"), 400);
      if (msg === "BANK_NOT_VERIFIED") return c.json(err("BANK_NOT_VERIFIED", "Rekening bank belum terverifikasi"), 400);
      if (msg === "BELOW_MINIMUM") return c.json(err("BELOW_MINIMUM", "Minimum withdraw Rp 50.000"), 400);
      throw error;
    }
  }
);

export default wallets;
