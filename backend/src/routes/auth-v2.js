import express from 'express';

export const authV2Router = express.Router();

// Deprecated; kept for backward compatibility to avoid 404s and import errors
authV2Router.post('/login', (req, res) => {
  return res.status(410).json({ error: 'Deprecated. Use /api/auth/login' });
});

export default authV2Router; 