"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Timer, CheckCircle, X, Loader2, Zap, Power, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { useWorkerDashboard, useToggleAvailability } from "@/hooks/useWorker";
import { useAcceptBroadcast, useDeclineBroadcast } from "@/hooks/useOrders";
import { getStatusColor, getStatusLabel, formatCurrency, formatDate, formatRelativeTime } from "@/lib/status";
import { BADGE_COLORS, BROADCAST_TIMER_SECONDS } from "@/lib/constants";
import type { OrderBroadcast } from "@/types";

function BroadcastTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const pct = (remaining / BROADCAST_TIMER_SECONDS) * 100;
  const isUrgent = remaining <= 60;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${isUrgent ? "bg-red-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isUrgent ? "text-red-600" : "text-indigo-600"}`}>
        <Timer className="w-4 h-4" />
        {Math.floor(remaining / 60).toString().padStart(2, "0")}:
        {(remaining % 60).toString().padStart(2, "0")}
      </div>
    </div>
  );
}

function BroadcastCard({ broadcast }: { broadcast: OrderBroadcast }) {
  const accept = useAcceptBroadcast();
  const decline = useDeclineBroadcast();
  const { order } = broadcast;

  return (
    <Card className={`border-2 shadow-lg animate-pulse-once ${order.isEmergency ? "border-red-300 bg-red-50" : "border-indigo-300 bg-indigo-50"}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📢</span>
              <span className="font-semibold text-gray-900">Order Masuk!</span>
              {order.isEmergency && (
                <Badge className="bg-red-100 text-red-700 text-xs">🔥 DARURAT</Badge>
              )}
            </div>
            <h3 className="font-medium text-gray-800">{order.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-indigo-600">{formatCurrency(order.workerEarning)}</p>
            <p className="text-xs text-gray-500">Penghasilanmu</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Kategori:</span>{" "}
            <span className="font-medium">{order.category.name}</span>
          </div>
          <div>
            <span className="text-gray-500">Kesulitan:</span>{" "}
            <span className="font-medium capitalize">{order.difficulty}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Deadline:</span>{" "}
            <span className="font-medium">{formatDate(order.deadline)}</span>
          </div>
        </div>

        <BroadcastTimer expiresAt={broadcast.expiresAt} />

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => accept.mutate(broadcast.id)}
            disabled={accept.isPending}
          >
            {accept.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menerima...</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" />Terima</>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => decline.mutate(broadcast.id)}
            disabled={decline.isPending}
          >
            <X className="w-4 h-4 mr-2" />Tolak
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkerDashboardPage() {
  const { data, isLoading } = useWorkerDashboard();
  const toggleAvailability = useToggleAvailability();

  const isOnline = data?.profile.isAvailable ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Pantau order dan broadcast masuk</p>
            </div>
            <div className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-sm font-medium text-gray-700">
                {isOnline ? "Online" : "Offline"}
              </span>
              <Switch
                checked={isOnline}
                onCheckedChange={(v) => toggleAvailability.mutate(v)}
                disabled={toggleAvailability.isPending}
              />
            </div>
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Order Aktif</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {data?.activeOrders.length ?? 0}
                    <span className="text-sm text-gray-400 font-normal">/{data?.profile.maxActive}</span>
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Selesai</p>
                  <p className="text-2xl font-bold text-green-600">{data?.totalCompleted ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Rating</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    ⭐ {data?.averageRating.toFixed(1) ?? "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Broadcast notifications */}
          {(data?.pendingBroadcasts ?? []).length > 0 && (
            <div className="mb-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                Order Broadcast ({data!.pendingBroadcasts.length})
              </h2>
              {data!.pendingBroadcasts.map((b) => (
                <BroadcastCard key={b.id} broadcast={b} />
              ))}
            </div>
          )}

          {!isOnline && (
            <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
              <Power className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Kamu sedang offline</p>
                <p className="text-xs mt-0.5">Aktifkan status online untuk mulai menerima broadcast order</p>
              </div>
            </div>
          )}

          {/* Active Orders */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Order Aktif</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (data?.activeOrders ?? []).length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500 text-sm">Belum ada order aktif</p>
                  {!isOnline && (
                    <p className="text-xs text-amber-600 mt-2">Aktifkan status online untuk menerima order</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {data!.activeOrders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <Card className="border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{order.title}</h3>
                              {order.isEmergency && (
                                <Badge className="bg-red-100 text-red-700 text-xs shrink-0">🔥</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {order.category.name} • Deadline {formatDate(order.deadline)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge className={`${getStatusColor(order.status)} text-xs`}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            <p className="text-sm font-semibold text-indigo-600 mt-1">
                              {formatCurrency(order.workerEarning)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/orders/${order.id}/chat`}>💬 Chat</Link>
                          </Button>
                          {order.status === "in_progress" && (
                            <Button
                              size="sm"
                              className="text-xs bg-indigo-600 hover:bg-indigo-700"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link href={`/orders/${order.id}/submit`}>📤 Submit Hasil</Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
