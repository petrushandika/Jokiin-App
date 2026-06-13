"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuthStore } from "@/store/auth";
import { useProfile, useToggleAvailability, useUpdateProfile } from "@/hooks/useWorker";
import { api } from "@/lib/api";
import { BADGE_COLORS, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
});

const workerSchema = z.object({
  bio: z.string().max(500, "Bio maksimal 500 karakter").optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type WorkerFormData = z.infer<typeof workerSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { data: workerProfile, isLoading: workerLoading } = useProfile();
  const toggleAvailability = useToggleAvailability();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  const workerForm = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      bio: workerProfile?.bio ?? "",
      bankName: workerProfile?.bankAccount?.bankName ?? "",
      accountNumber: workerProfile?.bankAccount?.accountNumber ?? "",
      accountName: workerProfile?.bankAccount?.accountName ?? "",
    },
  });

  useEffect(() => {
    if (workerProfile) {
      workerForm.reset({
        bio: workerProfile.bio ?? "",
        bankName: workerProfile.bankAccount?.bankName ?? "",
        accountNumber: workerProfile.bankAccount?.accountNumber ?? "",
        accountName: workerProfile.bankAccount?.accountName ?? "",
      });
      setSelectedCategories(workerProfile.categories.map((c) => c.id));
    }
  }, [workerProfile, workerForm]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    const form = new FormData();
    form.append("avatar", file);
    try {
      await api.post("/profile/avatar", form);
      toast.success("Avatar berhasil diperbarui");
    } catch (err) {
      toast.error("Gagal mengupload avatar");
    }
  };

  const handleProfileSave = profileForm.handleSubmit(async (data) => {
    setSavingProfile(true);
    try {
      await api.patch("/profile", data);
      if (user) setUser({ ...user, ...data });
      toast.success("Profil berhasil diperbarui");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message ?? "Gagal memperbarui profil");
    } finally {
      setSavingProfile(false);
    }
  });

  const handleWorkerSave = workerForm.handleSubmit((data) => {
    updateProfile.mutate({ ...data, categoryIds: selectedCategories });
  });

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola informasi akun kamu</p>
          </div>

          {/* Avatar & basic info */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarPreview ?? user?.avatarUrl} />
                    <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Form */}
                <form onSubmit={handleProfileSave} className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nama Lengkap</Label>
                      <Input
                        {...profileForm.register("name")}
                        className={profileForm.formState.errors.name ? "border-red-300" : ""}
                      />
                      {profileForm.formState.errors.name && (
                        <p className="text-xs text-red-500">{profileForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        {...profileForm.register("email")}
                        className={profileForm.formState.errors.email ? "border-red-300" : ""}
                      />
                    </div>
                  </div>

                  {user && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">Role:</span>
                      <Badge className="bg-indigo-100 text-indigo-700 capitalize">
                        {user.role}
                      </Badge>
                      {user.role === "worker" && workerProfile && (
                        <Badge className={BADGE_COLORS[workerProfile.badge]}>
                          {workerProfile.badge}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
                    ) : (
                      "Simpan Perubahan"
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Worker-specific section */}
          {user?.role === "worker" && (
            <>
              {/* Availability */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Status Ketersediaan</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {workerProfile?.isAvailable
                          ? "Kamu sedang online dan dapat menerima order"
                          : "Kamu sedang offline, tidak akan menerima broadcast"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${workerProfile?.isAvailable ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                      <Switch
                        checked={workerProfile?.isAvailable ?? false}
                        onCheckedChange={(v) => toggleAvailability.mutate(v)}
                        disabled={toggleAvailability.isPending}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bio & Bank */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Profil Worker</CardTitle>
                </CardHeader>
                <CardContent>
                  {workerLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <form onSubmit={handleWorkerSave} className="space-y-5">
                      <div className="space-y-1.5">
                        <Label>Bio Singkat</Label>
                        <Textarea
                          placeholder="Ceritakan keahlian dan pengalamanmu kepada calon customer..."
                          rows={4}
                          {...workerForm.register("bio")}
                        />
                        <p className="text-xs text-gray-400">
                          {workerForm.watch("bio")?.length ?? 0}/500 karakter
                        </p>
                      </div>

                      {/* Categories */}
                      <div className="space-y-2">
                        <Label>Kategori Keahlian</Label>
                        <div className="flex flex-wrap gap-2">
                          {CATEGORIES.map((c) => {
                            const selected = selectedCategories.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleCategory(c.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                  selected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {selected && <span className="mr-1">✓</span>}
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bank Account */}
                      <div className="space-y-3">
                        <Label>Rekening Bank (untuk penarikan)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Nama Bank</Label>
                            <Input placeholder="BCA / BRI / Mandiri" {...workerForm.register("bankName")} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">Nomor Rekening</Label>
                            <Input placeholder="1234567890" {...workerForm.register("accountNumber")} />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs text-gray-500">Nama Pemilik Rekening</Label>
                            <Input placeholder="Sesuai buku tabungan" {...workerForm.register("accountName")} />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
                        ) : (
                          "Simpan Profil Worker"
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
