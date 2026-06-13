import Link from "next/link";
import {
  BookOpen,
  Zap,
  Shield,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  Users,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";

const testimonials = [
  {
    name: "Rizky A.",
    role: "Mahasiswa Teknik",
    text: "Tugas pemrograman saya diselesaikan dengan sangat baik dan tepat waktu. Workernya profesional dan responsif!",
    rating: 5,
  },
  {
    name: "Putri S.",
    role: "Mahasiswa Ekonomi",
    text: "Laporan akuntansi saya yang deadline 6 jam berhasil diselesaikan dengan sempurna. Luar biasa!",
    rating: 5,
  },
  {
    name: "Bima W.",
    role: "Siswa SMA",
    text: "Tugas fisika bab mekanika bantu banget. Penjelasannya jelas dan hasilnya memuaskan.",
    rating: 5,
  },
];

const features = [
  {
    icon: Shield,
    title: "Sistem Escrow Aman",
    desc: "Dana kamu terlindungi. Pembayaran hanya diteruskan ke worker setelah kamu puas dengan hasilnya.",
  },
  {
    icon: Zap,
    title: "Matchmaking Real-Time",
    desc: "AI kami langsung mencarikan worker terbaik sesuai kebutuhan tugasmu dalam hitungan menit.",
  },
  {
    icon: BookOpen,
    title: "Worker Terverifikasi",
    desc: "Semua worker sudah melalui proses verifikasi keahlian dan identitas kami yang ketat.",
  },
  {
    icon: Clock,
    title: "Deadline Terjamin",
    desc: "Sistem kami memastikan worker hanya menerima order yang bisa diselesaikan sebelum deadline.",
  },
  {
    icon: Award,
    title: "Sistem Badge",
    desc: "Worker terbaik mendapatkan badge APEX dengan track record terbukti dan komisi lebih kecil.",
  },
  {
    icon: Users,
    title: "Revisi Terjamin",
    desc: "Setiap order dilengkapi kuota revisi gratis. Tidak puas? Minta revisi tanpa biaya tambahan.",
  },
];

const steps = [
  {
    number: "01",
    title: "Describe Your Task",
    desc: "Ceritakan tugas yang butuh bantuan — mata pelajaran, deadline, tingkat kesulitan, dan file pendukung.",
  },
  {
    number: "02",
    title: "AI Analisis & Matchmaking",
    desc: "AI kami menganalisis tugasmu dan langsung broadcast ke worker ahli yang paling cocok.",
  },
  {
    number: "03",
    title: "Worker Mengerjakan",
    desc: "Worker terpilih mengerjakan tugasmu. Pantau progress via chat real-time dan timeline order.",
  },
  {
    number: "04",
    title: "Review & Approve",
    desc: "Cek hasil kerja worker. Approve jika puas, atau minta revisi gratis jika ada yang perlu diperbaiki.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-20 md:py-32">
        <div className="absolute inset-0 bg-grid-indigo-100/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0 text-sm px-4 py-1.5">
            🚀 Platform Bantuan Tugas #1 Indonesia
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Selesaikan Tugasmu{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Bersama Expert
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Hubungkan dirimu dengan ribuan expert terverifikasi untuk
            menyelesaikan tugas kuliah dan sekolah dengan cepat, berkualitas,
            dan aman.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-8 py-6 text-base rounded-xl shadow-lg shadow-indigo-200"
              asChild
            >
              <Link href="/auth/register">
                Buat Order Sekarang <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-8 py-6 text-base rounded-xl"
              asChild
            >
              <Link href="/auth/register?role=worker">Jadi Worker Expert</Link>
            </Button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              10.000+ order selesai
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              2.000+ worker aktif
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Rating 4.9/5
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja */}
      <section id="cara-kerja" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Cara Kerja JokiIn
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Hanya 4 langkah mudah dari upload tugas sampai hasil sempurna
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-indigo-200 to-violet-200 z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-indigo-600">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Mengapa Memilih JokiIn?
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Kami hadir dengan fitur-fitur unggulan yang memastikan pengalaman
              terbaik untukmu
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card
                key={i}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Kata Mereka
            </h2>
            <p className="text-gray-600 text-lg">
              Ribuan pengguna sudah merasakan manfaatnya
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="border border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap Menyelesaikan Tugasmu?
          </h2>
          <p className="text-indigo-100 text-lg mb-8">
            Daftar gratis sekarang dan dapatkan bantuan tugas berkualitas dari
            expert terverifikasi
          </p>
          <Button
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50 px-10 py-6 text-base rounded-xl font-semibold"
            asChild
          >
            <Link href="/auth/register">
              Mulai Sekarang — Gratis! <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">JokiIn</span>
            </div>
            <p className="text-sm">
              &copy; {new Date().getFullYear()} JokiIn. Platform Bantuan Tugas
              Terpercaya Indonesia.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privasi
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Syarat
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Kontak
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
