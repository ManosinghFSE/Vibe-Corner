import { verifyAccessToken } from '../lib/tokens.js';
import { getSession, touchSession } from '../lib/sessions.js';

const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days idle timeout (matches session cookie)

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = verifyAccessToken(token);

    // Enforce sliding session using sid cookie
    const sid = req.cookies?.sid;
    if (!sid) {
      // Don't fail if session is missing, just validate token
      req.user = payload;
      return next();
    }
    
    const s = getSession(sid);
    if (s && !s.revokedAt) {
      const lastSeen = new Date(s.lastSeenAt).getTime();
      if (Date.now() - lastSeen <= SESSION_IDLE_MS) {
        // Touch session and renew sid cookie with sliding window
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

    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
} 