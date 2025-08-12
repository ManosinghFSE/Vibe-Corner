import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';
import { v4 as uuidv4 } from 'uuid';

export const birthdayRouter = express.Router();

birthdayRouter.use(requireAuth);

// Simple in-memory storage for boards/messages (dev/demo)
const birthdayBoards = new Map(); // boardId -> board
const birthdayBoardByBirthdayId = new Map(); // birthdayId -> boardId
const boardMessages = new Map(); // boardId -> Message[]

// GET /api/birthday/upcoming?window=30
birthdayRouter.get('/upcoming', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.sub || req.user.id;
    const windowDays = parseInt(String(req.query.window || '30')) || 30;

    // Collect user's teams
    const { data: memberships } = await supabase.from('bill_group_members').select('group_id').eq('user_id', userId);
    const groupIds = (memberships || []).map(m => m.group_id);

    // If user has teams, fetch their member user_ids; else use all users
    let userIds = [];
    if (groupIds.length > 0) {
      const { data: members } = await supabase.from('bill_group_members').select('user_id').in('group_id', groupIds);
      userIds = Array.from(new Set((members || []).map(m => m.user_id)));
    } else {
      const { data: allUsers } = await supabase.from('users').select('id');
      userIds = (allUsers || []).map(u => u.id);
    }

    if (userIds.length === 0) return res.json({ birthdays: [] });

    const { data: bdays } = await supabase.from('birthdays').select('user_id,date,visibility').in('user_id', userIds);
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + windowDays);

    const results = (bdays || []).map(b => {
      const d = new Date(b.date);
      // Normalize to this year/next year for upcoming calculation
      const normalized = new Date(d);
      normalized.setFullYear(today.getFullYear());
      if (normalized < today) normalized.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.ceil((normalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { userId: b.user_id, date: d.toISOString(), daysUntil, visibility: b.visibility || 'team' };
    }).filter(x => x.daysUntil >= 0 && new Date(today.getTime() + x.daysUntil * 86400000) <= endDate)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Attach user names
    const { data: users } = await supabase.from('users').select('id,name');
    const nameMap = new Map((users || []).map(u => [u.id, u.name]));

    const payload = results.map(r => ({
      id: `${r.userId}-${r.date}`,
      userId: r.userId,
      userName: nameMap.get(r.userId) || 'User',
      date: r.date,
      daysUntil: r.daysUntil,
      visibility: r.visibility,
    }));

    res.json({ birthdays: payload });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load upcoming birthdays' });
  }
});

// POST /api/birthday/boards — create or return existing board for a birthday
birthdayRouter.post('/boards', (req, res) => {
  try {
    const { birthdayId } = req.body || {};
    if (!birthdayId) return res.status(400).json({ error: 'birthdayId is required' });

    // Reuse board if one already exists for this birthday
    const existingId = birthdayBoardByBirthdayId.get(birthdayId);
    if (existingId && birthdayBoards.has(existingId)) {
      return res.json({ board: birthdayBoards.get(existingId) });
    }

    const boardId = uuidv4();
    const board = {
      id: boardId,
      birthdayId,
      userId: (req.user.sub || req.user.id) || 'unknown',
      userName: req.user?.name || 'Friend',
      title: 'Happy Birthday! 🎂',
      messageCount: 0,
      participants: []
    };
    birthdayBoards.set(boardId, board);
    birthdayBoardByBirthdayId.set(birthdayId, boardId);
    boardMessages.set(boardId, []);

    return res.status(201).json({ board });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create board' });
  }
});

// GET /api/birthday/boards/:id — board details and messages
birthdayRouter.get('/boards/:id', (req, res) => {
  const board = birthdayBoards.get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const messages = boardMessages.get(req.params.id) || [];
  return res.json({ board: { ...board, messageCount: messages.length }, messages });
});

// POST /api/birthday/boards/:id/messages — add a message
birthdayRouter.post('/boards/:id/messages', (req, res) => {
  try {
    const board = birthdayBoards.get(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    const { content, sticker } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

    const message = {
      id: uuidv4(),
      boardId: board.id,
      authorId: (req.user.sub || req.user.id) || 'unknown',
      authorName: req.user?.name || 'You',
      content: String(content).slice(0, 500),
      sticker: sticker || '🎂',
      createdAt: new Date().toISOString()
    };

    const arr = boardMessages.get(board.id) || [];
    arr.push(message);
    boardMessages.set(board.id, arr);

    return res.status(201).json({ message });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to post message' });
  }
});

// GET /api/birthday/boards/:id/share — share URL
birthdayRouter.get('/boards/:id/share', (req, res) => {
  const board = birthdayBoards.get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  const shareUrl = `${base}/share/birthday/${encodeURIComponent(board.id)}`;
  return res.json({ shareUrl });
});

// Legacy placeholder kept for compatibility (no-op)
birthdayRouter.post('/messages', (req, res) => {
  res.status(201).json({ ok: true });
}); 