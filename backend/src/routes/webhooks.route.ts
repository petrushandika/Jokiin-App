import { Hono } from "hono";
import { rateLimit } from "../middlewares/rateLimit.ts";
import * as escrowService from "../services/escrow.service.ts";
import * as matchmakingService from "../services/matchmaking.service.ts";
import { ok, err } from "../lib/response.ts";

const webhooks = new Hono();

// POST /webhooks/midtrans — Payment callback dari Midtrans
webhooks.post(
  "/midtrans",
  rateLimit({ max: 200, windowSeconds: 60 }),
  async (c) => {
    const payload = await c.req.json();
    try {
      const result = await escrowService.handleMidtransWebhook(payload);

      // Jika payment berhasil, mulai broadcast matchmaking
      if (result.message === "Payment confirmed" && result.orderId) {
        await matchmakingService.startBroadcast(result.orderId);
      }

      return c.json(ok(result));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "INVALID_SIGNATURE") return c.json(err("INVALID_SIGNATURE", "Signature tidak valid"), 401);
      if (msg === "ESCROW_NOT_FOUND") return c.json(err("ESCROW_NOT_FOUND", "Transaksi tidak ditemukan"), 404);
      throw error;
    }
  }
);

export default webhooks;
