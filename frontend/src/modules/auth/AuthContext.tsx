import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

type User = { id: string; name?: string; email: string; role: string; avatarUrl?: string };

type AuthContextType = {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  getAuthHeader: () => HeadersInit;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = 'vibe_auth_token';
const REFRESH_TOKEN_KEY = 'vibe_refresh_token';
const USER_KEY = 'vibe_auth_user';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Request failed');
  }
  return res.json();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const getAuthHeader = useCallback((): HeadersInit => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  // Keep localStorage in sync
  useEffect(() => {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    else localStorage.removeItem(TOKEN_KEY);
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, [refreshToken]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api<{ 
        accessToken: string; 
        refreshToken: string;
        user: User 
      }>("/api/auth/login", {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      // Persist immediately
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      setIsInitialized(true);
      
      navigate('/dashboard', { replace: true });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { 
        method: 'POST',
        headers: getAuthHeader()
      });
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setIsInitialized(false);
      navigate('/login', { replace: true });
    }
  }, [navigate, getAuthHeader]);

  // Refresh access token using stored refresh token
  const refreshAccessToken = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) return false;

    try {
      const data = await api<{ 
        accessToken: string; 
        refreshToken: string;
        user?: User 
      }>("/api/auth/refresh", {
        method: 'POST',
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        if (data?.user) setUser(data.user);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }, []);

  // Hydrate on load
  useEffect(() => {
    (async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      // If we have a refresh token, try to refresh
      if (storedRefreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          setIsInitialized(true);
          return;
        }
      }

      // Fallback: try to use stored access token
      if (storedToken) {
        try {
          const me = await api<{ user: User }>("/api/auth/me", { 
            headers: { Authorization: `Bearer ${storedToken}` } 
          });
          if (me?.user) {
            setAccessToken(storedToken);
            setUser(me.user);
            setIsInitialized(true);
            return;
          }
        } catch {
          // Token is invalid, clear everything
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }

      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsInitialized(true);
    })();
  }, []);

  // Periodic refresh (every 30 minutes - Supabase tokens last 1 hour)
  useEffect(() => {
    const id = setInterval(async () => {
      if (refreshToken) {
        await refreshAccessToken();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(id);
  }, [refreshToken, refreshAccessToken]);

  const value = useMemo(
    () => ({ user, accessToken, isInitialized, login, logout, getAuthHeader }), 
    [user, accessToken, isInitialized, login, logout, getAuthHeader]
  );
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
} 
