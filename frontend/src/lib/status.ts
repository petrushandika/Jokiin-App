import type { OrderStatus, TransactionType } from "@/types";

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: "Draft",
    pending_payment: "Menunggu Pembayaran",
    broadcast: "Mencari Worker",
    matched: "Worker Ditemukan",
    in_progress: "Sedang Dikerjakan",
    submitted: "Menunggu Persetujuan",
    revision: "Revisi",
    completed: "Selesai",
    cancelled: "Dibatalkan",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_payment: "bg-yellow-100 text-yellow-700",
    broadcast: "bg-blue-100 text-blue-700",
    matched: "bg-indigo-100 text-indigo-700",
    in_progress: "bg-violet-100 text-violet-700",
    submitted: "bg-orange-100 text-orange-700",
    revision: "bg-pink-100 text-pink-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}

export function getStatusStep(status: OrderStatus): number {
  const steps: Record<OrderStatus, number> = {
    draft: 0,
    pending_payment: 1,
    broadcast: 2,
    matched: 3,
    in_progress: 4,
    submitted: 5,
    revision: 4,
    completed: 6,
    cancelled: -1,
  };
  return steps[status] ?? 0;
}

export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    deposit: "Top Up",
    withdrawal: "Penarikan",
    order_payment: "Pembayaran Order",
    order_earning: "Penghasilan Order",
    refund: "Refund",
    commission: "Komisi Platform",
  };
  return labels[type] ?? type;
}

export function getTransactionTypeColor(type: TransactionType): string {
  const colors: Record<TransactionType, string> = {
    deposit: "bg-green-100 text-green-700",
    withdrawal: "bg-red-100 text-red-700",
    order_payment: "bg-orange-100 text-orange-700",
    order_earning: "bg-blue-100 text-blue-700",
    refund: "bg-yellow-100 text-yellow-700",
    commission: "bg-gray-100 text-gray-700",
  };
  return colors[type] ?? "bg-gray-100 text-gray-700";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} hari lalu`;
  if (hours > 0) return `${hours} jam lalu`;
  if (minutes > 0) return `${minutes} menit lalu`;
  return "Baru saja";
}
