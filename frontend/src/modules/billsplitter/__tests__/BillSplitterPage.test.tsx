import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BillSplitterPage from '../BillSplitterPage';

// Mock the AuthContext
const mockAuth = {
  user: { id: '123', email: 'test@example.com', name: 'Test User', role: 'user' },
  accessToken: 'mock-token',
  isInitialized: true,
  getAuthHeader: () => ({ Authorization: 'Bearer mock-token' })
};

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => mockAuth
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('BillSplitterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('bill list', () => {
    it('should display list of bills', async () => {
      const mockBills = [
        {
          id: '1',
          title: 'Restaurant Dinner',
          amount: 120.50,
          description: 'Team dinner at Italian restaurant',
          created_by: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          participants: ['user-123', 'user-456']
        },
        {
          id: '2',
          title: 'Coffee Shop',
          amount: 45.00,
          description: 'Morning coffee meeting',
          created_by: 'user-456',
          created_at: '2024-01-02T00:00:00Z',
          participants: ['user-123', 'user-456', 'user-789']
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBills)
      });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        expect(screen.getByText('Restaurant Dinner')).toBeInTheDocument();
        expect(screen.getByText('Coffee Shop')).toBeInTheDocument();
        expect(screen.getByText('$120.50')).toBeInTheDocument();
        expect(screen.getByText('$45.00')).toBeInTheDocument();
      });
    });

    it('should show empty state when no bills exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        expect(screen.getByText(/no bills found/i)).toBeInTheDocument();
      });
    });
  });

  describe('create new bill', () => {
    it('should open create bill form when button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        const createButton = screen.getByText(/create new bill/i);
        expect(createButton).toBeInTheDocument();
      });

      const createButton = screen.getByText(/create new bill/i);
      await userEvent.click(createButton);

      expect(screen.getByText(/bill title/i)).toBeInTheDocument();
      expect(screen.getByText(/amount/i)).toBeInTheDocument();
    });

    it('should create a new bill with valid data', async () => {
      const newBill = {
        id: '3',
        title: 'New Bill',
        amount: 75.00,
        description: 'Test bill',
        created_by: 'user-123'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newBill)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([newBill])
        });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        const createButton = screen.getByText(/create new bill/i);
        userEvent.click(createButton);
      });

      // Fill out the form
      const titleInput = screen.getByLabelText(/bill title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await userEvent.type(titleInput, 'New Bill');
      await userEvent.type(amountInput, '75.00');
      await userEvent.type(descriptionInput, 'Test bill');

      const submitButton = screen.getByText(/create bill/i);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/billsplitter/bills',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token'
            })
          })
        );
      });
    });

    it('should validate required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        const createButton = screen.getByText(/create new bill/i);
        userEvent.click(createButton);
      });

      const submitButton = screen.getByText(/create bill/i);
      await userEvent.click(submitButton);

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
  });

  describe('bill actions', () => {
    it('should allow editing a bill', async () => {
      const mockBills = [
        {
          id: '1',
          title: 'Restaurant Dinner',
          amount: 120.50,
          description: 'Team dinner',
          created_by: 'user-123'
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBills)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockBills[0], title: 'Updated Dinner' })
        });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        const editButton = screen.getByText(/edit/i);
        expect(editButton).toBeInTheDocument();
      });

      const editButton = screen.getByText(/edit/i);
      await userEvent.click(editButton);

      const titleInput = screen.getByDisplayValue('Restaurant Dinner');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Dinner');

      const saveButton = screen.getByText(/save/i);
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/billsplitter/bills/1',
          expect.objectContaining({
            method: 'PUT'
          })
        );
      });
    });

    it('should allow deleting a bill', async () => {
      const mockBills = [
        {
          id: '1',
          title: 'Restaurant Dinner',
          amount: 120.50,
          created_by: 'user-123'
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBills)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Bill deleted' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        const deleteButton = screen.getByText(/delete/i);
        expect(deleteButton).toBeInTheDocument();
      });

      const deleteButton = screen.getByText(/delete/i);
      await userEvent.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/billsplitter/bills/1',
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });
  });

  describe('bill splitting', () => {
    it('should calculate split amounts correctly', async () => {
      const mockBill = {
        id: '1',
        title: 'Restaurant Dinner',
        amount: 120.00,
        participants: ['user-123', 'user-456', 'user-789']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockBill])
      });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        expect(screen.getByText('$40.00')).toBeInTheDocument(); // 120 / 3
      });
    });

    it('should handle uneven splits', async () => {
      const mockBill = {
        id: '1',
        title: 'Restaurant Dinner',
        amount: 100.00,
        participants: ['user-123', 'user-456', 'user-789']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockBill])
      });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        expect(screen.getByText('$33.33')).toBeInTheDocument(); // 100 / 3
      });
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch bills'));

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading bills/i)).toBeInTheDocument();
      });
    });

    it('should handle create bill errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid bill data' })
        });

      renderWithRouter(<BillSplitterPage />);

      await waitFor(() => {
        const createButton = screen.getByText(/create new bill/i);
        userEvent.click(createButton);
      });

      const titleInput = screen.getByLabelText(/bill title/i);
      const amountInput = screen.getByLabelText(/amount/i);

      await userEvent.type(titleInput, 'Test Bill');
      await userEvent.type(amountInput, '50.00');

      const submitButton = screen.getByText(/create bill/i);
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid bill data/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading spinner while fetching bills', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<BillSplitterPage />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
}); 