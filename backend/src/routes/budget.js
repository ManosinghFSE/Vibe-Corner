import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const budgetRouter = express.Router();

budgetRouter.use(requireAuth);

// Ensure user has at least one team (mapped to bill_groups) and a demo budget
budgetRouter.post('/debug/ensure-access', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.sub || req.user.id;

    // Ensure team membership
    let teamId = null;
    const { data: existing } = await supabase
      .from('bill_group_members')
      .select('group_id')
      .eq('user_id', userId)
      .limit(1);

    if (!existing || existing.length === 0) {
      teamId = uuidv4();
      await supabase.from('bill_groups').insert({ id: teamId, name: 'My Team', description: null, created_by: userId });
      await supabase.from('bill_group_members').insert({ group_id: teamId, user_id: userId });
    } else {
      teamId = existing[0].group_id;
    }

    // Seed a demo budget if none exists for this team
    const { data: existingBudgets } = await supabase
      .from('budgets')
      .select('id')
      .eq('team_id', teamId)
      .limit(1);

    if (!existingBudgets || existingBudgets.length === 0) {
      const now = new Date();
      const bId = uuidv4();
      const period = 'month';
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await supabase.from('budgets').insert({
        id: bId,
        team_id: teamId,
        name: `Team Budget ${year}-${String(month).padStart(2, '0')}`,
        period,
        year,
        month,
        quarter: Math.ceil(month / 3),
        currency: 'USD',
        created_by: userId
      });

      // Categories
      const catOps = [
        { name: 'Food & Drinks', limit: 500 },
        { name: 'Travel', limit: 800 },
        { name: 'Gifts', limit: 300 }
      ].map(c => ({ id: uuidv4(), budget_id: bId, name: c.name, limit: c.limit }));
      await supabase.from('budget_categories').insert(catOps);

      // Expenses
      const todayStr = new Date().toISOString().split('T')[0];
      const [foodCat, travelCat] = catOps;
      const expOps = [
        { id: uuidv4(), budget_id: bId, category_id: foodCat.id, amount: 120.5, description: 'Team lunch', date: todayStr, created_by: userId, receipts: [] },
        { id: uuidv4(), budget_id: bId, category_id: travelCat.id, amount: 220, description: 'Taxi to client site', date: todayStr, created_by: userId, receipts: [] }
      ];
      await supabase.from('budget_expenses').insert(expOps);
    }

    res.json({ ok: true });
  } catch (e) {
    // Still return ok to avoid blocking UI; seeding is best-effort
    res.json({ ok: true });
  }
});

// List budgets for user's teams
budgetRouter.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.sub || req.user.id;
    const { period, year } = req.query;

    const { data: memberships, error: mErr } = await supabase.from('bill_group_members').select('group_id').eq('user_id', userId);
    if (mErr) throw mErr;
    const groupIds = (memberships || []).map(m => m.group_id);
    if (groupIds.length === 0) return res.json({ budgets: [] });

    let sel = supabase.from('budgets').select('*').in('team_id', groupIds).order('created_at', { ascending: false });
    if (period) sel = sel.eq('period', String(period));
    if (year) sel = sel.eq('year', Number(year));
    const { data: budgets, error: bErr } = await sel;
    if (bErr) throw bErr;

    const budgetIds = (budgets || []).map(b => b.id);
    let sumLimits = new Map();
    let sumSpent = new Map();
    let teamNames = new Map();

    if (budgetIds.length > 0) {
      const { data: catAgg } = await supabase.from('budget_categories').select('budget_id, limit').in('budget_id', budgetIds);
      (catAgg || []).forEach(r => sumLimits.set(r.budget_id, (sumLimits.get(r.budget_id) || 0) + Number(r.limit || 0)));

      const { data: expAgg } = await supabase.from('budget_expenses').select('budget_id, amount').in('budget_id', budgetIds);
      (expAgg || []).forEach(r => sumSpent.set(r.budget_id, (sumSpent.get(r.budget_id) || 0) + Number(r.amount || 0)));

      const { data: groups } = await supabase.from('bill_groups').select('id,name').in('id', (budgets || []).map(b => b.team_id));
      (groups || []).forEach(g => teamNames.set(g.id, g.name));
    }

    const result = (budgets || []).map(b => ({
      id: b.id,
      teamId: b.team_id,
      teamName: teamNames.get(b.team_id) || 'Team',
      name: b.name,
      period: b.period,
      year: b.year,
      month: b.month || undefined,
      quarter: b.quarter || undefined,
      currency: b.currency || 'USD',
      totalLimit: sumLimits.get(b.id) || 0,
      totalSpent: sumSpent.get(b.id) || 0,
      createdAt: b.created_at,
    }));

    return res.json({ budgets: result });
  } catch (e) {
    console.error('Budget list failed:', e?.message || e);
    return res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Create budget
budgetRouter.post('/budgets', async (req, res) => {
  try {
    const supabase = getSupabase();
    const userId = req.user.sub || req.user.id;
    const { teamId, name, period, year, month, quarter } = req.body || {};

    // Determine team: prefer provided valid team; else first membership
    let selectedTeamId = teamId;
    if (selectedTeamId) {
      const { data: g } = await supabase.from('bill_groups').select('id').eq('id', selectedTeamId).limit(1);
      if (!g || g.length === 0) selectedTeamId = null;
    }
    if (!selectedTeamId) {
      const { data: membership } = await supabase.from('bill_group_members').select('group_id').eq('user_id', userId).limit(1);
      selectedTeamId = membership && membership[0] ? membership[0].group_id : null;
    }
    if (!selectedTeamId) return res.status(400).json({ error: 'No team available' });

    const id = uuidv4();
    const payload = { id, team_id: selectedTeamId, name, period, year, month: month || null, quarter: quarter || null, currency: 'USD', created_by: userId };
    const { error } = await supabase.from('budgets').insert(payload);
    if (error) throw error;

    return res.status(201).json({ budget: { id, teamId: selectedTeamId, teamName: undefined, name, period, year, month, quarter, currency: 'USD', totalLimit: 0, totalSpent: 0, createdAt: new Date().toISOString() } });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to create budget' });
  }
});

// Get budget details
budgetRouter.get('/budgets/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const budgetId = req.params.id;

    const { data: cats } = await supabase.from('budget_categories').select('*').eq('budget_id', budgetId);
    const { data: exps } = await supabase.from('budget_expenses').select('*').eq('budget_id', budgetId).order('date', { ascending: false }).limit(50);

    // Aggregate spend per category and budget
    const spentByCat = new Map();
    let totalSpent = 0;
    (exps || []).forEach(e => {
      totalSpent += Number(e.amount || 0);
      if (e.category_id) spentByCat.set(e.category_id, (spentByCat.get(e.category_id) || 0) + Number(e.amount || 0));
    });

    let totalLimit = 0;
    const categories = (cats || []).map(c => {
      const limit = Number(c.limit || 0);
      totalLimit += limit;
      const spent = Number(spentByCat.get(c.id) || 0);
      const utilization = limit > 0 ? (spent / limit) * 100 : 0;
      return { id: c.id, budgetId: c.budget_id, name: c.name, limit, spent, utilization, remaining: limit - spent };
    });

    const recentExpenses = (exps || []).map(e => ({ id: e.id, budgetId: e.budget_id, categoryId: e.category_id, amount: Number(e.amount || 0), description: e.description, date: e.date, createdBy: e.created_by, receipts: e.receipts || [] }));

    const summary = { totalLimit, totalSpent, utilization: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0, categoriesOverBudget: categories.filter(c => c.spent > c.limit).length };

    return res.json({ categories, recentExpenses, summary });
  } catch (e) {
    console.error('Budget details failed:', e?.message || e);
    return res.status(500).json({ error: 'Failed to fetch budget details' });
  }
});

// Add category
budgetRouter.post('/budgets/:id/categories', async (req, res) => {
  try {
    const supabase = getSupabase();
    const budgetId = req.params.id;
    const { name, limit } = req.body || {};
    const id = uuidv4();
    const { error } = await supabase.from('budget_categories').insert({ id, budget_id: budgetId, name, limit });
    if (error) throw error;
    return res.status(201).json({ category: { id, budgetId, name, limit: Number(limit || 0) } });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to add category' });
  }
});

// Add expense
budgetRouter.post('/budgets/:id/expenses', async (req, res) => {
  try {
    const supabase = getSupabase();
    const budgetId = req.params.id;
    const userId = req.user.sub || req.user.id;
    const { categoryId, amount, description, date } = req.body || {};
    const id = uuidv4();
    const row = { id, budget_id: budgetId, category_id: categoryId, amount, description, date, created_by: userId, receipts: [] };
    const { error } = await supabase.from('budget_expenses').insert(row);
    if (error) throw error;
    return res.status(201).json({ expense: { id, budgetId, categoryId, amount: Number(amount || 0), description, date, createdBy: userId, receipts: [] } });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to add expense' });
  }
});

// Export CSV
budgetRouter.get('/budgets/:id/export', async (req, res) => {
  try {
    const supabase = getSupabase();
    const budgetId = req.params.id;
    const { data: exps, error } = await supabase.from('budget_expenses').select('*').eq('budget_id', budgetId).order('date', { ascending: false });
    if (error) throw error;
    const rows = exps || [];
    const csv = [
      'Date,Category,Description,Amount,Created By',
      ...rows.map(e => {
        const date = e.date ? new Date(e.date).toISOString().split('T')[0] : '';
        const amount = Number(e.amount || 0);
        const desc = (e.description || '').replace(/"/g, '""');
        return `${date},${e.category_id},"${desc}",${amount},${e.created_by}`;
      })
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="budget-expenses.csv"');
    res.send(csv);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to export budget' });
  }
}); 