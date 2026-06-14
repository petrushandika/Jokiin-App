"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthResponse, LoginPayload, OtpPayload, RegisterPayload } from "@/types";

export function useLogin() {
  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      api.post<AuthResponse>("/auth/login", payload),
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      toast.success("Berhasil masuk!");
      if (data.user.role === "worker") {
        router.push("/worker/dashboard");
      } else {
        router.push("/dashboard");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal masuk. Coba lagi.");
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterPayload) =>
      api.post<{ phone: string }>("/auth/register", payload),
    onSuccess: (data) => {
      toast.success("Akun berhasil dibuat! Verifikasi nomor HP kamu.");
      router.push(`/auth/otp?phone=${encodeURIComponent(data.phone)}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mendaftar. Coba lagi.");
    },
  });
}

export function useVerifyOtp() {
  const { setUser, setToken } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: OtpPayload) =>
      api.post<AuthResponse>("/auth/otp/verify", payload),
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      toast.success("Nomor HP terverifikasi!");
      if (data.user.role === "worker") {
        router.push("/worker/dashboard");
      } else {
        router.push("/dashboard");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Kode OTP salah. Coba lagi.");
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      api.post<{ message: string }>("/auth/otp/resend", { phone }),
    onSuccess: () => {
      toast.success("OTP baru telah dikirim ke WhatsApp kamu.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Gagal mengirim OTP.");
    },
  });
}
