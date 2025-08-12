import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../services/supabase-client.js';

export const eventGridRouter = express.Router();

eventGridRouter.use(requireAuth);

// List events with optional filters: from, tag, search
eventGridRouter.get('/events', async (req, res) => {
  try {
    const supabase = getSupabase();
    const from = req.query.from ? new Date(String(req.query.from)).toISOString() : null;
    const tag = req.query.tag ? String(req.query.tag) : '';
    const search = req.query.search ? String(req.query.search).toLowerCase() : '';

    let query = supabase.from('events').select('*');
    if (from) query = query.gte('end_at', from);
    if (tag) query = query.contains('tags', [tag]);
    const { data: rows, error } = await query.order('start_at', { ascending: true });
    if (error) throw error;

    let list = rows || [];
    if (search) list = list.filter(e => ((e.title || '') + ' ' + (e.description || '')).toLowerCase().includes(search));

    // Attach RSVP aggregates
    const eventIds = list.map(e => e.id);
    let yesCounts = new Map();
    if (eventIds.length > 0) {
      const { data: rsvps } = await getSupabase()
        .from('event_rsvps')
        .select('event_id, status')
        .in('event_id', eventIds);
      (rsvps || []).forEach(r => {
        if (r.status === 'yes') yesCounts.set(r.event_id, (yesCounts.get(r.event_id) || 0) + 1);
      });
    }

    const result = list.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      startAt: row.start_at,
      endAt: row.end_at,
      location: row.location,
      organizerId: row.organizer_id,
      organizerName: row.organizer_name || 'Organizer',
      capacity: Number(row.capacity || 0),
      tags: Array.isArray(row.tags) ? row.tags : [],
      isVirtual: !!row.is_virtual,
      imageUrl: row.image_url || undefined,
      attendeeCount: yesCounts.get(row.id) || 0,
      userRsvpStatus: null,
      spotsLeft: Math.max(Number(row.capacity || 0) - (yesCounts.get(row.id) || 0), 0),
      isFull: (yesCounts.get(row.id) || 0) >= Number(row.capacity || 0)
    }));

    res.json({ events: result });
  } catch (e) {
    console.error('Event list failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create event
eventGridRouter.post('/events', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.sub || req.user.id;
    const userName = req.user.name || 'Organizer';
    const { title, description, startAt, endAt, location, capacity = 50, tags = [], isVirtual = false, imageUrl = null } = req.body || {};
    if (!title || !startAt || !endAt || !location) return res.status(400).json({ error: 'Missing required fields' });

    const id = uuidv4();
    const row = {
      id,
      title,
      description: description || '',
      start_at: startAt,
      end_at: endAt,
      location,
      organizer_id: userId,
      organizer_name: userName,
      capacity: Number(capacity),
      tags,
      is_virtual: !!isVirtual,
      image_url: imageUrl || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('events').insert(row);
    if (error) throw error;

    res.status(201).json({ event: {
      id,
      title,
      description: row.description,
      startAt,
      endAt,
      location,
      organizerId: userId,
      organizerName: userName,
      capacity: Number(capacity),
      tags,
      isVirtual: !!isVirtual,
      imageUrl: imageUrl || undefined,
      attendeeCount: 0,
      userRsvpStatus: null,
      spotsLeft: Number(capacity),
      isFull: false
    }});
  } catch (e) {
    console.error('Create event failed:', e?.message || e);
    res.status(400).json({ error: 'Failed to create event' });
  }
});

// Event details
eventGridRouter.get('/events/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const eventId = req.params.id;
    const { data: row, error } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (error || !row) return res.status(404).json({ error: 'Event not found' });

    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('user_id, status, created_at, users(name)')
      .eq('event_id', eventId);

    const attendees = (rsvps || []).filter(r => r.status === 'yes').map(r => ({ userId: r.user_id, userName: (r.users && r.users[0]?.name) || r.user_id, rsvpDate: r.created_at }));
    const rsvpCounts = countRsvpCounts(rsvps || []);
    const yesCount = rsvpCounts.yes;

    const event = {
      id: row.id,
      title: row.title,
      description: row.description || '',
      startAt: row.start_at,
      endAt: row.end_at,
      location: row.location,
      organizerId: row.organizer_id,
      organizerName: row.organizer_name || 'Organizer',
      capacity: Number(row.capacity || 0),
      tags: Array.isArray(row.tags) ? row.tags : [],
      isVirtual: !!row.is_virtual,
      imageUrl: row.image_url || undefined,
      attendeeCount: yesCount,
      userRsvpStatus: null,
      spotsLeft: Math.max(Number(row.capacity || 0) - yesCount, 0),
      isFull: yesCount >= Number(row.capacity || 0),
      rsvpCounts,
      attendees
    };

    res.json({ event });
  } catch (e) {
    console.error('Event details failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to load event' });
  }
});

// RSVP
eventGridRouter.post('/events/:id/rsvp', async (req, res) => {
  try {
    const supabase = getSupabase();
    const eventId = req.params.id;
    const userId = req.user.sub || req.user.id;
    const { status } = req.body || {};
    if (!['yes', 'no', 'maybe'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // Upsert RSVP
    const id = uuidv4();
    const { error: upErr } = await supabase
      .from('event_rsvps')
      .upsert({ id, event_id: eventId, user_id: userId, status, created_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' });
    if (upErr) throw upErr;

    // Return updated summary
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('status')
      .eq('event_id', eventId);

    const yesCount = (rsvps || []).filter(r => r.status === 'yes').length;
    const { data: eRow } = await supabase.from('events').select('capacity').eq('id', eventId).single();
    const capacity = Number(eRow?.capacity || 0);

    const summary = {
      attendeeCount: yesCount,
      spotsLeft: Math.max(capacity - yesCount, 0),
      isFull: yesCount >= capacity,
      userRsvpStatus: status
    };

    res.json({ event: { id: eventId, ...summary } });
  } catch (e) {
    console.error('RSVP failed:', e?.message || e);
    res.status(400).json({ error: 'Failed to RSVP' });
  }
});

// Download calendar (ICS)
eventGridRouter.get('/events/:id/calendar', async (req, res) => {
  try {
    const supabase = getSupabase();
    const eventId = req.params.id;
    const { data: row, error } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (error || !row) return res.status(404).json({ error: 'Event not found' });

    const ics = generateICS({
      id: row.id,
      title: row.title,
      description: row.description || '',
      startAt: row.start_at,
      endAt: row.end_at,
      location: row.location
    });

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="event-${row.id}.ics"`);
    res.send(ics);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate calendar' });
  }
});

// Dev helper: seed next 3 months if empty
eventGridRouter.post('/debug/ensure-seed', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from('events').select('id').limit(1);
    if (existing && existing.length > 0) return res.json({ ok: true, seeded: false });

    const tags = ['tech-talk','team-building','training','social','all-hands','workshop','hackathon'];
    const now = new Date();
    const rows = [];
    for (let i = 0; i < 8; i++) {
      const dayOffset = Math.floor((i + 1) * 10);
      const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10 + (i % 4), 0, 0);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      rows.push({
        id: uuidv4(),
        title: `Team Event #${i + 1}`,
        description: 'Join us for a great session to learn and connect.',
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        location: i % 2 === 0 ? 'Conference Room A' : 'Online',
        organizer_id: req.user.sub || req.user.id,
        organizer_name: req.user.name || 'Organizer',
        capacity: 50,
        tags: [tags[i % tags.length]],
        is_virtual: i % 2 !== 0,
        image_url: null,
        created_at: new Date().toISOString()
      });
    }
    const { error } = await supabase.from('events').insert(rows);
    if (error) throw error;
    res.json({ ok: true, seeded: true, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to seed events' });
  }
});

function countRsvpCounts(list) {
  const yes = list.filter(r => r.status === 'yes').length;
  const no = list.filter(r => r.status === 'no').length;
  const maybe = list.filter(r => r.status === 'maybe').length;
  return { yes, no, maybe };
}

function generateICS(e) {
  const dt = (s) => new Date(s).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
            'PRODID:-//VibeCorner//EventGrid//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(e.startAt)}`,
    `DTEND:${dt(e.endAt)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${(e.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${e.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
} 