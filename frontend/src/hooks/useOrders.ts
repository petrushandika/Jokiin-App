"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  AiAnalysis,
  CreateOrderPayload,
  Order,
  PaginatedData,
  SubmitOrderPayload,
} from "@/types";

export function useOrders(status?: string) {
  const params = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["orders", status],
    queryFn: () => api.get<PaginatedData<Order>>(`/orders${params}`),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.get<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useAnalyzeOrder() {
  return useMutation({
    mutationFn: (payload: Omit<CreateOrderPayload, "files">) =>
      api.post<AiAnalysis>("/orders/analyze", payload),
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menganalisis tugas.");
    },
  });
}

export function useCreateOrder() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => {
      const form = new FormData();
      form.append("title", payload.title);
      form.append("description", payload.description);
      form.append("categoryId", payload.categoryId);
      form.append("difficulty", payload.difficulty);
      form.append("deadline", payload.deadline);
      if (payload.files) {
        payload.files.forEach((f) => form.append("files", f));
      }
      return api.post<Order>("/orders", form);
    },
    onSuccess: (data) => {
      toast.success("Order berhasil dibuat!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/orders/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal membuat order.");
    },
  });
}

export function useApproveOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) =>
      api.post<Order>(`/orders/${orderId}/approve`, {}),
    onSuccess: (_, orderId) => {
      toast.success("Order telah disetujui dan selesai!");
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menyetujui order.");
    },
  });
}

export function useRequestRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason: string;
    }) => api.post<Order>(`/orders/${orderId}/revision`, { reason }),
    onSuccess: (_, { orderId }) => {
      toast.success("Permintaan revisi dikirim.");
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal meminta revisi.");
    },
  });
}

export function useSubmitOrder() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: SubmitOrderPayload) => {
      const form = new FormData();
      form.append("notes", payload.notes);
      payload.files.forEach((f) => form.append("files", f));
      return api.post<Order>(`/orders/${payload.orderId}/submit`, form);
    },
    onSuccess: (data) => {
      toast.success("Hasil tugas berhasil dikirim!");
      queryClient.invalidateQueries({ queryKey: ["orders", data.id] });
      router.push(`/orders/${data.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengirim hasil.");
    },
  });
}

export function useAcceptBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (broadcastId: string) =>
      api.post<Order>(`/broadcasts/${broadcastId}/accept`, {}),
    onSuccess: () => {
      toast.success("Berhasil menerima order!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["worker-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menerima order. Mungkin sudah diambil.");
    },
  });
}

export function useDeclineBroadcast() {
  return useMutation({
    mutationFn: (broadcastId: string) =>
      api.post<{ message: string }>(`/broadcasts/${broadcastId}/decline`, {}),
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal menolak order.");
    },
  });
}
