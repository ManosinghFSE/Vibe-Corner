import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  ACCESS_TTL_SECONDS,
} from '../lib/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

const isProd = process.env.NODE_ENV === 'production';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res, tokenId, raw) {
  const cookieValue = `${tokenId}.${raw}`;
  res.cookie('refresh', cookieValue, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth/refresh',
    maxAge: SEVEN_DAYS_MS,
  });
}

function setSessionCookie(res, sid) {
  res.cookie('sid', sid, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('refresh', { path: '/api/auth/refresh' });
  res.clearCookie('sid', { path: '/' });
}

function parseRefreshCookie(req) {
  const value = req.cookies?.refresh;
  if (!value) return null;
  const [tokenId, raw] = String(value).split('.');
  if (!tokenId || !raw) return null;
  return { tokenId, raw };
}

async function supabaseFindUserByEmail(email) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1).single();
  if (error) return null;
  return data;
}

async function supabaseFindUserById(id) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('id', id).limit(1).single();
  if (error) return null;
  return data;
}

async function supabaseSetLastLogin(id) {
  const supabase = getSupabase();
  await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', id);
}

authRouter.post('/login', loginLimiter, async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const email = String(parsed.data.email).trim();
  const password = String(parsed.data.password).trim();

  try {
    const user = await supabaseFindUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_active === false) return res.status(403).json({ error: 'Account disabled' });
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email, name: user.name });
    const { tokenId, raw } = issueRefreshToken(user.id);
    setRefreshCookie(res, tokenId, raw);
    const { createSession } = await import('../lib/sessions.js');
    const sid = createSession(user.id, { userAgent: req.headers['user-agent'], ip: req.ip });
    setSessionCookie(res, sid);
    await supabaseSetLastLogin(user.id);
    return res.json({ accessToken, expiresIn: ACCESS_TTL_SECONDS, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatar_url } });
  } catch (e) {
    console.error('Login failed:', e?.message || e);
    return res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/logout', async (req, res) => {
  const cookie = parseRefreshCookie(req);
  if (cookie) revokeRefreshToken(cookie.tokenId);
  const sid = req.cookies?.sid;
  if (sid) {
    const { revokeSession } = await import('../lib/sessions.js');
    revokeSession(sid);
  }
  clearAuthCookies(res);
  return res.json({ success: true });
});

authRouter.post('/refresh', refreshLimiter, async (req, res) => {
  const cookie = parseRefreshCookie(req);
  if (!cookie) return res.status(401).json({ error: 'No refresh token' });
  const rotated = rotateRefreshToken(cookie.tokenId, cookie.raw);
  if (!rotated) return res.status(401).json({ error: 'Invalid refresh token' });
  setRefreshCookie(res, rotated.tokenId, rotated.raw);

  // Ensure session cookie exists and is renewed
  let sid = req.cookies?.sid;
  if (!sid) {
    const { createSession } = await import('../lib/sessions.js');
    sid = createSession(rotated.userId, { userAgent: req.headers['user-agent'], ip: req.ip });
  } else {
    const { touchSession } = await import('../lib/sessions.js');
    touchSession(sid);
  }
  setSessionCookie(res, sid);

  const u = await supabaseFindUserById(rotated.userId);
  if (!u) return res.status(401).json({ error: 'User not found' });
  const accessToken = signAccessToken({ sub: u.id, role: u.role, email: u.email, name: u.name });
  return res.json({ accessToken, expiresIn: ACCESS_TTL_SECONDS, user: { id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatar_url } });
});

authRouter.get('/me', requireAuth, (req, res) => {
  return res.json({ user: { id: req.user.sub, role: req.user.role, email: req.user.email, name: req.user.name } });
});

export default authRouter; 