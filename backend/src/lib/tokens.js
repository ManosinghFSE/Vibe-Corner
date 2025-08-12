import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 hour (increased from 15 minutes)
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory hashed refresh token store: tokenId -> { userId, hashedToken, expiresAt, revokedAt }
const refreshStore = new Map();

export function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SEC });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function generateRandomToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function issueRefreshToken(userId) {
  const raw = generateRandomToken();
  const tokenId = crypto.randomUUID();
  const hashed = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  refreshStore.set(tokenId, { userId, hashedToken: hashed, expiresAt, revokedAt: null, createdAt: new Date().toISOString() });
  return { tokenId, raw, userId };
}

export function rotateRefreshToken(oldTokenId, oldRaw) {
  const rec = refreshStore.get(oldTokenId);
  if (!rec) return null;
  if (rec.revokedAt) return null;
  if (new Date(rec.expiresAt).getTime() < Date.now()) return null;
  if (rec.hashedToken !== hashToken(oldRaw)) return null;
  // Revoke old
  rec.revokedAt = new Date().toISOString();
  refreshStore.set(oldTokenId, rec);
  // Issue new
  const fresh = issueRefreshToken(rec.userId);
  return fresh; // includes userId
}

export function revokeRefreshToken(tokenId) {
  const rec = refreshStore.get(tokenId);
  if (rec && !rec.revokedAt) {
    rec.revokedAt = new Date().toISOString();
    refreshStore.set(tokenId, rec);
  }
}

export function getRefreshStore() {
  return refreshStore;
}

export const ACCESS_TTL_SECONDS = ACCESS_TOKEN_TTL_SEC;
export const REFRESH_TTL_DAYS = 7; 