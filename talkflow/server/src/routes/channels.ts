// server/src/routes/channels.ts
import { Router } from 'express';
import { db } from '../db';

const router = Router();

// GET /api/channels  — list channels the user can see
router.get('/', async (req: any, res) => {
  const { userId, workspaceId } = req.user;

  const [rows] = await db.query(
    `SELECT c.id, c.name, c.description, c.is_private,
            (SELECT COUNT(*) FROM channel_members WHERE channel_id = c.id) AS member_count,
            (SELECT MAX(created_at) FROM messages WHERE channel_id = c.id) AS last_message_at
     FROM channels c
     LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
     WHERE c.workspace_id = ?
       AND (c.is_private = FALSE OR cm.user_id IS NOT NULL)
     ORDER BY last_message_at DESC`,
    [userId, workspaceId]
  ) as any[];

  res.json(rows);
});

// POST /api/channels  — create a channel
router.post('/', async (req: any, res) => {
  const { userId, workspaceId } = req.user;
  const { name, description, isPrivate = false } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const [result] = await db.query(
    `INSERT INTO channels (workspace_id, name, description, is_private, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [workspaceId, name.toLowerCase().replace(/\s+/g, '-'), description, isPrivate, userId]
  ) as any[];

  // Auto-add creator as member
  await db.query(
    'INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)',
    [result.insertId, userId]
  );

  res.status(201).json({ id: result.insertId, name, description, isPrivate });
});

// GET /api/channels/:id/messages
router.get('/:id/messages', async (req: any, res) => {
  const { userId } = req.user;
  const { id }     = req.params;
  const before     = req.query.before;   // cursor-based pagination
  const limit      = parseInt(req.query.limit || '50');

  // Check membership
  const [membership] = await db.query(
    'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?',
    [id, userId]
  ) as any[];
  if (!(membership as any[]).length) {
    return res.status(403).json({ error: 'Not a member of this channel' });
  }

  const [messages] = await db.query(
    `SELECT m.id, m.content, m.file_url, m.thread_id, m.edited_at, m.created_at,
            u.id AS user_id, u.display_name, u.avatar_url
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.channel_id = ? AND m.thread_id IS NULL
       ${before ? 'AND m.created_at < ?' : ''}
     ORDER BY m.created_at DESC
     LIMIT ?`,
    before ? [id, before, limit] : [id, limit]
  ) as any[];

  res.json((messages as any[]).reverse());
});

export default router;
