"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Paperclip, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/navbar";
import { useMessages, useChat } from "@/hooks/useChat";
import { useOrder } from "@/hooks/useOrders";
import { useAuthStore } from "@/store/auth";
import { formatRelativeTime } from "@/lib/status";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: order } = useOrder(id);
  const { data: messages, isLoading } = useMessages(id);
  const { isConnected, sendMessage, sendFile, sendError, setSendError } = useChat(id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) sendFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      {/* Chat header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-16 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/orders/${id}`} className="text-gray-500 hover:text-indigo-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{order?.title ?? "Loading..."}</p>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <Wifi className="w-3 h-3" /> Terhubung
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <WifiOff className="w-3 h-3" /> Menghubungkan...
                  </div>
                )}
              </div>
            </div>
          </div>
          {order?.worker && (
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={order.worker.user.avatarUrl} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                  {order.worker.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700">{order.worker.user.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-64"}`} />
            </div>
          ))
        ) : (messages ?? []).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-gray-500 text-sm">Belum ada pesan. Mulai percakapan!</p>
          </div>
        ) : (
          (messages ?? []).map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                {!isMe && (
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={msg.sender.avatarUrl} />
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                      {msg.sender.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-xs md:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {!isMe && (
                    <span className="text-xs text-gray-500 ml-1">{msg.sender.name}</span>
                  )}
                  {msg.type === "file" && msg.fileUrl ? (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm"
                      }`}
                    >
                      <Paperclip className="w-4 h-4" />
                      {msg.fileName ?? "File"}
                    </a>
                  ) : (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 px-1">
                    {formatRelativeTime(msg.createdAt)}
                    {isMe && (
                      <span className={`ml-1 ${msg.isRead ? "text-indigo-400" : "text-gray-300"}`}>
                        {msg.isRead ? "✓✓" : "✓"}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0">
        {sendError && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {sendError}
            <button onClick={() => setSendError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-gray-400 hover:text-indigo-600"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan... (jangan bagikan nomor HP atau email)"
            className="flex-1 rounded-full border-gray-200"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="max-w-3xl mx-auto text-xs text-gray-400 mt-1.5 text-center">
          ⚠️ Berbagi kontak pribadi (HP, email, WA) melanggar ketentuan dan akan diblokir
        </p>
      </div>
    </div>
  );
}
