import type { BadgeLevel, OrderDifficulty, OrderStatus } from "@/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "pending_payment",
  "broadcast",
  "matched",
  "in_progress",
  "submitted",
  "revision",
  "completed",
  "cancelled",
];

export const BADGE_HIERARCHY: BadgeLevel[] = [
  "SPROUT",
  "SPARK",
  "BLAZE",
  "PRIME",
  "APEX",
];

export const BADGE_COMMISSION: Record<BadgeLevel, number> = {
  SPROUT: 15,
  SPARK: 13,
  BLAZE: 12,
  PRIME: 10,
  APEX: 8,
};

export const BADGE_COLORS: Record<BadgeLevel, string> = {
  SPROUT: "bg-green-100 text-green-800",
  SPARK: "bg-blue-100 text-blue-800",
  BLAZE: "bg-orange-100 text-orange-800",
  PRIME: "bg-purple-100 text-purple-800",
  APEX: "bg-yellow-100 text-yellow-800",
};

export const DIFFICULTY_LABELS: Record<OrderDifficulty, string> = {
  easy: "Mudah",
  medium: "Sedang",
  hard: "Sulit",
  expert: "Expert",
};

export const DIFFICULTY_COLORS: Record<OrderDifficulty, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-orange-100 text-orange-800",
  expert: "bg-red-100 text-red-800",
};

export const CATEGORIES = [
  { id: "1", name: "Matematika", slug: "matematika" },
  { id: "2", name: "Fisika", slug: "fisika" },
  { id: "3", name: "Kimia", slug: "kimia" },
  { id: "4", name: "Pemrograman", slug: "pemrograman" },
  { id: "5", name: "Desain", slug: "desain" },
  { id: "6", name: "Bahasa Inggris", slug: "bahasa-inggris" },
  { id: "7", name: "Ekonomi", slug: "ekonomi" },
  { id: "8", name: "Akuntansi", slug: "akuntansi" },
  { id: "9", name: "Statistik", slug: "statistik" },
  { id: "10", name: "Biologi", slug: "biologi" },
];

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export const BROADCAST_TIMER_SECONDS = 300; // 5 minutes
export const EMERGENCY_DEADLINE_HOURS = 3;
export const PENDING_BALANCE_HOURS = 48;
export const PAID_REVISION_PERCENTAGE = 25;
