import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../services/supabase-client.js';

export const authSupabaseRouter = Router();

// Validate environment variables
if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'https://YOUR-PROJECT.supabase.co') {
  console.warn('⚠️  SUPABASE_URL not configured. Supabase auth routes will not work.');
  console.warn('   Please update your .env file with your Supabase project details.');
  
  // Return empty router if not configured
  authSupabaseRouter.get('*', (req, res) => {
    res.status(503).json({ 
      error: 'Supabase auth not configured',
      message: 'Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your .env file'
    });
  });
} else {
  // Initialize Supabase Auth client only if configured
  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // Keep your existing rate limiters
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

  // Keep your existing session cookie helpers
  const isProd = process.env.NODE_ENV === 'production';
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
    res.clearCookie('sid', { path: '/' });
  }

  // Login with Supabase Auth but custom session management
  authSupabaseRouter.post('/login', loginLimiter, async (req, res) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    
    const email = parsed.data.email.trim();
    const password = parsed.data.password.trim();

    try {
      // First, check if user needs legacy password migration
      const supabaseData = getSupabase();
      const { data: user } = await supabaseData
        .from('users')
        .select('id, email, password_hash, name, role, avatar_url, is_active')
        .eq('email', email)
        .single();

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.is_active === false) {
        return res.status(403).json({ error: 'Account disabled' });
      }

      // Check for legacy password migration
      const { data: migration } = await supabaseData
        .from('auth_migration')
        .select('legacy_password_hash, password_updated')
        .eq('user_id', user.id)
        .single();

      let authResult;

      if (migration && !migration.password_updated) {
        // Verify against legacy password
        const legacyValid = bcrypt.compareSync(password, migration.legacy_password_hash);
        if (!legacyValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update Supabase Auth password
        const { error: updateError } = await supabaseAuth.auth.admin.updateUserById(
          user.id,
          { password }
        );

        if (!updateError) {
          // Mark password as updated
          await supabaseData
            .from('auth_migration')
            .update({ password_updated: true })
            .eq('user_id', user.id);
        }

        // Sign in with Supabase using the new password
        authResult = await supabaseAuth.auth.signInWithPassword({ email, password });
      } else {
        // Normal Supabase Auth login
        authResult = await supabaseAuth.auth.signInWithPassword({ email, password });
      }

      if (authResult.error) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { data: { session: supabaseSession } } = authResult;

      // Create your custom session (keep existing session management)
      const { createSession } = await import('../lib/sessions.js');
      const sid = createSession(user.id, { 
        userAgent: req.headers['user-agent'], 
        ip: req.ip 
      });
      setSessionCookie(res, sid);

      // Update last login
      await supabaseData
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

      // Return Supabase access token and user info
      return res.json({
        accessToken: supabaseSession.access_token,
        refreshToken: supabaseSession.refresh_token,
        expiresIn: supabaseSession.expires_in,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // Refresh token using Supabase
  authSupabaseRouter.post('/refresh', refreshLimiter, async (req, res) => {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    try {
      // Use Supabase to refresh the token
      const { data, error } = await supabaseAuth.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Get user details
      const supabaseData = getSupabase();
      const { data: user } = await supabaseData
        .from('users')
        .select('id, name, email, role, avatar_url')
        .eq('id', data.user.id)
        .single();

      // Renew or create session cookie
      let sid = req.cookies?.sid;
      if (!sid) {
        const { createSession } = await import('../lib/sessions.js');
        sid = createSession(data.user.id, { 
          userAgent: req.headers['user-agent'], 
          ip: req.ip 
        });
      } else {
        const { touchSession } = await import('../lib/sessions.js');
        touchSession(sid);
      }
      setSessionCookie(res, sid);

      return res.json({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        user: user || {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
          role: data.user.user_metadata?.role || 'member',
          avatarUrl: data.user.user_metadata?.avatar_url
        }
      });

    } catch (error) {
      console.error('Refresh error:', error);
      return res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  // Logout - revoke Supabase session and clear custom session
  authSupabaseRouter.post('/logout', async (req, res) => {
    try {
      // Get the access token from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        
        // Sign out from Supabase
        await supabaseAuth.auth.admin.signOut(token);
      }

      // Clear custom session
      const sid = req.cookies?.sid;
      if (sid) {
        const { revokeSession } = require('../lib/sessions.js');
        revokeSession(sid);
      }
      
      clearAuthCookies(res);
      return res.json({ success: true });

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear cookies even if Supabase logout fails
      clearAuthCookies(res);
      return res.json({ success: true });
    }
  });

  // Get current user info using Supabase token
  authSupabaseRouter.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);

    try {
      // Verify token with Supabase
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get full user details from database
      const supabaseData = getSupabase();
      const { data: userData } = await supabaseData
        .from('users')
        .select('id, name, email, role, avatar_url')
        .eq('id', user.id)
        .single();

      return res.json({
        user: userData || {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          role: user.user_metadata?.role || 'member',
          avatarUrl: user.user_metadata?.avatar_url
        }
      });

    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ error: 'Failed to get user info' });
    }
  });
} // Close the else block for Supabase configuration check

export default authSupabaseRouter; 