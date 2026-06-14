"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PaginatedData, Wallet, WalletTransaction, WithdrawPayload } from "@/types";

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<Wallet>("/wallets"),
  });
}

export function useTransactions(page = 1) {
  return useQuery({
    queryKey: ["transactions", page],
    queryFn: () =>
      api.get<PaginatedData<WalletTransaction>>(
        `/wallets/transactions?page=${page}&limit=20`
      ),
  });
}

export function useRequestWithdrawOtp() {
  return useMutation({
    mutationFn: () =>
      api.post<{ message: string }>("/wallets/withdraw/otp", {}),
    onSuccess: () => {
      toast.success("OTP dikirim ke WhatsApp kamu.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengirim OTP.");
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WithdrawPayload) =>
      api.post<{ message: string }>("/wallets/withdraw", payload),
    onSuccess: () => {
      toast.success("Permintaan penarikan berhasil dikirim!");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal melakukan penarikan.");
    },
  });
}
