"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, X, Loader2, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/layout/navbar";
import { useOrder, useSubmitOrder } from "@/hooks/useOrders";

const schema = z.object({
  notes: z.string().min(20, "Catatan minimal 20 karakter"),
});

type FormData = z.infer<typeof schema>;

export default function SubmitOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order } = useOrder(id);
  const submitOrder = useSubmitOrder();
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const onSubmit = handleSubmit((data) => {
    if (files.length === 0) return;
    submitOrder.mutate({ orderId: id, notes: data.notes, files });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/orders/${id}`} className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Order
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Kirim Hasil Tugas</h1>
          {order && (
            <p className="text-sm text-gray-500 mt-1">{order.title}</p>
          )}
        </div>

        <form onSubmit={onSubmit}>
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg">Upload Hasil Kerja</CardTitle>
              <p className="text-sm text-gray-500">
                Upload file hasil tugas dan tambahkan catatan untuk customer
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* File upload */}
              <div className="space-y-2">
                <Label>File Hasil Tugas *</Label>
                <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  files.length > 0 ? "border-indigo-300 bg-indigo-50/30" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20"
                }`}>
                  <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Klik atau drag file ke sini</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, ZIP, JPG, PNG (max 50MB)</p>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.zip,.jpg,.jpeg,.png,.xlsx,.xls,.ppt,.pptx"
                  />
                </label>

                {files.length === 0 && (
                  <p className="text-xs text-red-500">Minimal 1 file hasil tugas harus diupload</p>
                )}

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{f.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">
                            ({(f.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="ml-2 shrink-0"
                        >
                          <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Catatan untuk Customer *</Label>
                <Textarea
                  placeholder="Jelaskan apa yang kamu kerjakan, apakah ada hal yang perlu diperhatikan customer, instruksi penggunaan file, dll."
                  rows={5}
                  {...register("notes")}
                  className={errors.notes ? "border-red-300" : ""}
                />
                {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
              </div>

              {/* Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                <p className="font-medium mb-1">⚠️ Perhatian sebelum submit:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Pastikan file sudah sesuai dengan requirement customer</li>
                  <li>• Customer memiliki waktu untuk review dan meminta revisi</li>
                  <li>• Dana escrow akan dilepas setelah customer menyetujui hasil</li>
                  <li>• Jangan cantumkan kontak pribadi di dalam file</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                disabled={submitOrder.isPending || files.length === 0}
              >
                {submitOrder.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</>
                ) : (
                  "Kirim Hasil Tugas"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
