import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';
import { v4 as uuidv4 } from 'uuid';

export const meetingMindRouter = express.Router();

meetingMindRouter.use(requireAuth);

// List meetings by status (upcoming|past)
meetingMindRouter.get('/meetings', async (req, res) => {
  try {
    const supabase = getSupabase();
    const status = String(req.query.status || 'upcoming');
    const nowIso = new Date().toISOString();
    const userId = req.user.sub || req.user.id || null;

    // decided_time when scheduled, else created_at as placeholder
    let query = supabase.from('meetings').select('*');
    if (userId) {
      query = query.contains('attendees', [userId]);
    }
    if (status === 'upcoming') {
      query = query.gte('decided_time', nowIso).order('decided_time', { ascending: true });
    } else {
      query = query.lt('decided_time', nowIso).order('decided_time', { ascending: false });
    }
    const { data: rows, error } = await query;
    if (error) throw error;

    // Attach attendee names
    const meetings = (rows || []).map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      attendees: r.attendees || [],
      attendeeNames: r.attendee_names || [],
      agendaItems: r.agenda_items || [],
      proposedTimes: r.proposed_times || [],
      decidedTime: r.decided_time || null,
      duration: Number(r.duration || 60),
      notes: r.notes || '',
      status: r.status || 'scheduled',
      createdAt: r.created_at
    }));

    res.json({ meetings });
  } catch (e) {
    console.error('Meeting list failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// Create meeting
meetingMindRouter.post('/meetings', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { title, type = 'general', attendees = [], duration = 60, agendaItems = [] } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }
    const creatorId = req.user.sub || req.user.id || null;
    const allAttendees = [...(Array.isArray(attendees) ? attendees : []), creatorId].filter(Boolean);
    // Validate UUID-ish format and de-duplicate
    const uuidish = (v) => typeof v === 'string' && /^[0-9a-fA-F-]{36}$/.test(v);
    const finalAttendees = Array.from(new Set(allAttendees.filter(uuidish)));
    if (finalAttendees.length < 1) {
      return res.status(400).json({ error: 'At least one valid attendee required' });
    }

    const id = uuidv4();
    const payload = {
      id,
      title,
      type,
      attendees: finalAttendees,
      attendee_names: [],
      agenda_items: Array.isArray(agendaItems) ? agendaItems : [],
      proposed_times: generateProposedTimes(),
      decided_time: null,
      duration,
      notes: '',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('meetings').insert(payload);
    if (error) throw error;

    res.status(201).json({ meeting: { ...payload, createdAt: payload.created_at } });
  } catch (e) {
    res.status(400).json({ error: 'Failed to create meeting' });
  }
});

// Get meeting details with actions
meetingMindRouter.get('/meetings/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: m, error } = await supabase.from('meetings').select('*').eq('id', req.params.id).single();
    if (error || !m) return res.status(404).json({ error: 'Meeting not found' });
    const { data: actions } = await supabase.from('meeting_actions').select('*').eq('meeting_id', req.params.id).order('created_at', { ascending: true });

    const meeting = {
      id: m.id,
      title: m.title,
      type: m.type,
      attendees: m.attendees || [],
      attendeeNames: m.attendee_names || [],
      agendaItems: m.agenda_items || [],
      proposedTimes: m.proposed_times || [],
      decidedTime: m.decided_time || null,
      duration: Number(m.duration || 60),
      notes: m.notes || '',
      status: m.status || 'scheduled',
      createdAt: m.created_at
    };

    const actionItems = (actions || []).map(a => ({
      id: a.id,
      meetingId: a.meeting_id,
      meetingTitle: meeting.title,
      title: a.title,
      description: a.description || '',
      ownerId: a.owner_id,
      ownerName: a.owner_name || a.owner_id,
      dueDate: a.due_date,
      status: a.status,
      completedAt: a.completed_at || undefined
    }));

    res.json({ meeting, actionItems });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load meeting' });
  }
});

// Update meeting (decidedTime)
meetingMindRouter.patch('/meetings/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { decidedTime } = req.body || {};
    const { error } = await supabase.from('meetings').update({ decided_time: decidedTime }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update meeting' });
  }
});

// Create action item
meetingMindRouter.post('/meetings/:id/actions', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { title, description = '', ownerId, dueDate } = req.body || {};
    if (!title || !ownerId || !dueDate) return res.status(400).json({ error: 'Missing fields' });
    const id = uuidv4();
    const payload = { id, meeting_id: req.params.id, title, description, owner_id: ownerId, owner_name: null, due_date: dueDate, status: 'pending', created_at: new Date().toISOString() };
    const { error } = await supabase.from('meeting_actions').insert(payload);
    if (error) throw error;
    res.status(201).json({ action: payload });
  } catch (e) {
    res.status(400).json({ error: 'Failed to create action item' });
  }
});

// Update action status
meetingMindRouter.put('/actions/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { status } = req.body || {};
    const { error } = await supabase.from('meeting_actions').update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update action' });
  }
});

// My actions for current user
meetingMindRouter.get('/my-actions', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.sub || req.user.id;
    const { data: actions, error } = await supabase
      .from('meeting_actions')
      .select('*, meetings(title)')
      .eq('owner_id', userId)
      .order('due_date', { ascending: true });
    if (error) throw error;
    const mapped = (actions || []).map(a => ({
      id: a.id,
      meetingId: a.meeting_id,
      meetingTitle: a.meetings?.[0]?.title || 'Meeting',
      title: a.title,
      description: a.description || '',
      ownerId: a.owner_id,
      ownerName: a.owner_name || undefined,
      dueDate: a.due_date,
      status: a.status,
      completedAt: a.completed_at || undefined
    }));
    res.json({ actions: mapped });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

function generateProposedTimes() {
  const result = [];
  const base = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    d.setHours(9 + i * 2, 0, 0, 0);
    result.push(d.toISOString());
  }
  return result;
}

 