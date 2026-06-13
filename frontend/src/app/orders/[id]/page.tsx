"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, CheckCircle, Clock, Loader2, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/layout/navbar";
import { useOrder, useApproveOrder, useRequestRevision } from "@/hooks/useOrders";
import { getStatusColor, getStatusLabel, formatCurrency, formatDate, formatRelativeTime } from "@/lib/status";
import { BADGE_COLORS, DIFFICULTY_LABELS } from "@/lib/constants";
import type { OrderStatus } from "@/types";

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending_payment", label: "Pembayaran Diterima" },
  { status: "broadcast", label: "Mencari Worker" },
  { status: "matched", label: "Worker Ditemukan" },
  { status: "in_progress", label: "Sedang Dikerjakan" },
  { status: "submitted", label: "Hasil Dikirim" },
  { status: "completed", label: "Order Selesai" },
];

function StatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const currentStep = TIMELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="space-y-4">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i <= currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isDone ? "bg-indigo-600" : "bg-gray-200"
              }`}>
                {isDone ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 mt-1 ${isDone ? "bg-indigo-200" : "bg-gray-200"}`} />
              )}
            </div>
            <div className="flex-1 pt-1">
              <p className={`text-sm font-medium ${isDone ? "text-gray-900" : "text-gray-400"}`}>
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> Status saat ini
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading } = useOrder(id);
  const approveOrder = useApproveOrder();
  const requestRevision = useRequestRevision();
  const [revisionDialog, setRevisionDialog] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Order tidak ditemukan</p>
          <Button asChild className="mt-4"><Link href="/dashboard">Kembali</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700 font-medium truncate max-w-xs">{order.title}</span>
        </div>

        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
              {order.isEmergency && (
                <Badge className="bg-red-100 text-red-700">🔥 DARURAT</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {order.category.name} • {DIFFICULTY_LABELS[order.difficulty]} •{" "}
              Dibuat {formatRelativeTime(order.createdAt)}
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} text-sm px-3 py-1 shrink-0`}>
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Order info */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detail Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Deskripsi</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {order.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Deadline</p>
                    <p className="font-medium text-gray-900">{formatDate(order.deadline)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Revisi</p>
                    <p className="font-medium text-gray-900">
                      {order.revisionUsed}/{order.revisionQuota} digunakan
                    </p>
                  </div>
                </div>
                {order.files && order.files.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Lampiran</p>
                    <div className="space-y-1">
                      {order.files.map((f) => (
                        <a
                          key={f.id}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                        >
                          <FileText className="w-4 h-4" />
                          {f.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Escrow info */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-violet-50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    🔒
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Escrow Pembayaran</p>
                    <p className="text-xs text-gray-500">Dana aman terlindungi</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Harga order</span>
                    <span className="font-medium">{formatCurrency(order.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Biaya platform</span>
                    <span className="font-medium">{formatCurrency(order.platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-700 font-semibold border-t pt-2">
                    <span>Total dibayar</span>
                    <span>{formatCurrency(order.price + order.platformFee)}</span>
                  </div>
                  {order.isEmergency && order.surgeMultiplier > 1 && (
                    <div className="flex items-center gap-2 bg-red-50 rounded-lg p-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">Surge pricing {order.surgeMultiplier}× aktif (deadline &lt; 3 jam)</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            {order.status === "submitted" && (
              <div className="flex gap-3">
                <Button
                  onClick={() => approveOrder.mutate(order.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={approveOrder.isPending}
                >
                  {approveOrder.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyetujui...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" />Setujui Hasil</>
                  )}
                </Button>
                <Button
                  onClick={() => setRevisionDialog(true)}
                  variant="outline"
                  className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                  disabled={order.revisionUsed >= order.revisionQuota}
                >
                  Minta Revisi{order.revisionUsed >= order.revisionQuota && " (Habis)"}
                </Button>
              </div>
            )}

            <Button asChild variant="outline" className="w-full">
              <Link href={`/orders/${order.id}/chat`}>
                <MessageSquare className="w-4 h-4 mr-2" /> Buka Chat dengan Worker
              </Link>
            </Button>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Status Timeline */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline currentStatus={order.status} />
              </CardContent>
            </Card>

            {/* Worker card */}
            {order.worker && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Worker</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={order.worker.user.avatarUrl} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700">
                        {order.worker.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{order.worker.user.name}</p>
                      <Badge className={`${BADGE_COLORS[order.worker.badge]} text-xs mt-0.5`}>
                        {order.worker.badge}
                      </Badge>
                    </div>
                  </div>
                  {order.worker.bio && (
                    <p className="text-xs text-gray-500 mt-3 leading-relaxed">{order.worker.bio}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Reputasi</span>
                    <span className="font-semibold text-gray-700">
                      {order.worker.reputationScore.toFixed(1)} / 5.0
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Revision Dialog */}
      <Dialog open={revisionDialog} onOpenChange={setRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minta Revisi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Sisa kuota revisi: {order.revisionQuota - order.revisionUsed} kali
            </p>
            <Textarea
              placeholder="Jelaskan apa yang perlu diperbaiki..."
              rows={4}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialog(false)}>Batal</Button>
            <Button
              onClick={() => {
                requestRevision.mutate({ orderId: order.id, reason: revisionReason });
                setRevisionDialog(false);
              }}
              disabled={!revisionReason.trim() || requestRevision.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Kirim Permintaan Revisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
