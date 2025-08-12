import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const billSplitterRouter = express.Router();

// Schemas
const createGroupSchema = z.object({ name: z.string().min(1), memberIds: z.array(z.string()).min(2) });
const createBillSchema = z.object({ groupId: z.string(), title: z.string().min(1), currency: z.string().default('USD') });
const createItemSchema = z.object({ billId: z.string(), description: z.string().min(1), amount: z.number().positive(), payerId: z.string(), splits: z.array(z.object({ userId: z.string(), amount: z.number().positive() })) });

billSplitterRouter.use(requireAuth);

// Helpers for Supabase
async function dbListUserGroups(userId) {
  const supabase = getSupabase();
  const { data: gm, error } = await supabase.from('bill_group_members').select('group_id').eq('user_id', userId);
  if (error) throw error;
  const groupIds = (gm || []).map(x => x.group_id);
  if (groupIds.length === 0) return [];
  const { data: groups, error: gerr } = await supabase.from('bill_groups').select('*').in('id', groupIds);
  if (gerr) throw gerr;
  const { data: counts, error: cerr } = await supabase.from('bill_group_members').select('group_id');
  if (cerr) throw cerr;
  const countMap = new Map();
  (counts || []).forEach(c => countMap.set(c.group_id, (countMap.get(c.group_id) || 0) + 1));
  return (groups || []).map(g => ({ id: g.id, name: g.name, memberIds: [], createdBy: g.created_by, createdAt: g.created_at, memberCount: countMap.get(g.id) || 0 }));
}

async function dbCreateGroup(userId, name, memberIds) {
  const supabase = getSupabase();
  const gid = uuidv4();
  const { error: gerr } = await supabase.from('bill_groups').insert({ id: gid, name, description: null, created_by: userId });
  if (gerr) throw gerr;
  const uniqMembers = Array.from(new Set(memberIds));
  const rows = uniqMembers.map(uid => ({ group_id: gid, user_id: uid }));
  const { error: merr } = await supabase.from('bill_group_members').upsert(rows, { onConflict: 'group_id,user_id' });
  if (merr) throw merr;
  return { id: gid, name, memberIds: uniqMembers, createdBy: userId, createdAt: new Date().toISOString() };
}

async function dbGetGroup(groupId) {
  const supabase = getSupabase();
  const { data: g, error } = await supabase.from('bill_groups').select('*').eq('id', groupId).single();
  if (error) return null;
  const { data: members } = await supabase.from('bill_group_members').select('user_id').eq('group_id', groupId);
  const memberIds = (members || []).map(m => m.user_id);
  const { data: billList } = await supabase.from('bills').select('*').eq('group_id', groupId);
  return { group: { id: g.id, name: g.name, memberIds, createdBy: g.created_by, createdAt: g.created_at }, bills: billList || [] };
}

async function dbCreateBill(userId, groupId, title, currency) {
  const supabase = getSupabase();
  const bid = uuidv4();
  const { error } = await supabase.from('bills').insert({ id: bid, group_id: groupId, title, currency, created_by: userId });
  if (error) throw error;
  return { id: bid, groupId, title, currency, createdBy: userId, createdAt: new Date().toISOString() };
}

async function dbGetBill(billId) {
  const supabase = getSupabase();
  const { data: bill, error } = await supabase.from('bills').select('*').eq('id', billId).single();
  if (error) return null;
  const { data: rawItems } = await supabase.from('bill_items').select('*').eq('bill_id', billId);
  const groupId = bill.group_id;
  const { data: members } = await supabase.from('bill_group_members').select('user_id').eq('group_id', groupId);
  const group = { memberIds: (members || []).map(m => m.user_id) };
  const items = (rawItems || []).map(i => normalizeBillItem({ id: i.id, billId: i.bill_id, description: i.description, amount: Number(i.amount), payerId: i.payer_id, splits: i.splits, createdAt: i.created_at }, group));
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return { bill: { id: bill.id, groupId: bill.group_id, title: bill.title, currency: bill.currency, createdBy: bill.created_by, createdAt: bill.created_at, total, itemCount: items.length }, items };
}

async function dbAddItem(billId, description, amount, payerId, splits) {
  const supabase = getSupabase();
  const id = uuidv4();
  const { error } = await supabase.from('bill_items').insert({ id, bill_id: billId, description, amount, payer_id: payerId, splits });
  if (error) throw error;
  return { id, billId, description, amount, payerId, splits, createdAt: new Date().toISOString() };
}

// Create a group
billSplitterRouter.post('/groups', async (req, res) => {
  try {
    const data = createGroupSchema.parse(req.body);
    const userId = req.user.sub || req.user.id;
    const group = await dbCreateGroup(userId, data.name, data.memberIds);
    return res.status(201).json({ group });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all groups for the authenticated user
billSplitterRouter.get('/groups', async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const groups = await dbListUserGroups(userId);
    return res.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get group details
billSplitterRouter.get('/groups/:id', async (req, res) => {
  const result = await dbGetGroup(req.params.id);
  if (!result) return res.status(404).json({ error: 'Group not found' });
  return res.json({ group: result.group, bills: result.bills, memberCount: result.group.memberIds.length });
});

// Get group members with user details
billSplitterRouter.get('/groups/:id/members', async (req, res) => {
  try {
    const groupId = req.params.id;
    const supabase = getSupabase();
    
    // Get group members
    const { data: members, error: memError } = await supabase
      .from('bill_group_members')
      .select('user_id')
      .eq('group_id', groupId);
    
    if (memError) throw memError;
    
    if (!members || members.length === 0) {
      return res.json({ members: [] });
    }
    
    const userIds = members.map(m => m.user_id);
    
    // Get user details
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);
    
    if (userError) throw userError;
    
    return res.json({ members: users || [] });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// Delete a group
billSplitterRouter.delete('/groups/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.sub || req.user.id;
    const supabase = getSupabase();
    
    // Check if user is a member of the group
    const { data: membership, error: memError } = await supabase
      .from('bill_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
    
    if (memError || !membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }
    
    // Delete all related data (cascade delete)
    // First delete bill items
    const { data: bills } = await supabase
      .from('bills')
      .select('id')
      .eq('group_id', groupId);
    
    if (bills && bills.length > 0) {
      const billIds = bills.map(b => b.id);
      await supabase
        .from('bill_items')
        .delete()
        .in('bill_id', billIds);
    }
    
    // Delete bills
    await supabase
      .from('bills')
      .delete()
      .eq('group_id', groupId);
    
    // Delete group members
    await supabase
      .from('bill_group_members')
      .delete()
      .eq('group_id', groupId);
    
    // Delete the group
    await supabase
      .from('bill_groups')
      .delete()
      .eq('id', groupId);
    
    return res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Get all bills for the authenticated user
billSplitterRouter.get('/bills', async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const supabase = getSupabase();
    
    // Get all groups the user is a member of
    const { data: memberships, error: memError } = await supabase
      .from('bill_group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    if (memError) throw memError;
    
    if (!memberships || memberships.length === 0) {
      return res.json({ bills: [] });
    }
    
    const groupIds = memberships.map(m => m.group_id);
    
    // Get all bills from those groups
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });
    
    if (billsError) throw billsError;
    
    // Calculate totals for each bill
    const billsWithTotals = await Promise.all((bills || []).map(async (bill) => {
      const { data: items } = await supabase
        .from('bill_items')
        .select('amount')
        .eq('bill_id', bill.id);
      
      const total = (items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      
      return {
        id: bill.id,
        groupId: bill.group_id,
        title: bill.title,
        currency: bill.currency,
        createdBy: bill.created_by,
        createdAt: bill.created_at,
        total,
        itemCount: items?.length || 0
      };
    }));
    
    return res.json({ bills: billsWithTotals });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Debug endpoint to ensure data exists
billSplitterRouter.post('/debug/ensure-data', async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const supabase = getSupabase();
    
    // Check if user has any groups
    const { data: memberships } = await supabase
      .from('bill_group_members')
      .select('group_id')
      .eq('user_id', userId);
    
    if (!memberships || memberships.length === 0) {
      // Create a demo group for the user
      const groupId = uuidv4();
      await supabase.from('bill_groups').insert({
        id: groupId,
        name: 'Demo Group',
        description: 'Auto-created demo group',
        created_by: userId
      });
      
      await supabase.from('bill_group_members').insert({
        group_id: groupId,
        user_id: userId
      });
      
      // Create a demo bill
      const billId = uuidv4();
      await supabase.from('bills').insert({
        id: billId,
        group_id: groupId,
        title: 'Demo Bill',
        currency: 'USD',
        created_by: userId
      });
      
      return res.json({ 
        message: 'Demo data created',
        groupId,
        billId
      });
    }
    
    return res.json({ message: 'User already has data' });
  } catch (error) {
    console.error('Error ensuring data:', error);
    return res.status(500).json({ error: 'Failed to ensure data' });
  }
});

// Create a bill
billSplitterRouter.post('/bills', async (req, res) => {
  try {
    const data = createBillSchema.parse(req.body);
    const userId = req.user.sub || req.user.id;
    const bill = await dbCreateBill(userId, data.groupId, data.title, data.currency);
    return res.status(201).json({ bill });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get bill details
billSplitterRouter.get('/bills/:id', async (req, res) => {
  const result = await dbGetBill(req.params.id);
  if (!result) return res.status(404).json({ error: 'Bill not found' });
  return res.json(result);
});

// Add item to bill
billSplitterRouter.post('/bills/:id/items', async (req, res) => {
  try {
    const data = createItemSchema.parse({ ...req.body, billId: req.params.id });
    const item = await dbAddItem(data.billId, data.description, data.amount, data.payerId, data.splits);
    return res.status(201).json({ item });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// NEW: Calculate settlements for a bill
billSplitterRouter.post('/settlements', async (req, res) => {
  try {
    const schema = z.object({ billId: z.string().min(1) });
    const { billId } = schema.parse(req.body);

    const result = await dbGetBill(billId);
    if (!result) return res.status(404).json({ error: 'Bill not found' });

    const items = Array.isArray(result.items) ? result.items : [];

    // Compute per-user balances: positive means they should receive money
    const balanceMap = new Map();

    for (const item of items) {
      const amount = Number(item.amount) || 0;
      const payerId = item.payerId;
      if (payerId) {
        balanceMap.set(payerId, (balanceMap.get(payerId) || 0) + amount);
      }

      const splits = Array.isArray(item.splits) ? item.splits : [];
      for (const split of splits) {
        const uid = split.userId;
        const share = Number(split.amount) || 0;
        balanceMap.set(uid, (balanceMap.get(uid) || 0) - share);
      }
    }

    const settlements = Array.from(balanceMap.entries()).map(([userId, balance]) => ({ userId, balance: Math.round(balance * 100) / 100 }));
    const transactions = calculateOptimalTransactions(settlements.map(s => ({ ...s })));

    return res.json({ settlements, transactions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors?.[0]?.message || 'Invalid request' });
    }
    console.error('Error calculating settlements:', error);
    return res.status(500).json({ error: 'Failed to calculate settlements' });
  }
});

function calculateOptimalTransactions(settlements) {
  const transactions = [];
  const creditors = settlements.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = settlements.filter(s => s.balance < 0).sort((a, b) => a.balance - b.balance);
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balance, -debtor.balance);
    if (amount > 0.01) { transactions.push({ from: debtor.userId, to: creditor.userId, amount: Math.round(amount * 100) / 100 }); }
    creditor.balance -= amount;
    debtor.balance += amount;
    if (creditor.balance < 0.01) i++;
    if (debtor.balance > -0.01) j++;
  }
  return transactions;
}

function normalizeBillItem(rawItem, group) {
  const amount = typeof rawItem.amount === 'number' ? rawItem.amount : (typeof rawItem.price === 'number' ? rawItem.price : 0);
  const description = rawItem.description ?? rawItem.name ?? 'Item';
  const payerId = rawItem.payerId ?? rawItem.paidBy ?? (group?.memberIds?.[0] || 'unknown');
  let splits = rawItem.splits;
  if (!Array.isArray(splits)) {
    const participants = Array.isArray(rawItem.sharedBy) && rawItem.sharedBy.length > 0 ? rawItem.sharedBy : (Array.isArray(group?.memberIds) ? group.memberIds : []);
    const perPerson = participants.length > 0 ? Math.round((amount / participants.length) * 100) / 100 : 0;
    splits = participants.map(userId => ({ userId, amount: perPerson }));
  }
  return { id: rawItem.id, billId: rawItem.billId, description, amount, payerId, splits, createdAt: rawItem.createdAt };
} 