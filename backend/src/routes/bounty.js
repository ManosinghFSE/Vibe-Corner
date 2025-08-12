import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';
import { v4 as uuidv4 } from 'uuid';

export const bountyRouter = express.Router();

bountyRouter.use(requireAuth);

function resolveUser(req) {
  return { id: req.user?.sub || req.user?.id || null, role: req.user?.role || 'user', name: req.user?.name || 'User' };
}

function requireManager(req, res, next) {
  const role = req.user?.role || 'user';
  if (role === 'manager' || role === 'admin') return next();
  return res.status(403).json({ error: 'Manager or admin required' });
}

  // List bounties
  bountyRouter.get('/bounties', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { status, category, q, mine } = req.query;
      const { id: userId } = resolveUser(req);
      let sel = supabase.from('bounties').select('*');
      if (status) sel = sel.eq('status', String(status));
      if (category) sel = sel.eq('category', String(category));
      if (q) sel = sel.ilike('title', `%${String(q)}%`);
      const { data: rows, error } = await sel.order('created_at', { ascending: false });
      if (error) throw error;
      let list = rows || [];

      // Decorate with current user's assignment status
      let myMap = new Map();
      if (userId) {
        const { data: my } = await supabase
          .from('bounty_assignments')
          .select('bounty_id,status')
          .eq('user_id', userId);
        (my || []).forEach(m => { myMap.set(m.bounty_id, m.status); });
      }

      list = list.map(b => ({
        ...b,
        assignedToMe: myMap.has(b.id),
        myAssignmentStatus: myMap.get(b.id) || null
      }));

      if (mine && userId) {
        list = list.filter(b => b.assignedToMe);
      }

      res.json({ bounties: list });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch bounties' });
    }
  });

// Create bounty (manager/admin)
bountyRouter.post('/bounties', requireManager, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id: userId } = resolveUser(req);
    const { title, description = '', category = 'General', points = 10, startAt = null, dueAt = null } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Title required' });
    const id = uuidv4();
    const row = { id, title, description, category, points: Number(points || 0), start_at: startAt, due_at: dueAt, status: 'open', created_by: userId, created_at: new Date().toISOString() };
    const { error } = await supabase.from('bounties').insert(row);
    if (error) throw error;
    res.status(201).json({ bounty: row });
  } catch (e) {
    res.status(400).json({ error: 'Failed to create bounty' });
  }
});

// Pickup bounty
bountyRouter.post('/bounties/:id/pickup', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id: userId } = resolveUser(req);
    const bountyId = req.params.id;
    // ensure bounty open
    const { data: b } = await supabase.from('bounties').select('*').eq('id', bountyId).single();
    if (!b) return res.status(404).json({ error: 'Bounty not found' });
    if (b.status !== 'open' && b.status !== 'in-progress') return res.status(400).json({ error: 'Bounty not available' });
    // check if already picked by user
    const { data: existing } = await supabase.from('bounty_assignments').select('id').eq('bounty_id', bountyId).eq('user_id', userId).maybeSingle();
    if (existing) return res.json({ ok: true });
    const row = { id: uuidv4(), bounty_id: bountyId, user_id: userId, status: 'picked', picked_at: new Date().toISOString(), awarded_points: 0 };
    await supabase.from('bounty_assignments').insert(row);
    // set bounty to in-progress
    if (b.status === 'open') await supabase.from('bounties').update({ status: 'in-progress' }).eq('id', bountyId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to pickup bounty' });
  }
});

// Submit bounty work
bountyRouter.post('/bounties/:id/submit', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id: userId } = resolveUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const bountyId = req.params.id;

    // Ensure assignment exists for this user
    const { data: existing, error: eErr } = await supabase
      .from('bounty_assignments')
      .select('id, status')
      .eq('bounty_id', bountyId)
      .eq('user_id', userId)
      .maybeSingle();
    if (eErr) throw eErr;
    if (!existing) return res.status(400).json({ error: 'Pick up the bounty before submitting' });

    const { data, error } = await supabase
      .from('bounty_assignments')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('bounty_id', bountyId)
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) return res.status(400).json({ error: 'Failed to submit bounty' });

    // Reflect status on bounty if in-progress
    await supabase.from('bounties').update({ status: 'submitted' }).eq('id', bountyId).or('status.eq.in-progress,status.eq.open');

    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to submit bounty' });
  }
});

// Approve submission (manager/admin) and award points
bountyRouter.post('/bounties/:id/approve', requireManager, async (req, res) => {
  try {
    const supabase = getSupabase();
    const bountyId = req.params.id;
    const { userId, points } = req.body || {};
    // fetch bounty to get points
    const { data: b } = await supabase.from('bounties').select('*').eq('id', bountyId).single();
    if (!b) return res.status(404).json({ error: 'Bounty not found' });
    const award = Number(points || b.points || 0);
    await supabase
      .from('bounty_assignments')
      .update({ status: 'approved', completed_at: new Date().toISOString(), awarded_points: award })
      .eq('bounty_id', bountyId)
      .eq('user_id', userId);
    // update leaderboard
    await supabase
      .from('user_points')
      .upsert({ user_id: userId, points: award }, { onConflict: 'user_id', ignoreDuplicates: false })
      .select();
    await supabase.rpc('increment_user_points', { p_user_id: userId, p_delta: award }).catch(async () => {
      // Fallback: if RPC not present, recompute total
      const { data: sum } = await supabase.from('bounty_assignments').select('awarded_points').eq('user_id', userId);
      const total = (sum || []).reduce((s, r) => s + Number(r.awarded_points || 0), 0);
      await supabase.from('user_points').upsert({ user_id: userId, points: total }, { onConflict: 'user_id' });
    });
    // mark bounty completed
    await supabase.from('bounties').update({ status: 'completed' }).eq('id', bountyId);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to approve bounty' });
  }
});

// Update bounty status (manager/admin)
bountyRouter.post('/bounties/:id/status', requireManager, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { status } = req.body || {};
    const { error } = await supabase.from('bounties').update({ status }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update status' });
  }
});

// View bounty details + assignees
bountyRouter.get('/bounties/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const bountyId = req.params.id;
    const { data: bounty, error: bErr } = await supabase.from('bounties').select('*').eq('id', bountyId).single();
    if (bErr) throw bErr;
    if (!bounty) return res.status(404).json({ error: 'Not found' });
    const { data: assignments, error: aErr } = await supabase
      .from('bounty_assignments')
      .select('id, user_id, status, picked_at, submitted_at, completed_at, awarded_points, users(name, email)')
      .eq('bounty_id', bountyId);
    if (aErr) throw aErr;
    const assignees = (assignments || []).map(a => ({
      id: a.id,
      userId: a.user_id,
      name: (a.users && a.users.name) || 'User',
      email: (a.users && a.users.email) || null,
      status: a.status,
      pickedAt: a.picked_at,
      submittedAt: a.submitted_at,
      completedAt: a.completed_at,
      awardedPoints: a.awarded_points || 0,
    }));
    res.json({ bounty, assignees });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch bounty' });
  }
});

  // Leaderboard
  bountyRouter.get('/leaderboard', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_points')
        .select('user_id, points, users(name, email)')
        .order('points', { ascending: false })
        .limit(20);
      if (error) throw error;
      const leaderboard = (data || []).map(r => ({
        userId: r.user_id,
        name: (r.users && r.users.name) || 'User',
        points: r.points
      }));
      res.json({ leaderboard });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }); 