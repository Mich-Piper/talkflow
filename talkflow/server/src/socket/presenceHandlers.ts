// server/src/socket/presenceHandlers.ts
import { Server, Socket } from 'socket.io';
import { redis } from '../services/redis';

const PRESENCE_TTL = 35; // seconds — client heartbeats every 30s

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const { userId, workspaceId } = socket.data;
  const presenceKey = `presence:${workspaceId}:${userId}`;

  async function setOnline() {
    await redis.setex(presenceKey, PRESENCE_TTL, 'online');
    io.to(`workspace:${workspaceId}`).emit('presence:update', { userId, status: 'online' });
  }

  async function setOffline() {
    await redis.del(presenceKey);
    io.to(`workspace:${workspaceId}`).emit('presence:update', { userId, status: 'offline' });
  }

  // Join the workspace broadcast room
  socket.join(`workspace:${workspaceId}`);

  // Mark online immediately on connect
  setOnline();

  // Client sends heartbeat every 30 seconds to maintain presence
  socket.on('presence:heartbeat', () => {
    redis.setex(presenceKey, PRESENCE_TTL, 'online');
  });

  socket.on('presence:away', () => {
    redis.setex(presenceKey, PRESENCE_TTL, 'away');
    io.to(`workspace:${workspaceId}`).emit('presence:update', { userId, status: 'away' });
  });

  socket.on('disconnect', () => {
    setOffline();
  });

  // GET /api/presence  — bulk lookup of workspace members
  socket.on('presence:list', async (_: unknown, ack: (data: unknown) => void) => {
    const keys = await redis.keys(`presence:${workspaceId}:*`);
    const pipeline = redis.pipeline();
    keys.forEach(k => pipeline.get(k));
    const results = await pipeline.exec();

    const presenceMap = Object.fromEntries(
      keys.map((k, i) => [k.split(':')[2], (results?.[i]?.[1] as string) || 'offline'])
    );
    ack(presenceMap);
  });
}
