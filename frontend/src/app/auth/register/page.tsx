"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRegister } from "@/hooks/useAuth";
import { Suspense } from "react";

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor HP tidak valid")
    .regex(/^(\+62|08)\d{8,12}$/, "Format nomor HP tidak valid (08xx atau +62xx)"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung huruf besar")
    .regex(/[0-9]/, "Password harus mengandung angka"),
  role: z.enum(["customer", "worker"]),
});

type FormData = z.infer<typeof schema>;

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "worker" ? "worker" : "customer";
  const register2 = useRegister();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const role = useWatch({ control, name: "role" });

  return (
    <form onSubmit={handleSubmit((data) => register2.mutate(data))} className="space-y-4">
      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3">
        <label
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            role === "customer"
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-200 hover:border-indigo-200"
          }`}
        >
          <input type="radio" value="customer" {...register("role")} className="sr-only" />
          <span className="text-2xl">🎓</span>
          <div className="text-center">
            <p className="font-medium text-sm text-gray-900">Customer</p>
            <p className="text-xs text-gray-500">Butuh bantuan tugas</p>
          </div>
        </label>
        <label
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            role === "worker"
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-200 hover:border-indigo-200"
          }`}
        >
          <input type="radio" value="worker" {...register("role")} className="sr-only" />
          <span className="text-2xl">💼</span>
          <div className="text-center">
            <p className="font-medium text-sm text-gray-900">Worker</p>
            <p className="text-xs text-gray-500">Bantu & cari penghasilan</p>
          </div>
        </label>
      </div>

      <div className="space-y-1.5">
        <Label>Nama Lengkap</Label>
        <Input placeholder="John Doe" {...register("name")} className={errors.name ? "border-red-300" : ""} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" placeholder="nama@email.com" {...register("email")} className={errors.email ? "border-red-300" : ""} />
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Nomor HP (WhatsApp)</Label>
        <Input placeholder="08123456789" {...register("phone")} className={errors.phone ? "border-red-300" : ""} />
        {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        <p className="text-xs text-gray-400">OTP verifikasi akan dikirim via WhatsApp</p>
      </div>

      <div className="space-y-1.5">
        <Label>Password</Label>
        <Input type="password" placeholder="Min. 8 karakter, huruf besar & angka" {...register("password")} className={errors.password ? "border-red-300" : ""} />
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
        disabled={register2.isPending}
      >
        {register2.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mendaftar...</>
        ) : (
          "Daftar Sekarang"
        )}
      </Button>

      <p className="text-xs text-center text-gray-400">
        Dengan mendaftar, kamu menyetujui{" "}
        <Link href="/terms" className="text-indigo-600 hover:underline">Syarat & Ketentuan</Link>{" "}
        dan{" "}
        <Link href="/privacy" className="text-indigo-600 hover:underline">Kebijakan Privasi</Link> kami.
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              JokiIn
            </span>
          </Link>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Buat Akun Baru</CardTitle>
            <p className="text-sm text-gray-500">
              Sudah punya akun?{" "}
              <Link href="/auth/login" className="text-indigo-600 font-medium hover:underline">
                Masuk
              </Link>
            </p>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>}>
              <RegisterForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
