import { jest } from '@jest/globals';
import { requireAuth, requireRole } from '../../middleware/auth.js';

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should pass through with valid token', async () => {
      const jwt = await import('jsonwebtoken');
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };

      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockPayload);

      requireAuth(req, res, next);

      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authorization required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      req.headers.authorization = 'InvalidFormat token';

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token format' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', async () => {
      const jwt = await import('jsonwebtoken');
      
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const jwt = await import('jsonwebtoken');
      
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      req.user = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };
    });

    it('should pass through when user has required role', () => {
      const middleware = requireRole('user');
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass through when user has admin role for any requirement', () => {
      req.user.role = 'admin';
      const middleware = requireRole('user');
      
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject when user lacks required role', () => {
      req.user.role = 'user';
      const middleware = requireRole('admin');
      
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when no user is set', () => {
      req.user = null;
      const middleware = requireRole('user');
      
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple role requirements', () => {
      const middleware = requireRole(['admin', 'moderator']);
      
      // Should pass with admin role
      req.user.role = 'admin';
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset mocks
      jest.clearAllMocks();

      // Should pass with moderator role
      req.user.role = 'moderator';
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset mocks
      jest.clearAllMocks();

      // Should fail with user role
      req.user.role = 'user';
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
}); 