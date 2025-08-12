import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth();
  
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.email : 'No user'}</div>
      <div data-testid="token">{auth.accessToken || 'No token'}</div>
      <div data-testid="initialized">{auth.isInitialized ? 'Initialized' : 'Not initialized'}</div>
      <button 
        onClick={() => auth.login('test@example.com', 'password123')}
        data-testid="login-btn"
      >
        Login
      </button>
      <button onClick={() => auth.logout()} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with no user when localStorage is empty', async () => {
      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
        expect(screen.getByTestId('initialized')).toHaveTextContent('Initialized');
      });
    });

    it('should initialize with stored user data', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
      const mockToken = 'stored-token';
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'vibe_auth_user') return JSON.stringify(mockUser);
        if (key === 'vibe_auth_token') return mockToken;
        return null;
      });

      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
        expect(screen.getByTestId('initialized')).toHaveTextContent('Initialized');
      });
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        user: { id: '123', email: 'test@example.com', role: 'user' },
        expiresIn: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderWithProviders(<TestComponent />);
      
      const loginBtn = screen.getByTestId('login-btn');
      
      await act(async () => {
        await userEvent.click(loginBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('token')).toHaveTextContent('new-access-token');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'vibe_auth_token',
        'new-access-token'
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'vibe_auth_user',
        JSON.stringify(mockResponse.user)
      );
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      renderWithProviders(<TestComponent />);
      
      const loginBtn = screen.getByTestId('login-btn');
      
      await act(async () => {
        await userEvent.click(loginBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<TestComponent />);
      
      const loginBtn = screen.getByTestId('login-btn');
      
      await act(async () => {
        await userEvent.click(loginBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear user data', async () => {
      // Set initial user state
      const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'vibe_auth_user') return JSON.stringify(mockUser);
        if (key === 'vibe_auth_token') return 'stored-token';
        return null;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Logged out' }),
      });

      renderWithProviders(<TestComponent />);

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      
      await act(async () => {
        await userEvent.click(logoutBtn);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vibe_auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vibe_auth_user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vibe_refresh_token');
    });

    it('should handle logout errors gracefully', async () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'user' };
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'vibe_auth_user') return JSON.stringify(mockUser);
        if (key === 'vibe_auth_token') return 'stored-token';
        return null;
      });

      mockFetch.mockRejectedValueOnce(new Error('Logout failed'));

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });

      const logoutBtn = screen.getByTestId('logout-btn');
      
      await act(async () => {
        await userEvent.click(logoutBtn);
      });

      // Should still clear local data even if logout request fails
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No user');
        expect(screen.getByTestId('token')).toHaveTextContent('No token');
      });
    });
  });

  describe('getAuthHeader', () => {
    it('should return authorization header when token exists', async () => {
      const TestHeaderComponent = () => {
        const auth = useAuth();
        const headers = auth.getAuthHeader();
        
        return (
          <div data-testid="auth-header">
            {headers.Authorization || 'No auth header'}
          </div>
        );
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'vibe_auth_token') return 'test-token';
        return null;
      });

      renderWithProviders(<TestHeaderComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-header')).toHaveTextContent('Bearer test-token');
      });
    });

    it('should return empty headers when no token exists', async () => {
      const TestHeaderComponent = () => {
        const auth = useAuth();
        const headers = auth.getAuthHeader();
        
        return (
          <div data-testid="auth-header">
            {headers.Authorization || 'No auth header'}
          </div>
        );
      };

      renderWithProviders(<TestHeaderComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-header')).toHaveTextContent('No auth header');
      });
    });
  });

  describe('token refresh', () => {
    it('should attempt to refresh token on initialization', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'vibe_refresh_token') return 'refresh-token';
        return null;
      });

      const mockRefreshResponse = {
        accessToken: 'new-access-token',
        user: { id: '123', email: 'test@example.com', role: 'user' }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      renderWithProviders(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('token')).toHaveTextContent('new-access-token');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', expect.objectContaining({
        method: 'POST',
        credentials: 'include'
      }));
    });
  });
}); 