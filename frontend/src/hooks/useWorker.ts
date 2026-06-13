"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Order, OrderBroadcast, WorkerProfile } from "@/types";

interface WorkerDashboard {
  activeOrders: Order[];
  pendingBroadcasts: OrderBroadcast[];
  totalCompleted: number;
  averageRating: number;
  profile: WorkerProfile;
}

export function useWorkerDashboard() {
  return useQuery({
    queryKey: ["worker-dashboard"],
    queryFn: () => api.get<WorkerDashboard>("/worker/dashboard"),
    refetchInterval: 30_000,
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isAvailable: boolean) =>
      api.patch<WorkerProfile>("/worker/profile/availability", {
        isAvailable,
      }),
    onSuccess: (data) => {
      toast.success(
        data.isAvailable ? "Kamu sekarang online" : "Kamu sekarang offline"
      );
      queryClient.invalidateQueries({ queryKey: ["worker-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengubah status.");
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FormData | Record<string, unknown>) => {
      const body =
        payload instanceof FormData ? payload : payload;
      return api.patch<WorkerProfile>("/worker/profile", body);
    },
    onSuccess: () => {
      toast.success("Profil berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["worker-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal memperbarui profil.");
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<WorkerProfile>("/worker/profile"),
  });
}
