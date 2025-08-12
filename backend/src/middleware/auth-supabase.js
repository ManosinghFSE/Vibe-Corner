import { createClient } from '@supabase/supabase-js';
import { getSession, touchSession } from '../lib/sessions.js';

// Initialize Supabase client
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://YOUR-PROJECT.supabase.co' 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function requireAuthSupabase(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify token with Supabase
  supabase.auth.getUser(token)
    .then(({ data: { user }, error }) => {
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Attach user to request
      req.user = {
        sub: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'member',
        name: user.user_metadata?.name
      };

      // Handle session cookie if present (optional, for sliding expiry)
      const sid = req.cookies?.sid;
      if (sid) {
        const s = getSession(sid);
        if (s && !s.revokedAt) {
          const lastSeen = new Date(s.lastSeenAt).getTime();
          if (Date.now() - lastSeen <= SESSION_IDLE_MS) {
            touchSession(sid);
            res.cookie('sid', sid, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: SESSION_IDLE_MS,
            });
          }
        }
      }

      next();
    })
    .catch(err => {
      console.error('Auth middleware error:', err);
      return res.status(401).json({ error: 'Authentication failed' });
    });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
} 