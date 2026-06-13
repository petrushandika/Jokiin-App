import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = (() => {
      try {
        const stored = localStorage.getItem("jokiin-auth");
        if (!stored) return undefined;
        const parsed = JSON.parse(stored) as { state?: { token?: string } };
        return parsed.state?.token;
      } catch {
        return undefined;
      }
    })();

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
