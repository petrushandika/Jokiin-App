"use client";

import { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { useWallet, useTransactions, useRequestWithdrawOtp, useWithdraw } from "@/hooks/useWallet";
import { formatCurrency, formatDate, getTransactionTypeLabel, getTransactionTypeColor } from "@/lib/status";
import { PENDING_BALANCE_HOURS } from "@/lib/constants";

type WithdrawStep = "form" | "otp";

export default function WalletPage() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const requestOtp = useRequestWithdrawOtp();
  const withdraw = useWithdraw();

  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>("form");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [otp, setOtp] = useState("");

  const handleRequestOtp = () => {
    requestOtp.mutate(undefined, {
      onSuccess: () => setWithdrawStep("otp"),
    });
  };

  const handleWithdraw = () => {
    withdraw.mutate(
      {
        amount: Number(amount),
        bankAccountId: `${bankName}|${accountNumber}|${accountName}`,
        otp,
      },
      {
        onSuccess: () => {
          setWithdrawDialog(false);
          setWithdrawStep("form");
          setAmount("");
          setOtp("");
        },
      }
    );
  };

  const resetDialog = () => {
    setWithdrawDialog(false);
    setWithdrawStep("form");
    setAmount("");
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
              <p className="text-sm text-gray-500 mt-0.5">Kelola saldo dan riwayat transaksi</p>
            </div>
            <Button
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              onClick={() => setWithdrawDialog(true)}
              disabled={!wallet || wallet.availableBalance <= 0}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" /> Tarik Dana
            </Button>
          </div>

          {/* Balance cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {walletLoading ? (
              <>
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </>
            ) : (
              <>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">Saldo Tersedia</span>
                    </div>
                    <p className="text-3xl font-bold">
                      {formatCurrency(wallet?.availableBalance ?? 0)}
                    </p>
                    <p className="text-xs mt-2 opacity-70">Bisa ditarik kapan saja</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Saldo Tertahan</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-700">
                      {formatCurrency(wallet?.pendingBalance ?? 0)}
                    </p>
                    <p className="text-xs mt-2 text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Akan cair dalam {PENDING_BALANCE_HOURS} jam setelah order disetujui
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Transaction history */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Riwayat Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              {txLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : (transactions?.items ?? []).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-3">💸</p>
                  <p className="text-gray-500 text-sm">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(transactions?.items ?? []).map((tx) => {
                    const isIn = ["deposit", "order_earning", "refund"].includes(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            isIn ? "bg-green-100" : "bg-red-100"
                          }`}>
                            {isIn ? (
                              <ArrowDownLeft className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`${getTransactionTypeColor(tx.type)} text-xs`}>
                                {getTransactionTypeLabel(tx.type)}
                              </Badge>
                              <span className="text-xs text-gray-400">{formatDate(tx.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isIn ? "text-green-600" : "text-red-600"}`}>
                            {isIn ? "+" : "-"}{formatCurrency(tx.amount)}
                          </p>
                          <Badge className={`text-xs ${
                            tx.status === "completed" ? "bg-green-100 text-green-700" :
                            tx.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {tx.status === "completed" ? "Selesai" : tx.status === "pending" ? "Pending" : "Gagal"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={resetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tarik Dana</DialogTitle>
          </DialogHeader>

          {withdrawStep === "form" ? (
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-3 text-sm">
                <p className="text-gray-600">Saldo tersedia:</p>
                <p className="text-xl font-bold text-indigo-600">
                  {formatCurrency(wallet?.availableBalance ?? 0)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Jumlah Penarikan (Rp)</Label>
                <Input
                  type="number"
                  placeholder="Minimal Rp 50.000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={50000}
                  max={wallet?.availableBalance}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nama Bank</Label>
                <Input
                  placeholder="Contoh: BCA, BRI, Mandiri"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nomor Rekening</Label>
                <Input
                  placeholder="Nomor rekening tujuan"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nama Pemilik Rekening</Label>
                <Input
                  placeholder="Sesuai buku tabungan"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                Penarikan membutuhkan verifikasi OTP via WhatsApp. Proses 1-3 hari kerja.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">📱</span>
                </div>
                <p className="font-medium text-gray-900">Masukkan Kode OTP</p>
                <p className="text-sm text-gray-500 mt-1">
                  Kode 6 digit telah dikirim ke WhatsApp terdaftar
                </p>
              </div>
              <Input
                placeholder="Masukkan 6 digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>Batal</Button>
            {withdrawStep === "form" ? (
              <Button
                onClick={handleRequestOtp}
                disabled={!amount || !bankName || !accountNumber || !accountName || requestOtp.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {requestOtp.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim OTP...</>
                ) : (
                  "Kirim OTP"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleWithdraw}
                disabled={otp.length !== 6 || withdraw.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {withdraw.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
                ) : (
                  "Konfirmasi Penarikan"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
