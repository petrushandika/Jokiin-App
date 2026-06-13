import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JokiIn — Platform Bantuan Tugas Terpercaya",
  description:
    "Hubungkan dirimu dengan expert terpercaya untuk menyelesaikan tugas kuliah dan sekolah dengan cepat dan berkualitas.",
  keywords: ["joki tugas", "bantuan tugas", "expert tugas", "jokiin"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
