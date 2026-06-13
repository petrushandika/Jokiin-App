"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Message } from "@/types";

export function useMessages(orderId: string) {
  return useQuery({
    queryKey: ["messages", orderId],
    queryFn: () => api.get<Message[]>(`/orders/${orderId}/messages`),
    enabled: !!orderId,
  });
}

export function useChat(orderId: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    socket.emit("join_order", { orderId });

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_message", (message: Message) => {
      queryClient.setQueryData<Message[]>(
        ["messages", orderId],
        (old) => [...(old ?? []), message]
      );
    });

    socket.on("message_moderated", ({ messageId, reason }: { messageId: string; reason: string }) => {
      setSendError(`Pesan diblokir: ${reason}`);
      queryClient.setQueryData<Message[]>(
        ["messages", orderId],
        (old) => old?.filter((m) => m.id !== messageId) ?? []
      );
    });

    setIsConnected(socket.connected);

    return () => {
      socket.emit("leave_order", { orderId });
      socket.off("new_message");
      socket.off("message_moderated");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [orderId, queryClient]);

  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    setSendError(null);
    const socket = socketRef.current;
    socket.emit("send_message", {
      orderId,
      content,
      type: "text",
    });
  };

  const sendFile = (file: File) => {
    const form = new FormData();
    form.append("file", file);
    api
      .post<Message>(`/orders/${orderId}/messages/file`, form)
      .then((msg) => {
        queryClient.setQueryData<Message[]>(
          ["messages", orderId],
          (old) => [...(old ?? []), msg]
        );
      })
      .catch((err: Error) => {
        toast.error(err.message ?? "Gagal mengirim file.");
      });
  };

  return { isConnected, sendMessage, sendFile, sendError, setSendError };
}
