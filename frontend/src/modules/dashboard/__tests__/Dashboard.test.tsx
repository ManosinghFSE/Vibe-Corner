import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// Mock the AuthContext
const mockAuth = {
  user: { id: '123', email: 'test@example.com', name: 'Test User', role: 'user' },
  accessToken: 'mock-token',
  isInitialized: true,
  login: vi.fn(),
  logout: vi.fn(),
  getAuthHeader: () => ({ Authorization: 'Bearer mock-token' })
};

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => mockAuth
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('rendering', () => {
    it('should render dashboard with user greeting', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // birthdays
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]), // recommendations
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });

    it('should render all dashboard modules', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/activity planner/i)).toBeInTheDocument();
        expect(screen.getByText(/bill splitter/i)).toBeInTheDocument();
        expect(screen.getByText(/meeting mind/i)).toBeInTheDocument();
        expect(screen.getByText(/memory lane/i)).toBeInTheDocument();
        expect(screen.getByText(/skill swap/i)).toBeInTheDocument();
      });
    });
  });

  describe('upcoming birthdays', () => {
    it('should display upcoming birthdays', async () => {
      const mockBirthdays = [
        {
          id: '1',
          name: 'John Doe',
          birthday: '1990-12-25',
          days_until: 5
        },
        {
          id: '2',
          name: 'Jane Smith',
          birthday: '1985-01-01',
          days_until: 10
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBirthdays),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText(/5 days/)).toBeInTheDocument();
        expect(screen.getByText(/10 days/)).toBeInTheDocument();
      });
    });

    it('should show message when no upcoming birthdays', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/no upcoming birthdays/i)).toBeInTheDocument();
      });
    });
  });

  describe('recommendations', () => {
    it('should display activity recommendations', async () => {
      const mockRecommendations = [
        {
          id: '1',
          title: 'Team Bowling',
          type: 'activity',
          description: 'Fun team building activity'
        },
        {
          id: '2',
          title: 'Coffee Chat',
          type: 'meeting',
          description: 'Casual team meeting'
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRecommendations),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Team Bowling')).toBeInTheDocument();
        expect(screen.getByText('Coffee Chat')).toBeInTheDocument();
        expect(screen.getByText('Fun team building activity')).toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to activity planner when clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        const activityLink = screen.getByText(/activity planner/i).closest('a');
        expect(activityLink).toHaveAttribute('href', '/activity');
      });
    });

    it('should navigate to bill splitter when clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        const billSplitterLink = screen.getByText(/bill splitter/i).closest('a');
        expect(billSplitterLink).toHaveAttribute('href', '/billsplitter');
      });
    });
  });

  describe('error handling', () => {
    it('should handle birthdays API error gracefully', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Failed to fetch birthdays'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        // Should still render other sections
        expect(screen.getByText(/activity planner/i)).toBeInTheDocument();
      });
    });

    it('should handle recommendations API error gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockRejectedValueOnce(new Error('Failed to fetch recommendations'));

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(screen.getByText(/activity planner/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('should show loading state initially', () => {
      mockFetch
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<Dashboard />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should render properly on mobile viewport', async () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      renderWithRouter(<Dashboard />);
      
      await waitFor(() => {
        const dashboardContainer = screen.getByRole('main');
        expect(dashboardContainer).toBeInTheDocument();
      });
    });
  });
}); 