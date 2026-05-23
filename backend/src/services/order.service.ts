import { eq, and, desc } from "drizzle-orm";
import { db, dbRead } from "../lib/database";
import { orders, escrowTransactions } from "../../database/schema";
import { reputationQueue } from "../lib/queue";
import { analyzeTask } from "./ai.service";
import { categories } from "../../database/schema";

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

export async function approveOrder(orderId: string, customerId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.customer_id, customerId)),
  });

  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "submitted" && order.status !== "revision") {
    throw new Error("ORDER_NOT_SUBMITTED");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "completed", completed_at: new Date() })
      .where(eq(orders.id, orderId));

    await tx
      .update(escrowTransactions)
      .set({ status: "released" })
      .where(eq(escrowTransactions.order_id, orderId));
  });

  await reputationQueue.add("update-score", { orderId });

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

  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${date}-${rand}`;
}
