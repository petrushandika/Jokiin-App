"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { Zap, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyOtp, useResendOtp } from "@/hooks/useAuth";

function OtpFormInner() {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== "") && digit) {
      verifyOtp.mutate({ phone, otp: newOtp.join("") });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      verifyOtp.mutate({ phone, otp: text });
    }
  };

  const handleResend = () => {
    resendOtp.mutate(phone);
    setCountdown(60);
  };

  return (
    <>
      <p className="text-sm text-gray-500 text-center mt-2">
        Kami mengirim kode 6 digit ke{" "}
        <span className="font-semibold text-gray-700">{phone || "nomormu"}</span>
        {" "}via WhatsApp
      </p>
      <div className="flex justify-center gap-3 my-6">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${
              digit ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
            }`}
          />
        ))}
      </div>

      <Button
        onClick={() => verifyOtp.mutate({ phone, otp: otp.join("") })}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
        disabled={verifyOtp.isPending || otp.some((d) => !d)}
      >
        {verifyOtp.isPending ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memverifikasi...</>
        ) : (
          "Verifikasi OTP"
        )}
      </Button>

      <div className="mt-4 text-center">
        {countdown > 0 ? (
          <p className="text-sm text-gray-500">
            Kirim ulang OTP dalam <span className="font-semibold text-indigo-600">{countdown}s</span>
          </p>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resendOtp.isPending}
            className="text-indigo-600 hover:text-indigo-700"
          >
            {resendOtp.isPending ? "Mengirim..." : "Kirim ulang OTP"}
          </Button>
        )}
      </div>
    </>
  );
}

export default function OtpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
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
          <CardHeader className="pb-2 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Verifikasi WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm text-gray-500">Memuat...</p>
              </div>
            }>
              <OtpFormInner />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
