"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, Loader2, Upload, X, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/layout/navbar";
import { useAnalyzeOrder, useCreateOrder } from "@/hooks/useOrders";
import { CATEGORIES, DIFFICULTY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/status";
import type { AiAnalysis, OrderDifficulty } from "@/types";

const schema = z.object({
  title: z.string().min(10, "Judul minimal 10 karakter"),
  description: z.string().min(50, "Deskripsi minimal 50 karakter"),
  categoryId: z.string().min(1, "Pilih kategori"),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  deadline: z.string().min(1, "Pilih deadline"),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Deskripsi Tugas", "Analisis AI", "Konfirmasi & Bayar"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${i <= current ? "text-indigo-600" : "text-gray-400"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              i < current ? "bg-indigo-600 text-white" :
              i === current ? "bg-indigo-100 text-indigo-600 ring-2 ring-indigo-600" :
              "bg-gray-100 text-gray-400"
            }`}>
              {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-sm font-medium hidden sm:block">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 ${i < current ? "bg-indigo-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const MIN_DEADLINE = new Date(Date.now() + 3600000).toISOString().slice(0, 16);

export default function NewOrderPage() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const analyzeOrder = useAnalyzeOrder();
  const createOrder = useCreateOrder();

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { difficulty: "medium" },
  });

  const descriptionValue = useWatch({ control, name: "description" });

  const handleAnalyze = handleSubmit(async (data) => {
    const result = await analyzeOrder.mutateAsync(data);
    setAnalysis(result);
    setStep(1);
  });

  const handleCreateOrder = async () => {
    const data = getValues();
    await createOrder.mutateAsync({ ...data, files });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Buat Order Baru</h1>
        </div>

        <StepIndicator current={step} />

        {/* Step 1: Form */}
        {step === 0 && (
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg">Deskripsikan Tugasmu</CardTitle>
              <p className="text-sm text-gray-500">Semakin detail, semakin tepat AI menganalisis dan mencarikan worker</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Judul Tugas</Label>
                <Input
                  placeholder="Contoh: Laporan Keuangan Akuntansi Biaya Bab 3-5"
                  {...register("title")}
                  className={errors.title ? "border-red-300" : ""}
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Deskripsi Lengkap</Label>
                <Textarea
                  placeholder="Jelaskan detail tugas: apa yang dibutuhkan, referensi yang ada, format output, catatan khusus, dll."
                  rows={5}
                  {...register("description")}
                  className={errors.description ? "border-red-300" : ""}
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                <p className="text-xs text-gray-400">
                  {descriptionValue?.length ?? 0} / 50 karakter minimum
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  <Select onValueChange={(v) => setValue("categoryId", v)}>
                    <SelectTrigger className={errors.categoryId ? "border-red-300" : ""}>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Tingkat Kesulitan</Label>
                  <Select
                    defaultValue="medium"
                    onValueChange={(v) => setValue("difficulty", v as OrderDifficulty)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DIFFICULTY_LABELS) as OrderDifficulty[]).map((d) => (
                        <SelectItem key={d} value={d}>{DIFFICULTY_LABELS[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input
                  type="datetime-local"
                  {...register("deadline")}
                  min={MIN_DEADLINE}
                  className={errors.deadline ? "border-red-300" : ""}
                />
                {errors.deadline && <p className="text-xs text-red-500">{errors.deadline.message}</p>}
              </div>

              {/* File upload */}
              <div className="space-y-1.5">
                <Label>Lampiran (opsional)</Label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500">Klik atau drag file ke sini</span>
                  <span className="text-xs text-gray-400">PDF, DOC, DOCX, JPG, PNG (max 10MB)</span>
                  <input type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                </label>
                {files.length > 0 && (
                  <div className="space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-700 truncate">{f.name}</span>
                        <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                          <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleAnalyze}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                disabled={analyzeOrder.isPending}
              >
                {analyzeOrder.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI sedang menganalisis...</>
                ) : (
                  <>Analisis dengan AI <ArrowRight className="ml-2 w-4 h-4" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: AI Analysis */}
        {step === 1 && analysis && (
          <div className="space-y-4">
            <Card className="shadow-sm border-0 border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <CardTitle className="text-lg">Hasil Analisis AI</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-indigo-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Estimasi Harga</p>
                    <p className="text-xl font-bold text-indigo-600">
                      {formatCurrency(analysis.estimatedPrice)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-violet-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Estimasi Waktu</p>
                    <p className="text-xl font-bold text-violet-600">
                      {analysis.estimatedHours}j
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Badge Worker</p>
                    <Badge className="bg-blue-100 text-blue-700 mt-1">
                      {analysis.recommendedBadge}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Kompleksitas:</p>
                  <p className="text-sm text-gray-600">{analysis.complexity}</p>
                </div>

                {analysis.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Saran AI:</p>
                    <ul className="space-y-1">
                      {analysis.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Harga final mungkin berbeda tergantung worker yang accept. Dana akan ditahan di escrow dan hanya dilepas setelah kamu menyetujui hasil kerja.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" /> Ubah Deskripsi
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              >
                Lanjut ke Pembayaran <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Confirmation */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-lg">Konfirmasi & Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">{getValues("title")}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Kategori:</span>{" "}
                      <span className="font-medium">{CATEGORIES.find((c) => c.id === getValues("categoryId"))?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Kesulitan:</span>{" "}
                      <span className="font-medium">{DIFFICULTY_LABELS[getValues("difficulty")]}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Deadline:</span>{" "}
                      <span className="font-medium">{new Date(getValues("deadline")).toLocaleString("id-ID")}</span>
                    </div>
                    {files.length > 0 && (
                      <div>
                        <span className="text-gray-500">Lampiran:</span>{" "}
                        <span className="font-medium">{files.length} file</span>
                      </div>
                    )}
                  </div>
                </div>

                {analysis && (
                  <div className="border rounded-xl p-4 space-y-2">
                    <h4 className="font-semibold text-gray-700 text-sm">Rincian Harga</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Harga order</span>
                      <span>{formatCurrency(analysis.estimatedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Biaya platform</span>
                      <span>{formatCurrency(analysis.estimatedPrice * 0.05)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-indigo-600">{formatCurrency(analysis.estimatedPrice * 1.05)}</span>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-blue-700 mb-1">🔒 Pembayaran via Escrow Aman</p>
                  <p className="text-xs text-blue-600">
                    Dana kamu akan ditahan di escrow JokiIn. Pembayaran diteruskan ke worker hanya setelah kamu menyetujui hasil kerjanya.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                  </Button>
                  <Button
                    onClick={handleCreateOrder}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
                    ) : (
                      "Bayar & Buat Order"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
