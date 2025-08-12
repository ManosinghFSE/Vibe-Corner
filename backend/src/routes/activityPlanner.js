import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { getSupabase } from '../services/supabase-client.js';

const router = Router();

// Validation schemas
const recommendationSchema = z.object({
  location: z.string().min(1).max(100).trim(),
  teamSize: z.number().min(1).max(1000),
  budget: z.number().min(0).max(100000).optional(),
  preferences: z.object({
    cuisines: z.array(z.string().max(50)).max(20).optional(),
    activityTypes: z.array(z.string().max(50)).max(20).optional(),
    priceLevel: z.number().min(1).max(4).optional()
  }).optional()
});

async function querySupabaseRecommendations(input) {
  const supabase = getSupabase();
  let q = supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .ilike('location', `%${input.location}%`);

  if (input.preferences?.cuisines?.length) q = q.in('cuisine', input.preferences.cuisines);
  if (input.preferences?.activityTypes?.length) q = q.in('category', input.preferences.activityTypes);
  if (input.preferences?.priceLevel) q = q.lte('price_level', input.preferences.priceLevel);

  q = q.order('rating', { ascending: false });
  const maxItems = Math.min(input.teamSize * 3, 100);
  q = q.limit(maxItems);

  const { data, count, error } = await q;
  if (error) throw error;

  const recommendations = (data || []).map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    description: item.description,
    rating: parseFloat(item.rating || 0),
    priceLevel: item.price_level,
    location: item.location,
    image: item.image,
    cuisine: item.cuisine,
    category: item.category,
    amenities: item.amenities,
    capacity: item.capacity,
    openNow: item.open_now,
    featured: item.featured,
  }));
  return { rows: recommendations, total: count || 0 };
}

// Health check endpoint (no auth required)
router.get('/health', async (req, res) => {
  res.json({ status: 'ok', supabase: true, timestamp: new Date().toISOString() });
});

// Get metadata for activity planner
router.get('/metadata', requireAuth, async (req, res) => {
  try {
    res.json({
      availableCities: [
        'San Francisco', 'New York', 'Los Angeles', 'Chicago', 'Houston',
        'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas',
        'London', 'Paris', 'Tokyo', 'Sydney', 'Mumbai', 'Singapore',
        'Dubai', 'Hong Kong', 'Toronto', 'Amsterdam'
      ],
      activityTypes: [
        'restaurant', 'hotel', 'activity', 'entertainment', 'outdoor',
        'cultural', 'sports', 'wellness', 'adventure', 'educational'
      ],
      cuisines: [
        'Italian', 'Chinese', 'Mexican', 'Japanese', 'Indian', 'Thai', 
        'French', 'American', 'Mediterranean', 'Korean', 'Vietnamese',
        'Greek', 'Spanish', 'Brazilian', 'Lebanese', 'Turkish'
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Get recommendations (Supabase only)
router.post('/recommend', requireAuth, async (req, res) => {
  try {
    const input = recommendationSchema.parse(req.body);
    const { rows, total } = await querySupabaseRecommendations(input);
    return res.json({
      location: input.location,
      teamSize: input.teamSize,
      recommendations: rows,
      totalAvailable: total,
      stats: {
        restaurants: rows.filter(r => r.type === 'restaurant').length,
        hotels: rows.filter(r => r.type === 'hotel').length,
        activities: rows.filter(r => r.type === 'activity').length
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Shortlist management (Supabase only)
router.get('/shortlist', requireAuth, async (req, res) => {
  const userId = req.user.sub || req.user.id;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('shortlists')
      .select('activity:activities(*)')
      .eq('user_id', userId);
    if (error) throw error;
    const items = (data || []).map(row => ({
      id: row.activity.id,
      name: row.activity.name,
      type: row.activity.type,
      description: row.activity.description,
      rating: parseFloat(row.activity.rating || 0),
      priceLevel: row.activity.price_level,
      location: row.activity.location,
      image: row.activity.image,
      cuisine: row.activity.cuisine,
      category: row.activity.category,
      amenities: row.activity.amenities,
      capacity: row.activity.capacity,
      openNow: row.activity.open_now,
      featured: row.activity.featured,
    }));
    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load shortlist' });
  }
});

router.post('/shortlist', requireAuth, async (req, res) => {
  const userId = req.user.sub || req.user.id;
  const { activityId } = req.body;
  if (!activityId) return res.status(400).json({ error: 'Activity ID required' });
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('shortlists')
      .upsert({ user_id: userId, activity_id: activityId }, { onConflict: 'user_id,activity_id' });
    if (error) throw error;
    return res.json({ success: true, message: 'Added to shortlist' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to add to shortlist' });
  }
});

router.delete('/shortlist/:id', requireAuth, async (req, res) => {
  const userId = req.user.sub || req.user.id;
  const { id } = req.params;
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('shortlists')
      .delete()
      .eq('user_id', userId)
      .eq('activity_id', id);
    if (error) throw error;
    return res.json({ success: true, message: 'Removed from shortlist' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to remove from shortlist' });
  }
});

router.delete('/shortlist', requireAuth, async (req, res) => {
  const userId = req.user.sub || req.user.id;
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('shortlists').delete().eq('user_id', userId);
    if (error) throw error;
    return res.json({ success: true, message: 'Shortlist cleared' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to clear shortlist' });
  }
});

export default router; 