import crypto from 'crypto';

// Simple in-memory session store
// sessionId -> { userId, createdAt, lastSeenAt, userAgent, ip, revokedAt }
const sessionStore = new Map();

export function createSession(userId, meta = {}) {
  const sid = crypto.randomUUID();
  const now = new Date().toISOString();
  sessionStore.set(sid, {
    userId,
    createdAt: now,
    lastSeenAt: now,
    userAgent: meta.userAgent || null,
    ip: meta.ip || null,
    revokedAt: null,
  });
  return sid;
}

export function getSession(sessionId) {
  return sessionStore.get(sessionId) || null;
}

export function touchSession(sessionId) {
  const s = sessionStore.get(sessionId);
  if (!s || s.revokedAt) return null;
  s.lastSeenAt = new Date().toISOString();
  sessionStore.set(sessionId, s);
  return s;
}

export function revokeSession(sessionId) {
  const s = sessionStore.get(sessionId);
  if (s && !s.revokedAt) {
    s.revokedAt = new Date().toISOString();
    sessionStore.set(sessionId, s);
  }
}

export function listUserSessions(userId) {
  const items = [];
  for (const [sid, s] of sessionStore.entries()) {
    if (s.userId === userId && !s.revokedAt) items.push({ sid, ...s });
  }
  // Sort by last seen desc
  items.sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));
  return items;
} 