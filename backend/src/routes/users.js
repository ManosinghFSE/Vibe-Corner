import express from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const usersRouter = express.Router();

// Get all users (for UI selection lists)
usersRouter.get('/', requireAuth, async (req, res) => {
  try {
    const { teamId, excludeSelf } = req.query;
    const supabase = getSupabase();
    let { data: users, error } = await supabase.from('users').select('id,name,email,role,avatar_url');
    if (error) throw error;
    let list = (users || []).map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar_url }));
    if (excludeSelf === 'true') list = list.filter(u => u.id !== (req.user.sub || req.user.id));
    // teamId filter can be implemented when a teams table exists; noop for now
    return res.json({ users: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Invite user (admin only) - creates a placeholder user record
usersRouter.post('/invite', requireAuth, requireRole('admin'), async (req, res) => {
  const schema = z.object({ email: z.string().email(), name: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, name } = parsed.data;
  try {
    const supabase = getSupabase();
    const avatar_url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const { data, error } = await supabase.from('users').insert({ name, email, password_hash: '$2a$10$PLACEHOLDER', role: 'user', avatar_url }).select('id,name,email,role').single();
    if (error) {
      if (String(error.message).toLowerCase().includes('duplicate')) return res.status(409).json({ error: 'Email already exists' });
      throw error;
    }
    return res.status(201).json({ user: data, tempPassword: null });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to invite user' });
  }
}); 