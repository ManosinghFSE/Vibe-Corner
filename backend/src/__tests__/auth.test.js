import request from 'supertest';
import express from 'express';
import { authRouter } from '../routes/auth.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../services/supabase-client.js', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}));

jest.mock('bcryptjs', () => ({
  compareSync: jest.fn()
}));

jest.mock('../lib/tokens.js', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  issueRefreshToken: jest.fn(() => ({ tokenId: 'mock-token-id', raw: 'mock-raw-token' })),
  ACCESS_TTL_SECONDS: 3600
}));

jest.mock('../lib/sessions.js', () => ({
  createSession: jest.fn(() => 'mock-session-id')
}));

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should successfully log in with valid credentials', async () => {
      const bcrypt = await import('bcryptjs');
      const { getSupabase } = await import('../services/supabase-client.js');
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        password_hash: 'hashed-password',
        is_active: true,
        avatar_url: null
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null })
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);
      bcrypt.compareSync.mockReturnValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid payload');
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid payload');
    });

    it('should reject non-existent user', async () => {
      const { getSupabase } = await import('../services/supabase-client.js');
      
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const { getSupabase } = await import('../services/supabase-client.js');
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        is_active: false
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Account disabled');
    });

    it('should reject wrong password', async () => {
      const bcrypt = await import('bcryptjs');
      const { getSupabase } = await import('../services/supabase-client.js');
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        is_active: true
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);
      bcrypt.compareSync.mockReturnValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully log out', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', 'vibe_refresh=mock-token; vibe_session=mock-session');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out');
    });
  });
}); 