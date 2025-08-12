import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const storyCraftRouter = express.Router();

storyCraftRouter.use(requireAuth);

// List stories for current user
storyCraftRouter.get('/stories', async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.sub || req.user.id;
  const { data, error } = await supabase.from('stories').select('*').eq('owner_id', userId).order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to load stories' });
  res.json({ stories: data || [] });
});

// Create story
storyCraftRouter.post('/stories', async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.sub || req.user.id;
  const id = uuidv4();
  const { title, theme = 'fantasy' } = req.body || {};
  const row = { id, owner_id: userId, title: title || 'Untitled Story', theme, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('stories').insert(row);
  if (error) return res.status(400).json({ error: 'Failed to create story' });
  res.status(201).json({ story: row });
});

// Get story with scenes
storyCraftRouter.get('/stories/:id', async (req, res) => {
  const supabase = getSupabase();
  const storyId = req.params.id;
  const { data: story, error: sErr } = await supabase.from('stories').select('*').eq('id', storyId).single();
  if (sErr || !story) return res.status(404).json({ error: 'Story not found' });
  const { data: scenes } = await supabase.from('story_scenes').select('*').eq('story_id', storyId).order('order_index');
  res.json({ story, scenes: scenes || [] });
});

// Upsert scene
storyCraftRouter.post('/stories/:id/scenes', async (req, res) => {
  const supabase = getSupabase();
  const storyId = req.params.id;
  const { id, title, content, media = [], orderIndex = 0, branchTo = null } = req.body || {};
  const sceneId = id || uuidv4();
  const row = { id: sceneId, story_id: storyId, title, content, media, order_index: orderIndex, branch_to: branchTo, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('story_scenes').upsert(row, { onConflict: 'id' });
  if (error) return res.status(400).json({ error: 'Failed to save scene' });
  res.status(201).json({ scene: row });
});

// Save custom theme
storyCraftRouter.post('/themes', async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.sub || req.user.id;
  const id = uuidv4();
  const { name, config } = req.body || {};
  const row = { id, owner_id: userId, name, config, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('story_themes').insert(row);
  if (error) return res.status(400).json({ error: 'Failed to save theme' });
  res.status(201).json({ theme: row });
});

export default storyCraftRouter; 