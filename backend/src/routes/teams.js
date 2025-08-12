import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const teamsRouter = express.Router();

teamsRouter.use(requireAuth);

// Get current user's team information (map first bill group as team)
teamsRouter.get('/me', async (req, res) => {
  const userId = req.user.sub || req.user.id;
  const supabase = getSupabase();
  const { data: gm, error } = await supabase.from('bill_group_members').select('group_id').eq('user_id', userId).limit(1);
  if (error) return res.status(500).json({ error: 'Failed to load team' });
  const first = (gm || [])[0];
  if (!first) return res.json({ team: null });
  const { data: g, error: gerr } = await supabase.from('bill_groups').select('*').eq('id', first.group_id).single();
  if (gerr) return res.status(500).json({ error: 'Failed to load team' });
  const { data: members } = await supabase.from('bill_group_members').select('user_id').eq('group_id', g.id);
  const safeTeam = { id: g.id, name: g.name, region: null, description: g.description, ownerId: g.created_by, memberCount: (members || []).length, createdAt: g.created_at };
  res.json({ team: safeTeam });
});

// List teams (map all bill groups as teams)
teamsRouter.get('/', async (req, res) => {
  const supabase = getSupabase();
  const { data: groups, error } = await supabase.from('bill_groups').select('*');
  if (error) return res.status(500).json({ error: 'Failed to list teams' });
  const { data: members } = await supabase.from('bill_group_members').select('group_id');
  const countMap = new Map();
  (members || []).forEach(m => countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1));
  const list = (groups || []).map(t => ({ id: t.id, name: t.name, region: null, description: t.description, ownerId: t.created_by, memberCount: countMap.get(t.id) || 0, createdAt: t.created_at }));
  res.json({ teams: list });
}); 