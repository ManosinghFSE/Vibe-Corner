import request from 'supertest';
import express from 'express';
import { billSplitterRouter } from '../../routes/billsplitter.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { sub: 'user-123', email: 'test@example.com' };
    next();
  }
}));

jest.mock('../../services/supabase-client.js', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn()
        }))
      })),
      insert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn()
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }))
}));

describe('Bill Splitter Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/billsplitter', billSplitterRouter);
    jest.clearAllMocks();
  });

  describe('GET /billsplitter/bills', () => {
    it('should fetch user bills successfully', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const mockBills = [
        {
          id: 'bill-1',
          title: 'Dinner at Restaurant',
          amount: 120.50,
          created_by: 'user-123',
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: mockBills, error: null })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .get('/billsplitter/bills');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBills);
    });

    it('should handle database errors', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .get('/billsplitter/bills');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /billsplitter/bills', () => {
    it('should create a new bill successfully', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const newBill = {
        title: 'New Restaurant Bill',
        amount: 85.00,
        description: 'Team dinner',
        participants: ['user-123', 'user-456']
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          insert: jest.fn().mockResolvedValue({ data: [{ id: 'new-bill-id', ...newBill }], error: null })
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .post('/billsplitter/bills')
        .send(newBill);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newBill.title);
    });

    it('should validate required fields', async () => {
      const invalidBill = {
        amount: 85.00
        // missing title
      };

      const response = await request(app)
        .post('/billsplitter/bills')
        .send(invalidBill);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate amount is positive', async () => {
      const invalidBill = {
        title: 'Test Bill',
        amount: -10.00
      };

      const response = await request(app)
        .post('/billsplitter/bills')
        .send(invalidBill);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /billsplitter/bills/:id', () => {
    it('should update a bill successfully', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const updateData = {
        title: 'Updated Restaurant Bill',
        amount: 95.00
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: [{ id: 'bill-1', ...updateData }], error: null })
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .put('/billsplitter/bills/bill-1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
    });
  });

  describe('DELETE /billsplitter/bills/:id', () => {
    it('should delete a bill successfully', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const mockSupabase = {
        from: jest.fn(() => ({
          delete: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null })
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const response = await request(app)
        .delete('/billsplitter/bills/bill-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Bill deleted');
    });
  });
}); 