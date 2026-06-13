import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { db } from "./database.ts";
import { sessions } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import type { Socket } from "socket.io";

let io: SocketIOServer | null = null;

export function createSocketServer(): SocketIOServer {
  const pubClient = new Redis(process.env.REDIS_URL!);
  const subClient = pubClient.duplicate();

  io = new SocketIOServer({
    cors: {
      origin: process.env.APP_URL ?? "http://localhost:3000",
      credentials: true,
    },
  });

  io.adapter(createAdapter(pubClient as never, subClient as never));

  // Auth middleware — validasi session token
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error("UNAUTHORIZED"));

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token),
      with: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return next(new Error("UNAUTHORIZED"));
    }

    if (session.user.is_banned || (session.user.is_suspended && session.user.suspended_until && session.user.suspended_until > new Date())) {
      return next(new Error("FORBIDDEN"));
    }

    socket.data.userId = session.user.id;
    socket.data.userRole = session.user.role;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    console.log(`[Socket] User ${userId} connected`);

    // Join personal room untuk notifikasi
    socket.join(`user:${userId}`);

    // Join order chat room
    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`[Socket] User ${userId} joined order:${orderId}`);
    });

    socket.on("leave:order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Worker online status
    socket.on("worker:online", async () => {
      if (socket.data.userRole !== "worker") return;
      await db.query.workerProfiles.findFirst; // lazy import
      const { workerProfiles } = await import("../../database/schema.ts");
      const { db: database } = await import("./database.ts");
      await database.update(workerProfiles)
        .set({ is_online: true })
        .where((await import("drizzle-orm")).eq(workerProfiles.user_id, userId));
      socket.to("admin:room").emit("worker:status", { userId, online: true });
    });

    socket.on("disconnect", async () => {
      if (socket.data.userRole === "worker") {
        const { workerProfiles } = await import("../../database/schema.ts");
        const { db: database } = await import("./database.ts");
        const { eq: eqFn } = await import("drizzle-orm");
        await database.update(workerProfiles)
          .set({ is_online: false })
          .where(eqFn(workerProfiles.user_id, userId));
      }
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

// Helper — emit ke user tertentu
export function emitToUser(userId: string, event: string, data: unknown) {
  try {
    getIO().to(`user:${userId}`).emit(event, data);
  } catch {
    // IO belum diinisialisasi, skip
  }
}

// Helper — emit ke semua peserta order
export function emitToOrder(orderId: string, event: string, data: unknown) {
  try {
    getIO().to(`order:${orderId}`).emit(event, data);
  } catch {
    // IO belum diinisialisasi, skip
  }
}
