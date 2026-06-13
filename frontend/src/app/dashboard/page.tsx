"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { useOrders } from "@/hooks/useOrders";
import { getStatusColor, getStatusLabel, formatCurrency, formatDate } from "@/lib/status";
import { DIFFICULTY_LABELS, ORDER_STATUSES } from "@/lib/constants";
import type { OrderStatus } from "@/types";

function OrderCardSkeleton() {
  return (
    <Card className="border border-gray-100">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="mt-4 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_LABEL_MAP: Record<string, string> = {
  all: "Semua Status",
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

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useOrders(
    statusFilter !== "all" ? statusFilter : undefined
  );

  const orders = data?.items ?? [];
  const filtered = orders.filter((o) =>
    o.title.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Order Aktif", value: orders.filter((o) => ["broadcast", "matched", "in_progress", "submitted"].includes(o.status)).length, color: "text-indigo-600" },
    { label: "Selesai", value: orders.filter((o) => o.status === "completed").length, color: "text-green-600" },
    { label: "Total Dibelanjakan", value: formatCurrency(orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.price, 0)), color: "text-violet-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Kelola semua order tugas kamu</p>
            </div>
            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700" asChild>
              <Link href="/orders/new">
                <Plus className="w-4 h-4 mr-2" /> Buat Order
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map((s, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari order..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-52">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL_MAP).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orders list */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-16 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="font-medium text-gray-700">Belum ada order</p>
                  <p className="text-sm text-gray-500 mt-1 mb-4">
                    Mulai dengan membuat order pertamamu
                  </p>
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/orders/new">Buat Order Pertama</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filtered.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {order.title}
                            </h3>
                            {order.isEmergency && (
                              <Badge className="bg-red-100 text-red-700 text-xs shrink-0">
                                🔥 DARURAT
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {order.category.name} •{" "}
                            {DIFFICULTY_LABELS[order.difficulty]}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} shrink-0`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span>Deadline: {formatDate(order.deadline)}</span>
                        <span className="font-semibold text-indigo-600">
                          {formatCurrency(order.price)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
