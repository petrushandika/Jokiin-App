import { eq, desc } from "drizzle-orm";
import { db, dbRead } from "../lib/database.ts";
import { wallets, walletTransactions, withdrawals } from "../../database/schema.ts";
import { redis } from "../lib/redis.ts";
import { notify } from "./notification.service.ts";

// ─── Get Wallet ───────────────────────────────────────────────────────────────

export async function getWallet(userId: string) {
  const wallet = await dbRead.query.wallets.findFirst({
    where: eq(wallets.user_id, userId),
  });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  return wallet;
}

// ─── Get Transactions ─────────────────────────────────────────────────────────

export async function getWalletTransactions(userId: string) {
  const wallet = await dbRead.query.wallets.findFirst({
    where: eq(wallets.user_id, userId),
  });
  if (!wallet) throw new Error("WALLET_NOT_FOUND");

  return dbRead.query.walletTransactions.findMany({
    where: eq(walletTransactions.wallet_id, wallet.id),
    orderBy: [desc(walletTransactions.created_at)],
    limit: 50,
  });
}

// ─── Request Withdraw ─────────────────────────────────────────────────────────

export async function requestWithdraw(input: {
  userId: string;
  amount: number;
  otpCode: string;
}) {
  if (input.amount < 50_000) throw new Error("BELOW_MINIMUM");

  const otpKey = `withdraw_otp:${input.userId}`;
  const storedOtp = await redis.get(otpKey);
  if (!storedOtp || storedOtp !== input.otpCode) throw new Error("INVALID_OTP");
  await redis.del(otpKey);

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.user_id, input.userId),
  });

  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  if (!wallet.is_bank_verified) throw new Error("BANK_NOT_VERIFIED");
  if (Number(wallet.balance) < input.amount) throw new Error("INSUFFICIENT_BALANCE");

  const adminFee = calculateAdminFee(input.amount);
  const netAmount = input.amount - adminFee;
  const idempotencyKey = `wd-${input.userId}-${Date.now()}`;

  await db.transaction(async (tx) => {
    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore - input.amount;

    await tx.update(wallets).set({
      balance: String(balanceAfter),
    }).where(eq(wallets.user_id, input.userId));

    await tx.insert(walletTransactions).values({
      wallet_id: wallet.id,
      type: "debit",
      amount: String(input.amount),
      balance_before: String(balanceBefore),
      balance_after: String(balanceAfter),
      description: "Request penarikan dana",
    });

    await tx.insert(withdrawals).values({
      wallet_id: wallet.id,
      user_id: input.userId,
      amount: String(input.amount),
      admin_fee: String(adminFee),
      net_amount: String(netAmount),
      status: "pending",
      bank_name: wallet.bank_name!,
      bank_account_number: wallet.bank_account_number!,
      bank_account_name: wallet.bank_account_name!,
      otp_verified: true,
      idempotency_key: idempotencyKey,
    });
  });

  await notify.withdrawalProcessed(input.userId, netAmount);

  return { netAmount, adminFee };
}

// ─── Send Withdraw OTP ────────────────────────────────────────────────────────

export async function sendWithdrawOtp(userId: string, phone: string) {
  const rateLimitKey = `wd_otp_rate:${userId}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) await redis.expire(rateLimitKey, 300);
  if (count > 3) throw new Error("OTP_RATE_LIMIT");

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`withdraw_otp:${userId}`, code, "EX", 300);

  if (process.env.FONNTE_TOKEN) {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: `OTP Penarikan Dana JokiIn: *${code}*\n\nBerlaku 5 menit. Jangan bagikan ke siapapun.`,
      }),
    });
  } else {
    console.log(`[OTP Dev] Withdraw OTP for ${userId}: ${code}`);
  }

  return true;
}

// ─── Release Pending Balance (dipanggil BullMQ setelah 48 jam) ───────────────

export async function releasePendingBalance(userId: string, amount: number) {
  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.user_id, userId),
  });
  if (!wallet) return;

  await db.transaction(async (tx) => {
    const pendingBefore = Number(wallet.pending_balance);
    const balanceBefore = Number(wallet.balance);
    const releaseAmount = Math.min(amount, pendingBefore);

    await tx.update(wallets).set({
      pending_balance: String(pendingBefore - releaseAmount),
      balance: String(balanceBefore + releaseAmount),
      total_earned: String(Number(wallet.total_earned) + releaseAmount),
    }).where(eq(wallets.user_id, userId));

    await tx.insert(walletTransactions).values({
      wallet_id: wallet.id,
      type: "release",
      amount: String(releaseAmount),
      balance_before: String(balanceBefore),
      balance_after: String(balanceBefore + releaseAmount),
      description: "Dana order tersedia setelah masa garansi 48 jam",
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateAdminFee(amount: number): number {
  if (amount < 100_000) return 2_500;
  if (amount <= 1_000_000) return 5_000;
  return 0;
}
