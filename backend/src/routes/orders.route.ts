import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../middlewares/auth";
import { rateLimit } from "../middlewares/rateLimit";
import * as orderService from "../services/order.service";
import * as escrowService from "../services/escrow.service";
import * as matchmakingService from "../services/matchmaking.service";
import { ok, err } from "../lib/response";

const orders = new Hono();

// POST /orders/analyze — AI analisis sebelum buat order
orders.post(
  "/analyze",
  requireAuth,
  rateLimit({ max: 20, windowSeconds: 60 }),
  zValidator("json", z.object({
    categoryId: z.string().uuid(),
    description: z.string().min(100, "Deskripsi minimal 100 karakter"),
    pageCount: z.number().int().positive().optional(),
    deadline: z.string().datetime(),
    budget: z.number().positive(),
  })),
  async (c) => {
    const body = c.req.valid("json");
    try {
      const result = await orderService.analyzeOrder({
        ...body,
        deadline: new Date(body.deadline),
      });
      return c.json(ok(result));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "CATEGORY_NOT_FOUND") return c.json(err("CATEGORY_NOT_FOUND", "Kategori tidak ditemukan"), 404);
      if (msg === "DEADLINE_TOO_SOON") return c.json(err("DEADLINE_TOO_SOON", "Deadline minimal 1 jam dari sekarang"), 400);
      throw error;
    }
  }
);

// POST /orders — Buat order baru
orders.post(
  "/",
  requireAuth,
  requireRole("customer"),
  rateLimit({ max: 10, windowSeconds: 60 }),
  zValidator("json", z.object({
    categoryId: z.string().uuid(),
    title: z.string().min(10).max(300),
    description: z.string().min(100),
    outputFormat: z.enum(["word", "pdf", "ppt", "code", "other"]),
    pageCount: z.number().int().positive().optional(),
    additionalNotes: z.string().optional(),
    forbiddenItems: z.string().optional(),
    attachmentUrls: z.array(z.string().url()).max(10).optional(),
    deadline: z.string().datetime(),
    budget: z.number().positive(),
    aiAnalysis: z.record(z.string(), z.unknown()),
    difficultyScore: z.enum(["1", "2", "3", "4", "5"]),
    estimatedHours: z.number().positive(),
    minimumPrice: z.number().positive(),
  })),
  async (c) => {
    const body = c.req.valid("json");
    const userId = c.get("userId");

    const order = await orderService.createOrder({
      ...body,
      customerId: userId,
      deadline: new Date(body.deadline),
    });

    return c.json(ok(order), 201);
  }
);

// GET /orders — Riwayat order customer
orders.get("/", requireAuth, requireRole("customer"), async (c) => {
  const userId = c.get("userId");
  const list = await orderService.getCustomerOrders(userId);
  return c.json(ok(list));
});

// GET /orders/:id — Detail order
orders.get("/:id", requireAuth, async (c) => {
  const orderId = c.req.param("id");
  const userId = c.get("userId");
  try {
    const order = await orderService.getOrderDetail(orderId, userId);
    return c.json(ok(order));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "ORDER_NOT_FOUND") return c.json(err("ORDER_NOT_FOUND", "Order tidak ditemukan"), 404);
    if (msg === "FORBIDDEN") return c.json(err("FORBIDDEN", "Akses ditolak"), 403);
    throw error;
  }
});

// POST /orders/:id/pay — Inisiasi pembayaran Midtrans
orders.post("/:id/pay", requireAuth, requireRole("customer"), async (c) => {
  const orderId = c.req.param("id");
  const userId = c.get("userId");
  try {
    const result = await escrowService.initiatePayment(orderId, userId);
    return c.json(ok(result));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "ORDER_NOT_FOUND") return c.json(err("ORDER_NOT_FOUND", "Order tidak ditemukan"), 404);
    if (msg === "ORDER_NOT_PAYABLE") return c.json(err("ORDER_NOT_PAYABLE", "Order tidak bisa dibayar"), 400);
    throw error;
  }
});

// POST /orders/:id/approve — Customer approve hasil
orders.post("/:id/approve", requireAuth, requireRole("customer"), async (c) => {
  const orderId = c.req.param("id");
  const userId = c.get("userId");
  try {
    await orderService.approveOrder(orderId, userId);
    await escrowService.releaseEscrow(orderId);
    return c.json(ok(null, { message: "Order disetujui, dana dikirim ke worker" }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "ORDER_NOT_FOUND") return c.json(err("ORDER_NOT_FOUND", "Order tidak ditemukan"), 404);
    if (msg === "ORDER_NOT_SUBMITTED") return c.json(err("ORDER_NOT_SUBMITTED", "Order belum disubmit"), 400);
    throw error;
  }
});

// POST /orders/:id/revision — Customer minta revisi
orders.post(
  "/:id/revision",
  requireAuth,
  requireRole("customer"),
  zValidator("json", z.object({ note: z.string().min(10) })),
  async (c) => {
    const orderId = c.req.param("id");
    const userId = c.get("userId");
    const { note } = c.req.valid("json");
    try {
      await orderService.requestRevision(orderId, userId, note);
      return c.json(ok(null, { message: "Permintaan revisi berhasil dikirim" }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (msg === "ORDER_NOT_FOUND") return c.json(err("ORDER_NOT_FOUND", "Order tidak ditemukan"), 404);
      if (msg === "ORDER_NOT_SUBMITTED") return c.json(err("ORDER_NOT_SUBMITTED", "Order belum disubmit"), 400);
      if (msg === "REVISION_QUOTA_EXCEEDED") return c.json(err("REVISION_QUOTA_EXCEEDED", "Kuota revisi gratis habis"), 400);
      throw error;
    }
  }
);

// POST /orders/:id/accept — Worker accept order dari broadcast
orders.post("/:id/accept", requireAuth, requireRole("worker"), async (c) => {
  const orderId = c.req.param("id");
  const userId = c.get("userId");
  try {
    await matchmakingService.acceptOrder(orderId, userId);
    return c.json(ok(null, { message: "Order berhasil diterima" }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (msg === "ORDER_ALREADY_TAKEN") return c.json(err("ORDER_ALREADY_TAKEN", "Order sudah diambil worker lain"), 409);
    if (msg === "ORDER_NOT_AVAILABLE") return c.json(err("ORDER_NOT_AVAILABLE", "Order tidak tersedia"), 400);
    throw error;
  }
});

// POST /orders/:id/reject — Worker tolak order
orders.post("/:id/reject", requireAuth, requireRole("worker"), async (c) => {
  const orderId = c.req.param("id");
  const userId = c.get("userId");
  await matchmakingService.rejectOrder(orderId, userId);
  return c.json(ok(null, { message: "Order ditolak" }));
});

// POST /orders/:id/submit — Worker submit hasil
orders.post(
  "/:id/submit",
  requireAuth,
  requireRole("worker"),
  zValidator("json", z.object({
    fileUrls: z.array(z.string().url()).min(1),
    notes: z.string().optional(),
  })),
  async (c) => {
    const orderId = c.req.param("id");
    const { fileUrls, notes } = c.req.valid("json");
    // TODO: implementasi submitOrder service
    return c.json(ok(null, { message: "Hasil berhasil disubmit" }));
  }
);

export default orders;
