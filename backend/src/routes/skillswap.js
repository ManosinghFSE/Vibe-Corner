import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';
import { v4 as uuidv4 } from 'uuid';

export const skillSwapRouter = express.Router();

skillSwapRouter.use(requireAuth);

function resolveUser(req) {
  return { id: req.user?.sub || req.user?.id || null, email: req.user?.email || null };
}

// Add a skill
skillSwapRouter.post('/skills', async (req, res) => {
  try {
    const { id: userId, email } = resolveUser(req);
    if (!userId || !email) return res.status(401).json({ error: 'Unauthorized' });
    const supabase = getSupabase();
    const { skill, category, level, experience, availability, description } = req.body || {};
    if (!skill || !category || !level) return res.status(400).json({ error: 'Missing fields' });
    const id = uuidv4();
    const row = { id, user_id: userId, user_email: email, skill, category, level, experience: Number(experience || 0), availability: availability || 'Available', description: description || '', created_at: new Date().toISOString() };
    const { error } = await supabase.from('skills').insert(row);
    if (error) throw error;
    return res.status(201).json({ skill: { id, userEmail: email, skill, category, level, experience: row.experience, availability: row.availability, description: row.description, createdAt: row.created_at } });
  } catch (e) {
    res.status(400).json({ error: 'Failed to add skill' });
  }
});

// List all skills (optional filtering)
skillSwapRouter.get('/skills', async (req, res) => {
  try {
    const supabase = getSupabase();
    let query = supabase.from('skills').select('*');
    if (req.query.category && req.query.category !== 'All') query = query.eq('category', String(req.query.category));
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const skills = (data || []).map(r => ({ id: r.id, userEmail: r.user_email, skill: r.skill, category: r.category, level: r.level, experience: r.experience, availability: r.availability, description: r.description, createdAt: r.created_at }));
    res.json({ skills });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// List my skills
skillSwapRouter.get('/my-skills', async (req, res) => {
  try {
    const { id: userId } = resolveUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const supabase = getSupabase();
    const { data, error } = await supabase.from('skills').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    const skills = (data || []).map(r => ({ id: r.id, userEmail: r.user_email, skill: r.skill, category: r.category, level: r.level, experience: r.experience, availability: r.availability, description: r.description, createdAt: r.created_at }));
    res.json({ skills });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch my skills' });
  }
});

// Simple matches (mock scoring): find skills with same name different user
skillSwapRouter.get('/matches', async (req, res) => {
  try {
    const { id: userId, email } = resolveUser(req);
    if (!userId) return res.json({ matches: [] });
    const supabase = getSupabase();
    const { data: mySkills } = await supabase.from('skills').select('skill').eq('user_id', userId);
    const mySet = new Set((mySkills || []).map(s => s.skill));
    if (mySet.size === 0) return res.json({ matches: [] });
    const { data: others } = await supabase.from('skills').select('*').neq('user_id', userId).in('skill', Array.from(mySet)).limit(50);
    const matches = (others || []).map((r, i) => ({ id: r.id, requestId: r.id, requesterEmail: email, helperEmail: r.user_email, skill: r.skill, matchScore: 80 + (i % 20), createdAt: r.created_at }));
    res.json({ matches });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

 