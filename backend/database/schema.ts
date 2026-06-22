/**
 * DATABASE SCHEMA — JokiIn Platform
 * Stack  : Drizzle ORM v1-beta + PostgreSQL 17 + pgvector
 * File   : packages/db/schema.ts
 *
 * Naming convention:
 *   - Tables   : snake_case plural  (users, orders, worker_profiles)
 *   - Columns  : snake_case         (worker_id, created_at)
 *   - TS vars  : camelCase          (workerProfiles, orderMilestones)
 *   - Indexes  : <table>_<col>_idx
 */

import {
  pgTable, pgEnum, uuid, text, integer, smallint, decimal,
  boolean, timestamp, jsonb, index, uniqueIndex, varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "worker",
  "admin",
  "super_admin",
]);

export const badgeLevelEnum = pgEnum("badge_level", [
  "SPROUT",
  "SPARK",
  "BLAZE",
  "PRIME",
  "APEX",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft",            // customer belum bayar
  "pending_payment",  // menunggu konfirmasi Midtrans
  "broadcast",        // mencari worker
  "matched",          // worker sudah accept
  "in_progress",      // sedang dikerjakan
  "submitted",        // worker kirim hasil
  "revision",         // dalam proses revisi
  "disputed",         // dispute aktif
  "completed",        // customer approve / auto-approve
  "cancelled",        // dibatalkan
  "refunded",         // dana dikembalikan
]);

export const difficultyEnum = pgEnum("difficulty", [
  "1", "2", "3", "4", "5",
]);

export const escrowStatusEnum = pgEnum("escrow_status", [
  "held",
  "partially_released",
  "released",
  "refunded",
  "disputed",
]);

export const withdrawStatusEnum = pgEnum("withdraw_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "rejected",
]);

export const penaltyTypeEnum = pgEnum("penalty_type", [
  "cancel_before_start",
  "cancel_mid_work",
  "late_under_30min",
  "late_over_30min",
  "no_submission",
  "rating_manipulation",
  "scope_violation",
  "external_contact_attempt",
]);

export const amendmentStatusEnum = pgEnum("amendment_status", [
  "pending",
  "approved",
  "rejected",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "escrow_hold",
  "escrow_release",
  "escrow_refund",
  "penalty_applied",
  "user_suspended",
  "user_banned",
  "dispute_opened",
  "dispute_resolved",
  "withdrawal_processed",
  "admin_override",
]);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id             : uuid("id").primaryKey().defaultRandom(),
  role           : userRoleEnum("role").notNull().default("customer"),
  email          : varchar("email", { length: 255 }).notNull(),
  phone          : varchar("phone", { length: 20 }),
  password_hash  : text("password_hash"),
  display_name   : varchar("display_name", { length: 100 }).notNull(),
  avatar_url     : text("avatar_url"),
  is_anonymous   : boolean("is_anonymous").notNull().default(false),
  is_verified    : boolean("is_verified").notNull().default(false),
  is_suspended   : boolean("is_suspended").notNull().default(false),
  is_banned      : boolean("is_banned").notNull().default(false),
  suspended_until: timestamp("suspended_until"),
  trust_score    : smallint("trust_score").notNull().default(0),
  // customer-specific
  customer_score : decimal("customer_score", { precision: 4, scale: 2 }).default("100.00"),
  customer_level : varchar("customer_level", { length: 20 }).default("Pemula"),
  total_orders   : integer("total_orders").notNull().default(0),
  // timestamps
  created_at     : timestamp("created_at").notNull().defaultNow(),
  updated_at     : timestamp("updated_at").notNull().defaultNow(),
  last_active_at : timestamp("last_active_at"),
  deleted_at     : timestamp("deleted_at"), // soft delete — UU PDP compliance
  metadata       : jsonb("metadata").default("{}"),
}, (t) => ({
  email_idx: uniqueIndex("users_email_idx").on(t.email),
  phone_idx: index("users_phone_idx").on(t.phone),
  role_idx : index("users_role_idx").on(t.role),
}));

// ─────────────────────────────────────────────────────────────────────────────
// WORKER PROFILES
// ─────────────────────────────────────────────────────────────────────────────

export const workerProfiles = pgTable("worker_profiles", {
  id                  : uuid("id").primaryKey().defaultRandom(),
  user_id             : uuid("user_id").notNull().references(() => users.id),
  badge               : badgeLevelEnum("badge").notNull().default("SPROUT"),
  // weighted reputation score 0–100
  reputation_score    : decimal("reputation_score", { precision: 5, scale: 2 }).default("50.00"),
  // komponen skor individual
  rating_score        : decimal("rating_score", { precision: 3, scale: 2 }).default("0.00"),
  completion_rate     : decimal("completion_rate", { precision: 5, scale: 2 }).default("0.00"),
  deadline_score      : decimal("deadline_score", { precision: 5, scale: 2 }).default("0.00"),
  response_rate       : decimal("response_rate", { precision: 5, scale: 2 }).default("0.00"),
  repeat_customer_rate: decimal("repeat_customer_rate", { precision: 5, scale: 2 }).default("0.00"),
  avg_response_minutes: integer("avg_response_minutes").default(0),
  // slot & availability
  max_active_orders   : smallint("max_active_orders").notNull().default(3),
  current_active_orders: integer("current_active_orders").notNull().default(0),
  is_online           : boolean("is_online").notNull().default(false),
  is_on_leave         : boolean("is_on_leave").notNull().default(false),
  active_hours_start  : varchar("active_hours_start", { length: 5 }).default("08:00"),
  active_hours_end    : varchar("active_hours_end", { length: 5 }).default("22:00"),
  active_days         : jsonb("active_days").default('["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]'),
  // stats
  total_completed     : integer("total_completed").notNull().default(0),
  total_earnings      : decimal("total_earnings", { precision: 14, scale: 2 }).default("0.00"),
  strike_count        : smallint("strike_count").notNull().default(0),
  // subscription
  is_pro              : boolean("is_pro").notNull().default(false),
  pro_expires_at      : timestamp("pro_expires_at"),
  bio                 : text("bio"),
  created_at          : timestamp("created_at").notNull().defaultNow(),
  updated_at          : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  user_idx      : uniqueIndex("worker_profiles_user_idx").on(t.user_id),
  badge_idx     : index("worker_profiles_badge_idx").on(t.badge),
  reputation_idx: index("worker_profiles_reputation_idx").on(t.reputation_score),
  online_idx    : index("worker_profiles_online_idx").on(t.is_online),
}));

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL LINKS
// ─────────────────────────────────────────────────────────────────────────────

export const socialLinks = pgTable("social_links", {
  id             : uuid("id").primaryKey().defaultRandom(),
  worker_id      : uuid("worker_id").notNull().references(() => workerProfiles.id, { onDelete: "cascade" }),
  platform       : varchar("platform", { length: 30 }).notNull(), // linkedin | github | instagram | tiktok | youtube | behance
  url            : text("url").notNull(),
  username       : varchar("username", { length: 100 }),
  is_verified    : boolean("is_verified").notNull().default(false),
  follower_count : integer("follower_count"),
  account_age_days: integer("account_age_days"),
  trust_points   : smallint("trust_points").notNull().default(0),
  verified_at    : timestamp("verified_at"),
  created_at     : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  worker_platform_idx: uniqueIndex("social_links_worker_platform_idx").on(t.worker_id, t.platform),
}));

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO ITEMS
// ─────────────────────────────────────────────────────────────────────────────

export const portfolioItems = pgTable("portfolio_items", {
  id          : uuid("id").primaryKey().defaultRandom(),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id, { onDelete: "cascade" }),
  category_id : uuid("category_id"),
  title       : varchar("title", { length: 200 }).notNull(),
  description : text("description"),
  file_url    : text("file_url"),
  external_url: text("external_url"),
  is_verified : boolean("is_verified").notNull().default(false),
  is_public   : boolean("is_public").notNull().default(true),
  verified_at : timestamp("verified_at"),
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  worker_idx: index("portfolio_items_worker_idx").on(t.worker_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id                 : uuid("id").primaryKey().defaultRandom(),
  parent_id          : uuid("parent_id"),
  name               : varchar("name", { length: 100 }).notNull(),
  slug               : varchar("slug", { length: 100 }).notNull(),
  icon               : varchar("icon", { length: 50 }),
  base_difficulty_min: smallint("base_difficulty_min").notNull().default(1),
  base_difficulty_max: smallint("base_difficulty_max").notNull().default(5),
  min_price_per_page : decimal("min_price_per_page", { precision: 10, scale: 2 }),
  estimated_hours_base: decimal("estimated_hours_base", { precision: 5, scale: 2 }),
  is_active          : boolean("is_active").notNull().default(true),
  sort_order         : smallint("sort_order").default(0),
  created_at         : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  slug_idx: uniqueIndex("categories_slug_idx").on(t.slug),
}));

// ─────────────────────────────────────────────────────────────────────────────
// SKILL TESTS
// ─────────────────────────────────────────────────────────────────────────────

export const skillTests = pgTable("skill_tests", {
  id          : uuid("id").primaryKey().defaultRandom(),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id),
  category_id : uuid("category_id").notNull().references(() => categories.id),
  score       : smallint("score").notNull(),        // 0–100
  is_passed   : boolean("is_passed").notNull(),
  can_retake_at: timestamp("can_retake_at"),         // retake setelah 7 hari jika gagal
  taken_at    : timestamp("taken_at").notNull().defaultNow(),
}, (t) => ({
  worker_category_idx: index("skill_tests_worker_category_idx").on(t.worker_id, t.category_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// WORKER CATEGORY SCORES
// ─────────────────────────────────────────────────────────────────────────────

export const workerCategoryScores = pgTable("worker_category_scores", {
  id          : uuid("id").primaryKey().defaultRandom(),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id),
  category_id : uuid("category_id").notNull().references(() => categories.id),
  rating      : decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  total_orders: integer("total_orders").notNull().default(0),
  updated_at  : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unique_idx: uniqueIndex("worker_category_scores_unique_idx").on(t.worker_id, t.category_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id                  : uuid("id").primaryKey().defaultRandom(),
  order_number        : varchar("order_number", { length: 20 }).notNull(), // ORD-20260521-XXXX
  customer_id         : uuid("customer_id").notNull().references(() => users.id),
  worker_id           : uuid("worker_id").references(() => workerProfiles.id),
  category_id         : uuid("category_id").notNull().references(() => categories.id),
  status              : orderStatusEnum("status").notNull().default("draft"),
  // detail tugas — terkunci setelah worker accept
  title               : varchar("title", { length: 300 }).notNull(),
  description         : text("description").notNull(),
  output_format       : varchar("output_format", { length: 50 }),   // Word | PDF | PPT | Code | Other
  page_count          : smallint("page_count"),
  additional_notes    : text("additional_notes"),
  forbidden_items     : text("forbidden_items"),
  attachment_urls     : jsonb("attachment_urls").default("[]"),
  // AI analisis (Claude API)
  difficulty_score    : difficultyEnum("difficulty_score"),
  ai_analysis         : jsonb("ai_analysis").default("{}"),          // full structured output
  estimated_hours     : decimal("estimated_hours", { precision: 5, scale: 2 }),
  // pricing
  customer_budget     : decimal("customer_budget", { precision: 12, scale: 2 }).notNull(),
  platform_min_price  : decimal("platform_min_price", { precision: 12, scale: 2 }),
  agreed_price        : decimal("agreed_price", { precision: 12, scale: 2 }),
  platform_fee        : decimal("platform_fee", { precision: 12, scale: 2 }),
  worker_earnings     : decimal("worker_earnings", { precision: 12, scale: 2 }),
  // waktu
  customer_deadline   : timestamp("customer_deadline").notNull(),
  worker_deadline     : timestamp("worker_deadline"),                // customer_deadline - 1 jam buffer
  started_at          : timestamp("started_at"),
  submitted_at        : timestamp("submitted_at"),
  completed_at        : timestamp("completed_at"),
  auto_approve_at     : timestamp("auto_approve_at"),               // set saat worker submit
  // revisi
  max_revisions       : smallint("max_revisions").notNull().default(1),
  used_revisions      : smallint("used_revisions").notNull().default(0),
  // broadcast
  broadcast_batch     : smallint("broadcast_batch").notNull().default(1),
  broadcast_expires_at: timestamp("broadcast_expires_at"),
  // flags
  is_emergency        : boolean("is_emergency").notNull().default(false),
  is_exclusive        : boolean("is_exclusive").notNull().default(false), // direct hire
  is_secret           : boolean("is_secret").notNull().default(false),
  // cancel
  cancelled_by_id     : uuid("cancelled_by_id").references(() => users.id),
  cancel_reason       : text("cancel_reason"),
  cancel_category     : varchar("cancel_category", { length: 50 }),
  created_at          : timestamp("created_at").notNull().defaultNow(),
  updated_at          : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  order_number_idx    : uniqueIndex("orders_order_number_idx").on(t.order_number),
  customer_idx        : index("orders_customer_idx").on(t.customer_id),
  worker_idx          : index("orders_worker_idx").on(t.worker_id),
  status_idx          : index("orders_status_idx").on(t.status),
  deadline_idx        : index("orders_deadline_idx").on(t.customer_deadline),
  category_status_idx : index("orders_category_status_idx").on(t.category_id, t.status),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ORDER MILESTONES
// ─────────────────────────────────────────────────────────────────────────────

export const orderMilestones = pgTable("order_milestones", {
  id             : uuid("id").primaryKey().defaultRandom(),
  order_id       : uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  milestone_no   : smallint("milestone_no").notNull(),  // 1, 2
  title          : varchar("title", { length: 100 }).notNull(),
  description    : text("description"),
  release_percent: smallint("release_percent").notNull(), // 30 atau 70
  amount         : decimal("amount", { precision: 12, scale: 2 }).notNull(),
  is_released    : boolean("is_released").notNull().default(false),
  released_at    : timestamp("released_at"),
  file_urls      : jsonb("file_urls").default("[]"),
  submitted_at   : timestamp("submitted_at"),
  approved_at    : timestamp("approved_at"),
  created_at     : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  order_idx: index("order_milestones_order_idx").on(t.order_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// BROADCAST LOGS
// ─────────────────────────────────────────────────────────────────────────────

export const broadcastLogs = pgTable("broadcast_logs", {
  id          : uuid("id").primaryKey().defaultRandom(),
  order_id    : uuid("order_id").notNull().references(() => orders.id),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id),
  batch_number: smallint("batch_number").notNull().default(1),
  sent_at     : timestamp("sent_at").notNull().defaultNow(),
  seen_at     : timestamp("seen_at"),
  responded_at: timestamp("responded_at"),
  response    : varchar("response", { length: 10 }),  // accepted | rejected | ignored
}, (t) => ({
  order_idx : index("broadcast_logs_order_idx").on(t.order_id),
  worker_idx: index("broadcast_logs_worker_idx").on(t.worker_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ESCROW TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const escrowTransactions = pgTable("escrow_transactions", {
  id                 : uuid("id").primaryKey().defaultRandom(),
  order_id           : uuid("order_id").notNull().references(() => orders.id),
  status             : escrowStatusEnum("status").notNull().default("held"),
  total_amount       : decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  platform_fee       : decimal("platform_fee", { precision: 14, scale: 2 }).notNull(),
  worker_amount      : decimal("worker_amount", { precision: 14, scale: 2 }).notNull(),
  refund_amount      : decimal("refund_amount", { precision: 14, scale: 2 }).default("0.00"),
  // Midtrans
  midtrans_order_id  : varchar("midtrans_order_id", { length: 100 }),
  midtrans_payment_id: varchar("midtrans_payment_id", { length: 100 }),
  payment_method     : varchar("payment_method", { length: 50 }),
  paid_at            : timestamp("paid_at"),
  released_at        : timestamp("released_at"),
  refunded_at        : timestamp("refunded_at"),
  idempotency_key    : varchar("idempotency_key", { length: 100 }).notNull(),
  webhook_payload    : jsonb("webhook_payload").default("{}"),
  created_at         : timestamp("created_at").notNull().defaultNow(),
  updated_at         : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  order_idx      : uniqueIndex("escrow_transactions_order_idx").on(t.order_id),
  midtrans_idx   : index("escrow_transactions_midtrans_idx").on(t.midtrans_order_id),
  idempotency_idx: uniqueIndex("escrow_transactions_idempotency_idx").on(t.idempotency_key),
}));

// ─────────────────────────────────────────────────────────────────────────────
// WALLETS
// ─────────────────────────────────────────────────────────────────────────────

export const wallets = pgTable("wallets", {
  id                  : uuid("id").primaryKey().defaultRandom(),
  user_id             : uuid("user_id").notNull().references(() => users.id),
  balance             : decimal("balance", { precision: 14, scale: 2 }).notNull().default("0.00"),
  pending_balance     : decimal("pending_balance", { precision: 14, scale: 2 }).notNull().default("0.00"),
  total_earned        : decimal("total_earned", { precision: 14, scale: 2 }).notNull().default("0.00"),
  total_withdrawn     : decimal("total_withdrawn", { precision: 14, scale: 2 }).notNull().default("0.00"),
  // rekening bank terverifikasi
  bank_name           : varchar("bank_name", { length: 50 }),
  bank_account_number : varchar("bank_account_number", { length: 30 }),
  bank_account_name   : varchar("bank_account_name", { length: 100 }),
  is_bank_verified    : boolean("is_bank_verified").notNull().default(false),
  bank_verified_at    : timestamp("bank_verified_at"),
  created_at          : timestamp("created_at").notNull().defaultNow(),
  updated_at          : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  user_idx: uniqueIndex("wallets_user_idx").on(t.user_id),
}));

export const walletTransactions = pgTable("wallet_transactions", {
  id            : uuid("id").primaryKey().defaultRandom(),
  wallet_id     : uuid("wallet_id").notNull().references(() => wallets.id),
  order_id      : uuid("order_id").references(() => orders.id),
  type          : varchar("type", { length: 30 }).notNull(), // credit | debit | pending | release
  amount        : decimal("amount", { precision: 14, scale: 2 }).notNull(),
  balance_before: decimal("balance_before", { precision: 14, scale: 2 }).notNull(),
  balance_after : decimal("balance_after", { precision: 14, scale: 2 }).notNull(),
  description   : text("description"),
  created_at    : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  wallet_idx: index("wallet_transactions_wallet_idx").on(t.wallet_id),
  order_idx : index("wallet_transactions_order_idx").on(t.order_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// WITHDRAWALS
// ─────────────────────────────────────────────────────────────────────────────

export const withdrawals = pgTable("withdrawals", {
  id                  : uuid("id").primaryKey().defaultRandom(),
  wallet_id           : uuid("wallet_id").notNull().references(() => wallets.id),
  user_id             : uuid("user_id").notNull().references(() => users.id),
  amount              : decimal("amount", { precision: 14, scale: 2 }).notNull(),
  admin_fee           : decimal("admin_fee", { precision: 14, scale: 2 }).notNull().default("0.00"),
  net_amount          : decimal("net_amount", { precision: 14, scale: 2 }).notNull(),
  status              : withdrawStatusEnum("status").notNull().default("pending"),
  bank_name           : varchar("bank_name", { length: 50 }).notNull(),
  bank_account_number : varchar("bank_account_number", { length: 30 }).notNull(),
  bank_account_name   : varchar("bank_account_name", { length: 100 }).notNull(),
  otp_verified        : boolean("otp_verified").notNull().default(false),
  processed_by_id     : uuid("processed_by_id").references(() => users.id),
  processed_at        : timestamp("processed_at"),
  failure_reason      : text("failure_reason"),
  idempotency_key     : varchar("idempotency_key", { length: 100 }).notNull(),
  created_at          : timestamp("created_at").notNull().defaultNow(),
  updated_at          : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  wallet_idx     : index("withdrawals_wallet_idx").on(t.wallet_id),
  status_idx     : index("withdrawals_status_idx").on(t.status),
  idempotency_idx: uniqueIndex("withdrawals_idempotency_idx").on(t.idempotency_key),
}));

// ─────────────────────────────────────────────────────────────────────────────
// CHATS & MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export const chats = pgTable("chats", {
  id          : uuid("id").primaryKey().defaultRandom(),
  order_id    : uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  customer_id : uuid("customer_id").notNull().references(() => users.id),
  worker_id   : uuid("worker_id").notNull().references(() => users.id),
  is_locked   : boolean("is_locked").notNull().default(false), // terkunci setelah order selesai + 7 hari
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  order_idx: uniqueIndex("chats_order_idx").on(t.order_id),
}));

export const messages = pgTable("messages", {
  id              : uuid("id").primaryKey().defaultRandom(),
  chat_id         : uuid("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
  sender_id       : uuid("sender_id").notNull().references(() => users.id),
  content         : text("content"),
  file_urls       : jsonb("file_urls").default("[]"),
  message_type    : varchar("message_type", { length: 20 }).notNull().default("text"), // text | file | system
  is_flagged      : boolean("is_flagged").notNull().default(false),
  flag_reason     : varchar("flag_reason", { length: 100 }),
  is_system_message: boolean("is_system_message").notNull().default(false),
  read_at         : timestamp("read_at"),
  created_at      : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  chat_idx  : index("messages_chat_idx").on(t.chat_id),
  sender_idx: index("messages_sender_idx").on(t.sender_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS (blind review system)
// ─────────────────────────────────────────────────────────────────────────────

export const reviews = pgTable("reviews", {
  id                : uuid("id").primaryKey().defaultRandom(),
  order_id          : uuid("order_id").notNull().references(() => orders.id),
  customer_id       : uuid("customer_id").notNull().references(() => users.id),
  worker_id         : uuid("worker_id").notNull().references(() => workerProfiles.id),
  // blind review — tidak terlihat satu sama lain sampai keduanya submit / waktu habis
  customer_submitted: boolean("customer_submitted").notNull().default(false),
  worker_submitted  : boolean("worker_submitted").notNull().default(false),
  is_revealed       : boolean("is_revealed").notNull().default(false),
  // rating customer → worker (3 dimensi)
  quality_rating    : smallint("quality_rating"),   // 1–5 kualitas hasil
  comm_rating       : smallint("comm_rating"),       // 1–5 komunikasi
  time_rating       : smallint("time_rating"),       // 1–5 ketepatan waktu
  overall_rating    : decimal("overall_rating", { precision: 3, scale: 2 }),
  customer_comment  : text("customer_comment"),
  result_match_desc : boolean("result_match_desc"),  // hasil sesuai deskripsi?
  would_use_again   : boolean("would_use_again"),    // mau pakai lagi?
  // rating worker → customer
  customer_rating   : smallint("customer_rating"),   // 1–5
  worker_comment    : text("worker_comment"),
  // deadline reveal
  reveal_at         : timestamp("reveal_at").notNull(),
  customer_deadline : timestamp("customer_deadline").notNull(),
  worker_deadline   : timestamp("worker_deadline").notNull(),
  created_at        : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  order_idx : uniqueIndex("reviews_order_idx").on(t.order_id),
  worker_idx: index("reviews_worker_idx").on(t.worker_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// AMENDMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const amendments = pgTable("amendments", {
  id                  : uuid("id").primaryKey().defaultRandom(),
  order_id            : uuid("order_id").notNull().references(() => orders.id),
  requested_by_id     : uuid("requested_by_id").notNull().references(() => users.id),
  status              : amendmentStatusEnum("status").notNull().default("pending"),
  change_type         : varchar("change_type", { length: 30 }).notNull(), // scope | deadline | price
  description         : text("description").notNull(),
  price_delta         : decimal("price_delta", { precision: 12, scale: 2 }).default("0.00"),
  deadline_delta_hours: integer("deadline_delta_hours").default(0),
  approved_by_id      : uuid("approved_by_id").references(() => users.id),
  approved_at         : timestamp("approved_at"),
  rejected_reason     : text("rejected_reason"),
  expires_at          : timestamp("expires_at").notNull(), // 24 jam setelah dibuat
  created_at          : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  order_idx : index("amendments_order_idx").on(t.order_id),
  status_idx: index("amendments_status_idx").on(t.status),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTES
// ─────────────────────────────────────────────────────────────────────────────

export const disputes = pgTable("disputes", {
  id            : uuid("id").primaryKey().defaultRandom(),
  order_id      : uuid("order_id").notNull().references(() => orders.id),
  opened_by_id  : uuid("opened_by_id").notNull().references(() => users.id),
  reason        : varchar("reason", { length: 50 }).notNull(),
  description   : text("description").notNull(),
  evidence_urls : jsonb("evidence_urls").default("[]"),
  status        : varchar("status", { length: 20 }).notNull().default("open"),
  resolution    : varchar("resolution", { length: 30 }), // refund_full | refund_partial | release | redo
  resolved_by_id: uuid("resolved_by_id").references(() => users.id),
  resolved_note : text("resolved_note"),
  refund_amount : decimal("refund_amount", { precision: 12, scale: 2 }),
  opened_at     : timestamp("opened_at").notNull().defaultNow(),
  resolved_at   : timestamp("resolved_at"),
}, (t) => ({
  order_idx : uniqueIndex("disputes_order_idx").on(t.order_id),
  status_idx: index("disputes_status_idx").on(t.status),
}));

// ─────────────────────────────────────────────────────────────────────────────
// PENALTIES
// ─────────────────────────────────────────────────────────────────────────────

export const penalties = pgTable("penalties", {
  id            : uuid("id").primaryKey().defaultRandom(),
  worker_id     : uuid("worker_id").notNull().references(() => workerProfiles.id),
  order_id      : uuid("order_id").references(() => orders.id),
  type          : penaltyTypeEnum("type").notNull(),
  point_deducted: smallint("point_deducted").notNull(),
  strikes_added : smallint("strikes_added").notNull().default(0),
  reason        : text("reason").notNull(),
  applied_by_id : uuid("applied_by_id").references(() => users.id), // null = sistem otomatis
  created_at    : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  worker_idx: index("penalties_worker_idx").on(t.worker_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id        : uuid("id").primaryKey().defaultRandom(),
  user_id   : uuid("user_id").notNull().references(() => users.id),
  type      : varchar("type", { length: 50 }).notNull(),
  title     : varchar("title", { length: 200 }).notNull(),
  body      : text("body").notNull(),
  data      : jsonb("data").default("{}"),
  channel   : varchar("channel", { length: 20 }).notNull().default("in_app"), // in_app | whatsapp | email | push
  is_read   : boolean("is_read").notNull().default(false),
  read_at   : timestamp("read_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  user_idx     : index("notifications_user_idx").on(t.user_id),
  user_read_idx: index("notifications_user_read_idx").on(t.user_id, t.is_read),
}));

// ─────────────────────────────────────────────────────────────────────────────
// VOUCHERS
// ─────────────────────────────────────────────────────────────────────────────

export const vouchers = pgTable("vouchers", {
  id              : uuid("id").primaryKey().defaultRandom(),
  code            : varchar("code", { length: 30 }).notNull(),
  type            : varchar("type", { length: 20 }).notNull(), // percentage | fixed | cashback
  value           : decimal("value", { precision: 10, scale: 2 }).notNull(),
  min_order_amount: decimal("min_order_amount", { precision: 12, scale: 2 }),
  max_discount    : decimal("max_discount", { precision: 12, scale: 2 }),
  usage_limit     : integer("usage_limit"),
  used_count      : integer("used_count").notNull().default(0),
  per_user_limit  : smallint("per_user_limit").notNull().default(1),
  target_user_id  : uuid("target_user_id").references(() => users.id), // null = semua user
  is_active       : boolean("is_active").notNull().default(true),
  starts_at       : timestamp("starts_at").notNull(),
  expires_at      : timestamp("expires_at").notNull(),
  created_at      : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  code_idx: uniqueIndex("vouchers_code_idx").on(t.code),
}));

export const voucherUsages = pgTable("voucher_usages", {
  id         : uuid("id").primaryKey().defaultRandom(),
  voucher_id : uuid("voucher_id").notNull().references(() => vouchers.id),
  user_id    : uuid("user_id").notNull().references(() => users.id),
  order_id   : uuid("order_id").notNull().references(() => orders.id),
  discount   : decimal("discount", { precision: 12, scale: 2 }).notNull(),
  used_at    : timestamp("used_at").notNull().defaultNow(),
}, (t) => ({
  unique_idx: uniqueIndex("voucher_usages_unique_idx").on(t.voucher_id, t.user_id, t.order_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id         : uuid("id").primaryKey().defaultRandom(),
  action     : auditActionEnum("action").notNull(),
  actor_id   : uuid("actor_id").references(() => users.id), // null = sistem otomatis
  target_id  : uuid("target_id"),
  target_type: varchar("target_type", { length: 30 }), // order | user | escrow | withdrawal
  before     : jsonb("before").default("{}"),
  after      : jsonb("after").default("{}"),
  metadata   : jsonb("metadata").default("{}"),
  ip_address : varchar("ip_address", { length: 45 }),
  created_at : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  actor_idx : index("audit_logs_actor_idx").on(t.actor_id),
  target_idx: index("audit_logs_target_idx").on(t.target_id, t.target_type),
  action_idx: index("audit_logs_action_idx").on(t.action),
  time_idx  : index("audit_logs_time_idx").on(t.created_at),
}));

// ─────────────────────────────────────────────────────────────────────────────
// WORKER NOTES (catatan pribadi tentang customer — tidak terlihat customer)
// ─────────────────────────────────────────────────────────────────────────────

export const workerNotes = pgTable("worker_notes", {
  id          : uuid("id").primaryKey().defaultRandom(),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id),
  customer_id : uuid("customer_id").notNull().references(() => users.id),
  note        : text("note").notNull(),
  updated_at  : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  unique_idx: uniqueIndex("worker_notes_unique_idx").on(t.worker_id, t.customer_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FAVORITE WORKERS
// ─────────────────────────────────────────────────────────────────────────────

export const favoriteWorkers = pgTable("favorite_workers", {
  id          : uuid("id").primaryKey().defaultRandom(),
  customer_id : uuid("customer_id").notNull().references(() => users.id),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id),
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unique_idx: uniqueIndex("favorite_workers_unique_idx").on(t.customer_id, t.worker_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// WAITING LIST
// ─────────────────────────────────────────────────────────────────────────────

export const waitingList = pgTable("waiting_list", {
  id          : uuid("id").primaryKey().defaultRandom(),
  customer_id : uuid("customer_id").notNull().references(() => users.id),
  worker_id   : uuid("worker_id").notNull().references(() => workerProfiles.id),
  category_id : uuid("category_id").references(() => categories.id),
  notified_at : timestamp("notified_at"),
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  unique_idx: uniqueIndex("waiting_list_unique_idx").on(t.customer_id, t.worker_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// REFERRALS
// ─────────────────────────────────────────────────────────────────────────────

export const referrals = pgTable("referrals", {
  id           : uuid("id").primaryKey().defaultRandom(),
  referrer_id  : uuid("referrer_id").notNull().references(() => users.id),
  referred_id  : uuid("referred_id").notNull().references(() => users.id),
  code         : varchar("code", { length: 20 }).notNull(),
  bonus_type   : varchar("bonus_type", { length: 20 }).notNull(), // wallet_credit | commission_discount
  bonus_amount : decimal("bonus_amount", { precision: 10, scale: 2 }),
  is_paid      : boolean("is_paid").notNull().default(false),
  paid_at      : timestamp("paid_at"),
  created_at   : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  code_idx    : uniqueIndex("referrals_code_idx").on(t.code),
  referrer_idx: index("referrals_referrer_idx").on(t.referrer_id),
}));

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  workerProfile  : one(workerProfiles, { fields: [users.id], references: [workerProfiles.user_id] }),
  wallet         : one(wallets, { fields: [users.id], references: [wallets.user_id] }),
  customerOrders : many(orders),
  notifications  : many(notifications),
  favoriteWorkers: many(favoriteWorkers),
}));

export const workerProfilesRelations = relations(workerProfiles, ({ one, many }) => ({
  user           : one(users, { fields: [workerProfiles.user_id], references: [users.id] }),
  socialLinks    : many(socialLinks),
  portfolioItems : many(portfolioItems),
  skillTests     : many(skillTests),
  categoryScores : many(workerCategoryScores),
  notes          : many(workerNotes),
  penalties      : many(penalties),
  favoriteBy     : many(favoriteWorkers),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer     : one(users, { fields: [orders.customer_id], references: [users.id] }),
  worker       : one(workerProfiles, { fields: [orders.worker_id], references: [workerProfiles.id] }),
  category     : one(categories, { fields: [orders.category_id], references: [categories.id] }),
  escrow       : one(escrowTransactions, { fields: [orders.id], references: [escrowTransactions.order_id] }),
  chat         : one(chats, { fields: [orders.id], references: [chats.order_id] }),
  review       : one(reviews, { fields: [orders.id], references: [reviews.order_id] }),
  milestones   : many(orderMilestones),
  amendments   : many(amendments),
  broadcastLogs: many(broadcastLogs),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  order   : one(orders, { fields: [chats.order_id], references: [orders.id] }),
  messages: many(messages),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user        : one(users, { fields: [wallets.user_id], references: [users.id] }),
  transactions: many(walletTransactions),
  withdrawals : many(withdrawals),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order   : one(orders, { fields: [reviews.order_id], references: [orders.id] }),
  customer: one(users, { fields: [reviews.customer_id], references: [users.id] }),
  worker  : one(workerProfiles, { fields: [reviews.worker_id], references: [workerProfiles.id] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// CMS — BLOG & CONTENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const cmsPostStatusEnum = pgEnum("cms_post_status", [
  "draft",
  "review",
  "published",
  "archived",
]);

export const cmsPageTypeEnum = pgEnum("cms_page_type", [
  "blog",           // artikel blog SEO
  "static",         // FAQ, About, Cara Kerja
  "category_landing", // /kategori/matematika
  "newsletter",     // konten email blast
]);

export const cmsMediaTypeEnum = pgEnum("cms_media_type", [
  "image",
  "video",
  "document",
  "og_image",
]);

// ─── CMS AUTHORS ─────────────────────────────────────────────────────────────

export const cmsAuthors = pgTable("cms_authors", {
  id          : uuid("id").primaryKey().defaultRandom(),
  user_id     : uuid("user_id").references(() => users.id), // link ke admin user, null = external author
  name        : varchar("name", { length: 100 }).notNull(),
  slug        : varchar("slug", { length: 100 }).notNull(),
  bio         : text("bio"),
  avatar_url  : text("avatar_url"),
  twitter_url : text("twitter_url"),
  linkedin_url: text("linkedin_url"),
  is_active   : boolean("is_active").notNull().default(true),
  created_at  : timestamp("created_at").notNull().defaultNow(),
  updated_at  : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  slug_idx: uniqueIndex("cms_authors_slug_idx").on(t.slug),
}));

// ─── CMS CATEGORIES (untuk blog) ─────────────────────────────────────────────

export const cmsBlogCategories = pgTable("cms_blog_categories", {
  id          : uuid("id").primaryKey().defaultRandom(),
  parent_id   : uuid("parent_id"),
  name        : varchar("name", { length: 100 }).notNull(),
  slug        : varchar("slug", { length: 100 }).notNull(),
  description : text("description"),
  cover_url   : text("cover_url"),
  // SEO
  meta_title      : varchar("meta_title", { length: 60 }),
  meta_description: varchar("meta_description", { length: 160 }),
  is_active   : boolean("is_active").notNull().default(true),
  sort_order  : smallint("sort_order").default(0),
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  slug_idx: uniqueIndex("cms_blog_categories_slug_idx").on(t.slug),
}));

// ─── CMS TAGS ────────────────────────────────────────────────────────────────

export const cmsTags = pgTable("cms_tags", {
  id        : uuid("id").primaryKey().defaultRandom(),
  name      : varchar("name", { length: 50 }).notNull(),
  slug      : varchar("slug", { length: 50 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  slug_idx: uniqueIndex("cms_tags_slug_idx").on(t.slug),
}));

// ─── CMS MEDIA LIBRARY ───────────────────────────────────────────────────────

export const cmsMedia = pgTable("cms_media", {
  id          : uuid("id").primaryKey().defaultRandom(),
  uploaded_by : uuid("uploaded_by").notNull().references(() => users.id),
  type        : cmsMediaTypeEnum("type").notNull().default("image"),
  file_name   : varchar("file_name", { length: 255 }).notNull(),
  file_url    : text("file_url").notNull(),       // Cloudflare R2 URL
  file_size   : integer("file_size"),             // bytes
  mime_type   : varchar("mime_type", { length: 100 }),
  width       : integer("width"),                 // px, untuk image
  height      : integer("height"),
  alt_text    : text("alt_text"),                 // wajib untuk aksesibilitas & SEO
  caption     : text("caption"),
  folder      : varchar("folder", { length: 100 }).default("uncategorized"),
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  type_idx  : index("cms_media_type_idx").on(t.type),
  folder_idx: index("cms_media_folder_idx").on(t.folder),
}));

// ─── CMS POSTS (blog + semua tipe konten) ────────────────────────────────────

export const cmsPosts = pgTable("cms_posts", {
  id               : uuid("id").primaryKey().defaultRandom(),
  type             : cmsPageTypeEnum("type").notNull().default("blog"),
  status           : cmsPostStatusEnum("status").notNull().default("draft"),
  author_id        : uuid("author_id").notNull().references(() => cmsAuthors.id),
  category_id      : uuid("category_id").references(() => cmsBlogCategories.id),
  // konten utama
  title            : varchar("title", { length: 200 }).notNull(),
  slug             : varchar("slug", { length: 200 }).notNull(),
  excerpt          : text("excerpt"),              // ringkasan untuk card & meta description
  content          : jsonb("content").notNull().default("{}"), // rich text sebagai JSON (Tiptap/Lexical format)
  content_html     : text("content_html"),         // rendered HTML untuk serving cepat
  cover_image_id   : uuid("cover_image_id").references(() => cmsMedia.id),
  reading_time_min : smallint("reading_time_min"), // estimasi menit baca, dihitung otomatis
  // SEO
  meta_title       : varchar("meta_title", { length: 60 }),
  meta_description : varchar("meta_description", { length: 160 }),
  og_image_id      : uuid("og_image_id").references(() => cmsMedia.id),
  canonical_url    : text("canonical_url"),        // jika konten republish dari luar
  // structured data
  schema_type      : varchar("schema_type", { length: 30 }).default("Article"), // Article | FAQPage | HowTo
  schema_data      : jsonb("schema_data").default("{}"),
  // category landing page specific
  service_category_id: uuid("service_category_id").references(() => categories.id), // link ke kategori layanan
  // newsletter specific
  newsletter_sent_at : timestamp("newsletter_sent_at"),
  newsletter_recipients: integer("newsletter_recipients").default(0),
  // stats
  view_count       : integer("view_count").notNull().default(0),
  like_count       : integer("like_count").notNull().default(0),
  share_count      : integer("share_count").notNull().default(0),
  // publish control
  published_at     : timestamp("published_at"),
  scheduled_at     : timestamp("scheduled_at"),   // jadwal publish otomatis
  created_at       : timestamp("created_at").notNull().defaultNow(),
  updated_at       : timestamp("updated_at").notNull().defaultNow(),
  deleted_at       : timestamp("deleted_at"),      // soft delete
}, (t) => ({
  slug_idx        : uniqueIndex("cms_posts_slug_idx").on(t.slug),
  type_status_idx : index("cms_posts_type_status_idx").on(t.type, t.status),
  author_idx      : index("cms_posts_author_idx").on(t.author_id),
  category_idx    : index("cms_posts_category_idx").on(t.category_id),
  published_at_idx: index("cms_posts_published_at_idx").on(t.published_at),
  service_cat_idx : index("cms_posts_service_category_idx").on(t.service_category_id),
}));

// ─── CMS POST TAGS (many-to-many) ────────────────────────────────────────────

export const cmsPostTags = pgTable("cms_post_tags", {
  post_id   : uuid("post_id").notNull().references(() => cmsPosts.id, { onDelete: "cascade" }),
  tag_id    : uuid("tag_id").notNull().references(() => cmsTags.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: uniqueIndex("cms_post_tags_pk").on(t.post_id, t.tag_id),
}));

// ─── CMS POST REVISIONS (version history) ────────────────────────────────────

export const cmsPostRevisions = pgTable("cms_post_revisions", {
  id           : uuid("id").primaryKey().defaultRandom(),
  post_id      : uuid("post_id").notNull().references(() => cmsPosts.id, { onDelete: "cascade" }),
  revised_by   : uuid("revised_by").notNull().references(() => users.id),
  title        : varchar("title", { length: 200 }).notNull(),
  content      : jsonb("content").notNull().default("{}"),
  change_note  : text("change_note"),              // opsional: catatan perubahan
  created_at   : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  post_idx: index("cms_post_revisions_post_idx").on(t.post_id),
}));

// ─── CMS STATIC PAGES ────────────────────────────────────────────────────────
// Untuk halaman statis seperti FAQ, About, Cara Kerja
// Terpisah dari cmsPosts karena punya struktur konten berbeda

export const cmsStaticPages = pgTable("cms_static_pages", {
  id               : uuid("id").primaryKey().defaultRandom(),
  slug             : varchar("slug", { length: 100 }).notNull(), // faq, about, cara-kerja
  title            : varchar("title", { length: 200 }).notNull(),
  content          : jsonb("content").notNull().default("{}"),
  content_html     : text("content_html"),
  // SEO
  meta_title       : varchar("meta_title", { length: 60 }),
  meta_description : varchar("meta_description", { length: 160 }),
  og_image_id      : uuid("og_image_id").references(() => cmsMedia.id),
  // publish
  is_published     : boolean("is_published").notNull().default(false),
  last_edited_by   : uuid("last_edited_by").references(() => users.id),
  published_at     : timestamp("published_at"),
  created_at       : timestamp("created_at").notNull().defaultNow(),
  updated_at       : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  slug_idx: uniqueIndex("cms_static_pages_slug_idx").on(t.slug),
}));

// ─── CMS FAQ ITEMS ───────────────────────────────────────────────────────────

export const cmsFaqItems = pgTable("cms_faq_items", {
  id          : uuid("id").primaryKey().defaultRandom(),
  static_page_id: uuid("static_page_id").references(() => cmsStaticPages.id, { onDelete: "cascade" }),
  question    : text("question").notNull(),
  answer      : text("answer").notNull(),
  category    : varchar("category", { length: 50 }),  // customer | worker | payment | general
  sort_order  : smallint("sort_order").default(0),
  is_published: boolean("is_published").notNull().default(true),
  created_at  : timestamp("created_at").notNull().defaultNow(),
  updated_at  : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  page_idx: index("cms_faq_items_page_idx").on(t.static_page_id),
}));

// ─── CMS NEWSLETTER SUBSCRIBERS ──────────────────────────────────────────────

export const cmsNewsletterSubscribers = pgTable("cms_newsletter_subscribers", {
  id           : uuid("id").primaryKey().defaultRandom(),
  email        : varchar("email", { length: 255 }).notNull(),
  name         : varchar("name", { length: 100 }),
  user_id      : uuid("user_id").references(() => users.id), // null = guest subscriber
  is_confirmed : boolean("is_confirmed").notNull().default(false),
  confirm_token: varchar("confirm_token", { length: 100 }),
  confirmed_at : timestamp("confirmed_at"),
  unsubscribed_at: timestamp("unsubscribed_at"),
  source       : varchar("source", { length: 50 }),  // blog | landing | register | checkout
  created_at   : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  email_idx: uniqueIndex("cms_newsletter_subscribers_email_idx").on(t.email),
}));

// ─── CMS NEWSLETTER SENDS ────────────────────────────────────────────────────

export const cmsNewsletterSends = pgTable("cms_newsletter_sends", {
  id           : uuid("id").primaryKey().defaultRandom(),
  post_id      : uuid("post_id").notNull().references(() => cmsPosts.id),
  subject      : varchar("subject", { length: 200 }).notNull(),
  sent_by      : uuid("sent_by").notNull().references(() => users.id),
  total_sent   : integer("total_sent").notNull().default(0),
  total_opened : integer("total_opened").notNull().default(0),
  total_clicked: integer("total_clicked").notNull().default(0),
  sent_at      : timestamp("sent_at").notNull().defaultNow(),
});

// ─── CMS SEO REDIRECTS ───────────────────────────────────────────────────────

export const cmsSeoRedirects = pgTable("cms_seo_redirects", {
  id          : uuid("id").primaryKey().defaultRandom(),
  from_path   : varchar("from_path", { length: 500 }).notNull(),
  to_path     : varchar("to_path", { length: 500 }).notNull(),
  status_code : smallint("status_code").notNull().default(301), // 301 | 302
  is_active   : boolean("is_active").notNull().default(true),
  created_by  : uuid("created_by").references(() => users.id),
  created_at  : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  from_path_idx: uniqueIndex("cms_seo_redirects_from_path_idx").on(t.from_path),
}));

// ─── CMS SETTINGS (global site settings) ─────────────────────────────────────

export const cmsSettings = pgTable("cms_settings", {
  id          : uuid("id").primaryKey().defaultRandom(),
  key         : varchar("key", { length: 100 }).notNull(),
  value       : jsonb("value").notNull().default("{}"),
  description : text("description"),
  updated_by  : uuid("updated_by").references(() => users.id),
  updated_at  : timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  key_idx: uniqueIndex("cms_settings_key_idx").on(t.key),
}));

// ─── CMS RELATIONS ───────────────────────────────────────────────────────────

export const cmsPostsRelations = relations(cmsPosts, ({ one, many }) => ({
  author      : one(cmsAuthors, { fields: [cmsPosts.author_id], references: [cmsAuthors.id] }),
  category    : one(cmsBlogCategories, { fields: [cmsPosts.category_id], references: [cmsBlogCategories.id] }),
  coverImage  : one(cmsMedia, { fields: [cmsPosts.cover_image_id], references: [cmsMedia.id] }),
  ogImage     : one(cmsMedia, { fields: [cmsPosts.og_image_id], references: [cmsMedia.id] }),
  serviceCategory: one(categories, { fields: [cmsPosts.service_category_id], references: [categories.id] }),
  tags        : many(cmsPostTags),
  revisions   : many(cmsPostRevisions),
}));

export const cmsAuthorsRelations = relations(cmsAuthors, ({ one, many }) => ({
  user : one(users, { fields: [cmsAuthors.user_id], references: [users.id] }),
  posts: many(cmsPosts),
}));

export const cmsBlogCategoriesRelations = relations(cmsBlogCategories, ({ many }) => ({
  posts: many(cmsPosts),
}));

export const cmsStaticPagesRelations = relations(cmsStaticPages, ({ many }) => ({
  faqItems: many(cmsFaqItems),
}));
// ─── Sessions (Auth) ──────────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id         : uuid("id").primaryKey().defaultRandom(),
  userId     : uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token      : text("token").notNull().unique(),
  expiresAt  : timestamp("expires_at").notNull(),
  ipAddress  : varchar("ip_address", { length: 45 }),
  userAgent  : text("user_agent"),
  createdAt  : timestamp("created_at").notNull().defaultNow(),
  updatedAt  : timestamp("updated_at").notNull().defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ─── OTP Codes ────────────────────────────────────────────────────────────────
export const otpCodes = pgTable("otp_codes", {
  id        : uuid("id").primaryKey().defaultRandom(),
  phone     : varchar("phone", { length: 20 }).notNull(),
  code      : varchar("code", { length: 6 }).notNull(),
  expiresAt : timestamp("expires_at").notNull(),
  isUsed    : boolean("is_used").notNull().default(false),
  createdAt : timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  phone_code_idx: index("otp_codes_phone_code_idx").on(t.phone, t.code),
}));
