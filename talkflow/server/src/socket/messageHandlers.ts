// server/src/socket/messageHandlers.ts
import { Server, Socket } from 'socket.io';
import { redis } from '../services/redis';
import { db } from '../db';

export function registerMessageHandlers(io: Server, socket: Socket) {
  const { userId, workspaceId } = socket.data;

  socket.on('message:send', async ({ channelId, content, threadId, fileUrl }: {
    channelId: string; content: string; threadId?: number; fileUrl?: string;
  }) => {
    const [membership] = await db.query(
      'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    ) as any[];
    if (!membership?.length) return socket.emit('error', { code: 'FORBIDDEN' });

    const [result] = await db.query(
      `INSERT INTO messages (channel_id, user_id, content, thread_id, file_url, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [channelId, userId, content, threadId || null, fileUrl || null]
    ) as any[];

    const [rows] = await db.query(
      `SELECT m.*, u.display_name, u.avatar_url
       FROM messages m JOIN users u ON u.id = m.user_id
       WHERE m.id = ?`,
      [result.insertId]
    ) as any[];

    await redis.publish(
      `workspace:${workspaceId}:channel:${channelId}`,
      JSON.stringify({ event: 'message:new', data: rows[0] })
    );
  });

  socket.on('message:edit', async ({ messageId, content }: { messageId: number; content: string }) => {
    await db.query(
      'UPDATE messages SET content = ?, edited_at = NOW() WHERE id = ? AND user_id = ?',
      [content, messageId, userId]
    );
    const [rows] = await db.query(
      'SELECT channel_id FROM messages WHERE id = ?', [messageId]
    ) as any[];
    if (!rows?.[0]) return;

    await redis.publish(
      `workspace:${workspaceId}:channel:${rows[0].channel_id}`,
      JSON.stringify({ event: 'message:updated', data: { messageId, content } })
    );
  });

  socket.on('message:react', async ({ messageId, emoji }: { messageId: number; emoji: string }) => {
    const [existing] = await db.query(
      'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [messageId, userId, emoji]
    ) as any[];

    if (existing?.length) {
      await db.query('DELETE FROM reactions WHERE id = ?', [existing[0].id]);
    } else {
      await db.query(
        'INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)',
        [messageId, userId, emoji]
      );
    }

    const [counts] = await db.query(
      `SELECT emoji, COUNT(*) as count FROM reactions WHERE message_id = ? GROUP BY emoji`,
      [messageId]
    ) as any[];

    const [msgRows] = await db.query(
      'SELECT channel_id FROM messages WHERE id = ?', [messageId]
    ) as any[];

    await redis.publish(
      `workspace:${workspaceId}:channel:${msgRows[0].channel_id}`,
      JSON.stringify({ event: 'message:reactions_updated', data: { messageId, reactions: counts } })
    );
  });

  socket.on('typing:start', ({ channelId }: { channelId: string }) => {
    socket.to(`wc:${workspaceId}:${channelId}`)
      .emit('typing:update', { userId, channelId, isTyping: true });
  });

  socket.on('typing:stop', ({ channelId }: { channelId: string }) => {
    socket.to(`wc:${workspaceId}:${channelId}`)
      .emit('typing:update', { userId, channelId, isTyping: false });
  });
}
