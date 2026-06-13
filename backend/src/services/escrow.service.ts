import { eq, and } from "drizzle-orm";
import { db } from "../lib/database.ts";
import { orders, escrowTransactions, wallets, walletTransactions } from "../../database/schema.ts";
import * as crypto from "crypto";
import { notify } from "./notification.service.ts";

const MIDTRANS_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === "true"
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

// ─── Initiate Payment ─────────────────────────────────────────────────────────

export async function initiatePayment(orderId: string, customerId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customer_id, customerId)),
    with: { customer: true },
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "pending_payment") throw new Error("ORDER_NOT_PAYABLE");

  const idempotencyKey = `pay-${orderId}-${Date.now()}`;
  const amount = Number(order.agreed_price);

  const [escrow] = await db
    .insert(escrowTransactions)
    .values({
      order_id: orderId,
      status: "held",
      total_amount: String(amount),
      platform_fee: String(calculatePlatformFee(amount, "SPROUT")),
      worker_amount: String(amount - calculatePlatformFee(amount, "SPROUT")),
      refund_amount: "0",
      midtrans_order_id: idempotencyKey,
      idempotency_key: idempotencyKey,
    })
    .returning();

  const snapToken = await createMidtransTransaction({
    orderId: idempotencyKey,
    amount,
    customer: {
      name: order.customer.display_name,
      email: order.customer.email,
      phone: order.customer.phone ?? "",
    },
    itemName: order.title,
  });

  return { snapToken, escrowId: escrow!.id };
}

// ─── Handle Webhook ───────────────────────────────────────────────────────────

export async function handleMidtransWebhook(payload: {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  signature_key: string;
  gross_amount: string;
  status_code: string;
}) {
  const validSignature = verifySignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
    payload.signature_key
  );
  if (!validSignature) throw new Error("INVALID_SIGNATURE");

  const existing = await db.query.escrowTransactions.findFirst({
    where: eq(escrowTransactions.idempotency_key, payload.order_id),
  });
  if (!existing) throw new Error("ESCROW_NOT_FOUND");
  // Already processed if status moved past initial "held"
  if (existing.status === "released" || existing.status === "refunded") return { message: "Already processed" };

  const isSuccess =
    payload.transaction_status === "capture" ||
    payload.transaction_status === "settlement";

  if (!isSuccess) return { message: "Payment not successful" };

  await db.transaction(async (tx) => {
    await tx
      .update(escrowTransactions)
      .set({
        status: "held",
        payment_method: payload.payment_type,
        webhook_payload: payload as Record<string, unknown>,
      })
      .where(eq(escrowTransactions.idempotency_key, payload.order_id));

    await tx
      .update(orders)
      .set({ status: "broadcast", updated_at: new Date() })
      .where(eq(orders.id, existing.order_id));
  });

  return { message: "Payment confirmed" };
}

// ─── Release Escrow ───────────────────────────────────────────────────────────

export async function releaseEscrow(orderId: string) {
  const escrow = await db.query.escrowTransactions.findFirst({
    where: and(
      eq(escrowTransactions.order_id, orderId),
      eq(escrowTransactions.status, "held")
    ),
  });

  if (!escrow) throw new Error("ESCROW_NOT_FOUND");

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { worker: true },
  });

  if (!order?.worker) throw new Error("WORKER_NOT_FOUND");

  const workerUserId = order.worker.user_id;
  const amount = Number(escrow.worker_amount);

  await db.transaction(async (tx) => {
    await tx
      .update(escrowTransactions)
      .set({ status: "released" })
      .where(eq(escrowTransactions.id, escrow.id));

    const wallet = await tx.query.wallets.findFirst({
      where: eq(wallets.user_id, workerUserId),
    });

    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    const pendingBefore = Number(wallet.pending_balance);
    const pendingAfter = pendingBefore + amount;

    await tx
      .update(wallets)
      .set({ pending_balance: String(pendingAfter) })
      .where(eq(wallets.user_id, workerUserId));

    await tx.insert(walletTransactions).values({
      wallet_id: wallet.id,
      order_id: orderId,
      type: "pending",
      amount: String(amount),
      balance_before: String(pendingBefore),
      balance_after: String(pendingAfter),
      description: `Pembayaran order #${orderId} (pending 48 jam)`,
    });
  });

  // Notifikasi worker — dana pending
  await notify.walletCredited(workerUserId, amount);

  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculatePlatformFee(amount: number, badge: string): number {
  const rates: Record<string, number> = {
    SPROUT: 0.15,
    SPARK: 0.13,
    BLAZE: 0.12,
    PRIME: 0.10,
    APEX: 0.08,
  };
  return Math.round(amount * (rates[badge] ?? 0.15));
}

function verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
  return expected === signatureKey;
}

async function createMidtransTransaction(input: {
  orderId: string;
  amount: number;
  customer: { name: string; email: string; phone: string };
  itemName: string;
}) {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    console.log("[Midtrans Dev] Skipping actual payment, returning mock token");
    return "mock-snap-token-dev";
  }

  const res = await fetch(`${MIDTRANS_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      customer_details: {
        first_name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
      },
      item_details: [{ id: input.orderId, price: input.amount, quantity: 1, name: input.itemName }],
    }),
  });

  const data = await res.json() as { token: string };
  return data.token;
}
