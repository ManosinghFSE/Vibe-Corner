import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { recommendationsService } from '../services/recommendations-service.js';
import { getSupabase } from '../services/supabase-client.js';

export const recommendationsRouter = express.Router();

function getHolidays(year) {
  // Minimal demo holiday list (can be replaced with an API)
  return [
    { id: 'newyear', name: "New Year's Day", date: `${year}-01-01`, type: 'holiday' },
    { id: 'independence', name: 'Independence Day', date: `${year}-07-04`, type: 'holiday' },
    { id: 'labor', name: 'Labor Day', date: `${year}-09-01`, type: 'holiday' },
    { id: 'thanksgiving', name: 'Thanksgiving', date: `${year}-11-28`, type: 'holiday' },
    { id: 'christmas', name: 'Christmas Day', date: `${year}-12-25`, type: 'holiday' }
  ];
}

function calcPriority(eventDateIso) {
  const daysUntil = Math.floor((new Date(eventDateIso) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 3) return 'urgent';
  if (daysUntil <= 7) return 'high';
  if (daysUntil <= 14) return 'medium';
  return 'low';
}

// Get personalized recommendations + upcoming events (birthdays/holidays)
recommendationsRouter.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const supabase = getSupabase();

    // Generate baseline holiday recs (ensure 90-day window)
    const baseline = recommendationsService.generateRecommendations(userId);

    // Birthdays within 90 days
    const { data: bdays } = await supabase
      .from('birthdays')
      .select('user_id,date,visibility');
    const users = await supabase.from('users').select('id,name');
    const nameMap = new Map((users.data || []).map(u => [u.id, u.name]));
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 90);

    const birthdays = (bdays || []).map(b => {
      const d = new Date(b.date);
      const normalized = new Date(d);
      normalized.setFullYear(now.getFullYear());
      if (normalized < now) normalized.setFullYear(now.getFullYear() + 1);
      return { id: `${b.user_id}-${b.date}` , type: 'birthday', userId: b.user_id, userName: nameMap.get(b.user_id) || 'User', date: normalized.toISOString() };
    }).filter(x => new Date(x.date) >= now && new Date(x.date) <= end);

    const holidays = getHolidays(now.getFullYear()).map(h => {
      const d = new Date(h.date);
      d.setFullYear(now.getFullYear());
      if (d < now) d.setFullYear(now.getFullYear() + 1);
      return { id: h.id, type: 'holiday', name: h.name, date: d.toISOString() };
    }).filter(x => new Date(x.date) >= now && new Date(x.date) <= end);

    // Build recommendation cards from events (birthdays + holidays)
    const eventRecs = [
      ...birthdays.map(b => ({
        id: `rec-bday-${b.id}`,
        eventId: b.userId,
        type: 'birthday',
        title: `${b.userName}'s Birthday`,
        description: `Plan something special for ${b.userName}'s upcoming birthday`,
        date: b.date,
        suggestions: [
          { item: 'Personalized gift', price: 50 },
          { item: 'Team card and cake', price: 40 },
          { item: 'Decorations', price: 30 }
        ],
        activities: [
          { name: 'Team lunch' },
          { name: 'Surprise celebration' }
        ],
        budget: 150,
        priority: calcPriority(b.date),
        animation: 'fadeIn'
      })),
      ...holidays.map(h => ({
        id: `rec-hol-${h.id}`,
        eventId: h.name,
        type: 'holiday',
        title: `${h.name} Planning`,
        description: `Get ready for ${h.name}`,
        date: h.date,
        suggestions: [
          { item: 'Party supplies', price: 60 },
          { item: 'Special menu', price: 80 },
          { item: 'Decor and lights', price: 40 }
        ],
        activities: [
          { name: 'Game night' },
          { name: 'Office celebration' }
        ],
        budget: 200,
        priority: calcPriority(h.date),
        animation: 'fadeIn'
      }))
    ];

    // Merge baseline and event-based recs, sort by date
    const recommendations = [...eventRecs, ...baseline]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ recommendations, upcomingEvents: [...birthdays, ...holidays], familyType: 'adult' });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get upcoming events for calendar integration
recommendationsRouter.get('/events', requireAuth, (req, res) => {
  try {
    const days = Number(req.query.days || 365);
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const holidays = getHolidays(now.getFullYear()).filter(h => new Date(h.date) >= now && new Date(h.date) <= end);
    res.json({ events: holidays });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default recommendationsRouter; 