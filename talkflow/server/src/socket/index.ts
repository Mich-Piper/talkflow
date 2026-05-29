// server/src/socket/index.ts
import { Server, Socket } from 'socket.io';
import admin from 'firebase-admin';
import { registerMessageHandlers }  from './messageHandlers';
import { registerPresenceHandlers } from './presenceHandlers';
import { redis } from '../services/redis';

export function initSocketServer(io: Server) {
  // Redis subscriber for cross-server fan-out
  const sub = redis.duplicate();

  sub.psubscribe('workspace:*', (err) => {
    if (err) console.error('Redis psubscribe error:', err);
  });

  sub.on('pmessage', (_pattern, channel, message) => {
    // channel = "workspace:<wid>:channel:<cid>"
    const parts = channel.split(':');
    const workspaceId = parts[1];
    const channelId   = parts[3];
    const { event, data } = JSON.parse(message);

    // Broadcast to all sockets in this workspace channel room
    io.to(`wc:${workspaceId}:${channelId}`).emit(event, data);
  });

  // Authenticate every socket connection via Firebase ID token
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      socket.data.userId      = decoded.uid;
      socket.data.workspaceId = decoded.workspaceId as string;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, workspaceId } = socket.data;
    console.log(`[socket] connected: ${userId} (ws: ${workspaceId})`);

    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('channel:join', ({ channelId }: { channelId: string }) => {
      socket.join(`wc:${workspaceId}:${channelId}`);
    });

    socket.on('channel:leave', ({ channelId }: { channelId: string }) => {
      socket.leave(`wc:${workspaceId}:${channelId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${userId}`);
    });
  });
}
