import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const memoryLaneRouter = express.Router();

const createEntrySchema = z.object({ title: z.string().min(1).max(200), content: z.string().min(1), mood: z.number().min(1).max(5), tags: z.array(z.string()).optional(), date: z.string().optional(), isPrivate: z.boolean().optional() });
const updateEntrySchema = z.object({ title: z.string().min(1).max(200).optional(), content: z.string().min(1).optional(), mood: z.number().min(1).max(5).optional(), tags: z.array(z.string()).optional(), isPrivate: z.boolean().optional() });

memoryLaneRouter.use(requireAuth);

function resolveUserId(req) {
  return req.user?.sub || req.user?.id || null;
}

// Supabase helpers
async function dbCreateEntry(userId, payload) {
  const supabase = getSupabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const row = { id, user_id: userId, title: payload.title, content: payload.content, mood: payload.mood, tags: payload.tags || [], date: payload.date || now, created_at: now, updated_at: now, word_count: payload.content.split(/\s+/).length, is_private: payload.isPrivate ?? false };
  const { error } = await supabase.from('memory_entries').insert(row);
  if (error) throw error;
  return row;
}

async function dbListEntries(userId, q) {
  const supabase = getSupabase();
  const page = Math.max(1, Number(q.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 20)));
  const fromIdx = (page - 1) * pageSize;
  const toIdx = fromIdx + pageSize - 1;

  let sel = supabase
    .from('memory_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (q.from) sel = sel.gte('date', q.from);
  if (q.to) sel = sel.lte('date', q.to);
  if (q.mood) sel = sel.eq('mood', Number(q.mood));
  if (q.tag) sel = sel.contains('tags', [q.tag]);
  if (q.search) {
    const s = String(q.search).replace(/%/g, '');
    sel = sel.or(`title.ilike.%${s}%,content.ilike.%${s}%`);
  }

  sel = sel.order('date', { ascending: false }).range(fromIdx, toIdx);

  const { data, count, error } = await sel;
  if (error) throw error;
  return { entries: data || [], total: count || 0, page, pageSize };
}

async function dbGetEntry(userId, id) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('memory_entries').select('*').eq('id', id).eq('user_id', userId).single();
  if (error) return null;
  return data;
}
async function dbUpdateEntry(userId, id, changes) {
  const supabase = getSupabase();
  const row = { ...changes, updated_at: new Date().toISOString(), word_count: changes.content ? changes.content.split(/\s+/).length : undefined };
  const { data, error } = await supabase.from('memory_entries').update(row).eq('id', id).eq('user_id', userId).select('*').single();
  if (error) throw error;
  return data;
}
async function dbDeleteEntry(userId, id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('memory_entries').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// Create entry
memoryLaneRouter.post('/entries', async (req, res) => {
  try {
    const data = createEntrySchema.parse(req.body);
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const row = await dbCreateEntry(userId, data);
    return res.status(201).json({ entry: { id: row.id, userId: row.user_id, title: row.title, content: row.content, mood: row.mood, tags: row.tags, date: row.date, createdAt: row.created_at, updatedAt: row.updated_at, wordCount: row.word_count, isPrivate: row.is_private } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get entries with filters + pagination
memoryLaneRouter.get('/entries', async (req, res) => {
  const { from, to, tag, mood, search, page, pageSize } = req.query;
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { entries, total, page: p, pageSize: ps } = await dbListEntries(userId, { from, to, tag, mood, search, page, pageSize });
  return res.json({
    entries: entries.map(e => ({ id: e.id, userId: e.user_id, title: e.title, content: e.content, mood: e.mood, tags: e.tags, date: e.date, createdAt: e.created_at, updatedAt: e.updated_at, wordCount: e.word_count, isPrivate: e.is_private })),
    pagination: { total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) }
  });
});

// Get single entry
memoryLaneRouter.get('/entries/:id', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const e = await dbGetEntry(userId, req.params.id);
  if (!e) return res.status(404).json({ error: 'Entry not found' });
  return res.json({ entry: { id: e.id, userId: e.user_id, title: e.title, content: e.content, mood: e.mood, tags: e.tags, date: e.date, createdAt: e.created_at, updatedAt: e.updated_at, wordCount: e.word_count, isPrivate: e.is_private } });
});

// Update entry
memoryLaneRouter.put('/entries/:id', async (req, res) => {
  try {
    const data = updateEntrySchema.parse(req.body);
    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const e = await dbUpdateEntry(userId, req.params.id, { title: data.title, content: data.content, mood: data.mood, tags: data.tags, is_private: data.isPrivate });
    return res.json({ entry: { id: e.id, userId: e.user_id, title: e.title, content: e.content, mood: e.mood, tags: e.tags, date: e.date, createdAt: e.created_at, updatedAt: e.updated_at, wordCount: e.word_count, isPrivate: e.is_private } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete entry
memoryLaneRouter.delete('/entries/:id', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await dbDeleteEntry(userId, req.params.id);
  return res.json({ success: true });
});

// Stats (lightweight selection)
memoryLaneRouter.get('/stats', async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const supabase = getSupabase();
  // Only fetch minimal columns to compute stats
  const { data, error } = await supabase
    .from('memory_entries')
    .select('mood, tags, word_count', { count: 'exact' })
    .eq('user_id', userId);
  if (error) return res.status(500).json({ error: 'Failed to load stats' });

  const list = data || [];
  const total = list.length;
  const totalMood = list.reduce((sum, e) => sum + Number(e.mood || 0), 0);
  const avgMood = total > 0 ? totalMood / total : 0;
  const moodDistribution = {1:0,2:0,3:0,4:0,5:0};
  list.forEach(e => { moodDistribution[e.mood] = (moodDistribution[e.mood] || 0) + 1; });
  const tagFrequency = {};
  list.forEach(e => (e.tags || []).forEach(t => { tagFrequency[t] = (tagFrequency[t] || 0) + 1; }));
  const totalWords = list.reduce((sum, e) => sum + Number(e.word_count || 0), 0);

  res.json({
    totalEntries: total,
    avgMood: Math.round(avgMood * 10) / 10,
    moodDistribution,
    tagFrequency: Object.entries(tagFrequency)
      .sort(function(a,b){ return Number(b[1]) - Number(a[1]); })
      .slice(0,10)
      .map(function(pair){ return { tag: pair[0], count: pair[1] }; }),
    currentStreak: 0,
    longestStreak: 0,
    totalWords,
    avgWordsPerEntry: total > 0 ? Math.round(totalWords / total) : 0
  });
});

// Prompts can remain static as they are not mock-data backed
memoryLaneRouter.get('/prompts', (req, res) => {
  const { mood } = req.query;
  const prompts = { 1: ['What challenges are you facing today?','What would help improve your situation?','Who could you reach out to for support?'], 2: ['What\'s been weighing on your mind?','What small win can you celebrate today?','What are you learning from this experience?'], 3: ['What\'s going well in your life right now?','What routine or habit served you today?','What are you looking forward to?'], 4: ['What made you smile today?','Who or what are you grateful for?','What progress have you made recently?'], 5: ['What achievement are you most proud of today?','How did you make a positive impact?','What would you like to remember about this moment?'] };
  const selectedPrompts = mood ? prompts[mood] || prompts[3] : prompts[3];
  res.json({ prompts: selectedPrompts });
});

// Export entries
memoryLaneRouter.get('/export', (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const supabase = getSupabase();
  supabase.from('memory_entries').select('*').eq('user_id', userId)
    .then(response => {
      if (response.error) throw response.error;
      const entries = response.data || [];
      const csv = [
        'Date,Title,Mood,Tags,Word Count',
        ...entries.map(e => 
          `"${new Date(e.date).toLocaleDateString()}","${e.title}",${e.mood},"${e.tags.join(', ')}",${e.word_count}`
        )
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="memorylane-export.csv"');
      res.send(csv);
    })
    .catch(error => {
      console.error('Error exporting entries:', error);
      res.status(500).json({ error: 'Failed to export entries' });
    });
}); 