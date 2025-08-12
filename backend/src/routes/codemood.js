import express from 'express';
import { requireAuth } from '../middleware/auth.js';

export const codeMoodRouter = express.Router();
export const codeMoodApi = express.Router();

codeMoodRouter.use(requireAuth);
codeMoodApi.use(requireAuth);

// Simple in-memory store for demo data
const checkins = []; // { userId, mood, energy, stress, createdAt }

codeMoodRouter.get('/overview', (req, res) => { res.json({ teams: [], trends: [] }); });
codeMoodApi.get('/sentiment', (req, res) => { res.json({ snapshots: [] }); });

// Current user mood summary
codeMoodApi.get('/mood', (req, res) => {
  const userId = req.user.sub || req.user.id;
  const userCheckins = checkins.filter(c => c.userId === userId).slice(-10);
  const score = userCheckins.length > 0 ? Math.round((userCheckins.reduce((s, c) => s + moodToScore(c.mood), 0) / userCheckins.length) * 100) / 100 : 0.7;
  res.json({ mood: { score, trend: score >= 0.7 ? 'up' : 'down' } });
});

// Team overview
codeMoodApi.get('/team', (req, res) => {
  // Aggregate last 50 checkins as team stats
  const recent = checkins.slice(-50);
  const happiness = recent.length > 0 ? Math.round((recent.reduce((s, c) => s + moodToScore(c.mood), 0) / recent.length) * 100) : 0;
  const productivity = recent.length > 0 ? Math.round((recent.reduce((s, c) => s + (6 - c.stress) + c.energy, 0) / (recent.length * 10)) * 100) : 0;

  const counts = new Map();
  for (const c of recent) counts.set(c.mood, (counts.get(c.mood) || 0) + 1);
  const recentMoods = Array.from(counts.entries()).map(([mood, count]) => ({ mood, count }));

  res.json({
    team: {
      id: 'demo-team',
      members: 8,
      averageMood: happiness,
      productivity,
      recentMoods
    }
  });
});

// Notifications
codeMoodApi.get('/notifications', (req, res) => {
  const limit = Number(req.query.limit || 20);
  const now = new Date();
  const notifications = [
    { id: '1', type: 'insight', message: 'Morning standups correlate with higher focus.', timestamp: new Date(now.getTime() - 3600_000), read: false, priority: 'medium', actionable: false, metadata: { category: 'insight', animated: false } },
    { id: '2', type: 'achievement', message: 'Team kept a positive mood streak for 3 days! 🎉', timestamp: new Date(now.getTime() - 7200_000), read: false, priority: 'high', actionable: false, metadata: { category: 'achievement', animated: true } },
    { id: '3', type: 'reminder', message: 'Share your daily mood check-in.', timestamp: new Date(now.getTime() - 10800_000), read: true, priority: 'low', actionable: true, action: { label: 'Check in', url: '/codemood' }, metadata: { category: 'reminder', animated: false } }
  ].slice(0, limit);
  res.json({ notifications });
});

// Submit mood check-in
codeMoodApi.post('/checkin', (req, res) => {
  const userId = req.user.sub || req.user.id;
  const { mood, energy = 3, stress = 3, notes } = req.body || {};
  if (!mood) return res.status(400).json({ error: 'mood is required' });
  const entry = { userId, mood, energy: Number(energy), stress: Number(stress), notes: notes || '', createdAt: new Date().toISOString() };
  checkins.push(entry);
  res.status(201).json({ ok: true });
});

function moodToScore(mood) {
  const map = { happy: 1.0, excited: 0.9, productive: 0.85, focused: 0.8, tired: 0.5, stressed: 0.3 };
  return map[mood] ?? 0.7;
} 