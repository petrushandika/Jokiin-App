import { eq, and, desc } from "drizzle-orm";
import { db, dbRead } from "../lib/database.ts";
import { orders, workerProfiles, reviews } from "../../database/schema.ts";
import { reputationQueue, autoApproveQueue } from "../lib/queue.ts";
import { analyzeTask } from "./ai.service.ts";
import { categories } from "../../database/schema.ts";
import { notify } from "./notification.service.ts";

// ─── Analyze (AI) ─────────────────────────────────────────────────────────────

export async function analyzeOrder(input: {
  categoryId: string;
  description: string;
  pageCount?: number;
  deadline: Date;
  budget: number;
}) {
  const category = await dbRead.query.categories.findFirst({
    where: eq(categories.id, input.categoryId),
  });
  if (!category) throw new Error("CATEGORY_NOT_FOUND");

  const hoursUntilDeadline =
    (input.deadline.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilDeadline < 1) throw new Error("DEADLINE_TOO_SOON");

  const result = await analyzeTask({
    category: category.name,
    description: input.description,
    pageCount: input.pageCount,
    deadline: input.deadline.toISOString(),
    hoursUntilDeadline: Math.round(hoursUntilDeadline),
  });

  return result;
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export async function createOrder(input: {
  customerId: string;
  categoryId: string;
  title: string;
  description: string;
  outputFormat: string;
  pageCount?: number;
  additionalNotes?: string;
  forbiddenItems?: string;
  attachmentUrls?: string[];
  deadline: Date;
  budget: number;
  aiAnalysis: Record<string, unknown>;
  difficultyScore: string;
  estimatedHours: number;
  minimumPrice: number;
}) {
  const order_number = generateOrderNumber();
  const worker_deadline = new Date(input.deadline.getTime() - 60 * 60 * 1000);

  const [order] = await db
    .insert(orders)
    .values({
      order_number,
      customer_id: input.customerId,
      category_id: input.categoryId,
      status: "pending_payment",
      title: input.title,
      description: input.description,
      output_format: input.outputFormat,
      page_count: input.pageCount,
      additional_notes: input.additionalNotes,
      forbidden_items: input.forbiddenItems,
      attachment_urls: input.attachmentUrls ?? [],
      difficulty_score: input.difficultyScore as "1" | "2" | "3" | "4" | "5",
      ai_analysis: input.aiAnalysis,
      estimated_hours: String(input.estimatedHours),
      customer_budget: String(input.budget),
      platform_min_price: String(input.minimumPrice),
      agreed_price: String(input.budget),
      customer_deadline: input.deadline,
      worker_deadline,
      max_revisions: (input.aiAnalysis as { maxRevisions: number }).maxRevisions ?? 2,
      used_revisions: 0,
      is_emergency: (input.deadline.getTime() - Date.now()) < 3 * 60 * 60 * 1000,
    })
    .returning();

  return order!;
}

// ─── Get Orders (Customer) ────────────────────────────────────────────────────

export async function getCustomerOrders(customerId: string) {
  return dbRead.query.orders.findMany({
    where: eq(orders.customer_id, customerId),
    orderBy: [desc(orders.created_at)],
    with: {
      category: true,
      worker: { with: { user: { columns: { display_name: true, avatar_url: true } } } },
    },
  });
}

// ─── Get Order Detail ─────────────────────────────────────────────────────────

export async function getOrderDetail(orderId: string, userId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      category: true,
      worker: { with: { user: { columns: { display_name: true, avatar_url: true } } } },
      escrow: true,
      chat: true,
    },
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.customer_id !== userId && order.worker?.user_id !== userId) {
    throw new Error("FORBIDDEN");
  }

  return order;
}

// ─── Approve Order ────────────────────────────────────────────────────────────

export async function approveOrder(
  orderId: string,
  customerId: string,
  txClient?: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  const client = txClient ?? db;

  const order = await client.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customer_id, customerId)),
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "submitted" && order.status !== "revision") {
    throw new Error("ORDER_NOT_SUBMITTED");
  }

  // Only update order status here — escrow release is handled by releaseEscrow() in the route handler
  await client
    .update(orders)
    .set({ status: "completed", completed_at: new Date(), updated_at: new Date() })
    .where(eq(orders.id, orderId));

  await reputationQueue.add("update-score", { orderId });

  // Notifikasi worker bahwa order disetujui
  const fullOrder = await client.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { worker: true },
  });
  if (fullOrder?.worker) {
    await notify.orderApproved(fullOrder.worker.user_id, orderId, Number(fullOrder.worker_earnings ?? 0));
  }

  return true;
}

// ─── Request Revision ─────────────────────────────────────────────────────────

export async function requestRevision(
  orderId: string,
  customerId: string,
  note: string
) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customer_id, customerId)),
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "submitted") throw new Error("ORDER_NOT_SUBMITTED");
  if (order.used_revisions >= order.max_revisions) throw new Error("REVISION_QUOTA_EXCEEDED");

  await db
    .update(orders)
    .set({
      status: "revision",
      used_revisions: order.used_revisions + 1,
      updated_at: new Date(),
    })
    .where(eq(orders.id, orderId));

  // Notifikasi worker
  if (order.worker_id) {
    const workerProfile = await db.query.workerProfiles.findFirst({
      where: eq(workerProfiles.id, order.worker_id),
    });
    if (workerProfile) await notify.revisionRequested(workerProfile.user_id, orderId, note);
  }

  return true;
}

// ─── Submit Order (Worker) ────────────────────────────────────────────────────

export async function submitOrder(input: {
  orderId: string;
  workerUserId: string;
  fileUrls: string[];
  notes?: string;
}) {
  const workerProfile = await db.query.workerProfiles.findFirst({
    where: eq(workerProfiles.user_id, input.workerUserId),
  });
  if (!workerProfile) throw new Error("WORKER_NOT_FOUND");

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, input.orderId),
      eq(orders.worker_id, workerProfile.id),
    ),
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "in_progress" && order.status !== "revision") {
    throw new Error("ORDER_NOT_SUBMITTABLE");
  }

  const autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db
    .update(orders)
    .set({
      status: "submitted",
      submitted_at: new Date(),
      auto_approve_at: autoApproveAt,
      attachment_urls: input.fileUrls,
      updated_at: new Date(),
    })
    .where(eq(orders.id, input.orderId));

  await autoApproveQueue.add(
    "auto-approve",
    { orderId: input.orderId },
    { delay: 48 * 60 * 60 * 1000 }
  );

  // Notifikasi customer bahwa hasil sudah dikirim
  const orderData = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
    columns: { customer_id: true },
  });
  if (orderData) await notify.orderSubmitted(orderData.customer_id, input.orderId);

  return { autoApproveAt };
}

// ─── Get Worker Orders ────────────────────────────────────────────────────────

export async function getWorkerOrders(workerUserId: string) {
  const workerProfile = await db.query.workerProfiles.findFirst({
    where: eq(workerProfiles.user_id, workerUserId),
  });
  if (!workerProfile) return [];

  return dbRead.query.orders.findMany({
    where: eq(orders.worker_id, workerProfile.id),
    orderBy: [desc(orders.created_at)],
    with: {
      category: true,
      customer: { columns: { display_name: true, avatar_url: true } },
    },
  });
}

// ─── Submit Review ────────────────────────────────────────────────────────────

export async function submitReview(input: {
  orderId: string;
  customerId: string;
  overallRating: number;
  qualityRating?: number;
  speedRating?: number;
  communicationRating?: number;
  comment?: string;
  isAnonymous?: boolean;
}) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, input.orderId), eq(orders.customer_id, input.customerId)),
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "completed") throw new Error("ORDER_NOT_COMPLETED");
  if (!order.worker_id) throw new Error("ORDER_NOT_FOUND");

  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.order_id, input.orderId), eq(reviews.customer_id, input.customerId)),
  });
  if (existing) throw new Error("ALREADY_REVIEWED");

  const now = new Date();
  const revealAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // reveal setelah 7 hari

  const [review] = await db.insert(reviews).values({
    order_id: input.orderId,
    customer_id: input.customerId,
    worker_id: order.worker_id,
    overall_rating: String(input.overallRating),
    quality_rating: input.qualityRating ?? null,
    comm_rating: input.communicationRating ?? null,
    time_rating: input.speedRating ?? null,
    customer_comment: input.comment,
    customer_submitted: true,
    reveal_at: revealAt,
    customer_deadline: order.customer_deadline,
    worker_deadline: order.worker_deadline ?? order.customer_deadline,
  }).returning();

  await reputationQueue.add("update-score", { orderId: input.orderId, workerId: order.worker_id });

  return review!;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${date}-${rand}`;
}
