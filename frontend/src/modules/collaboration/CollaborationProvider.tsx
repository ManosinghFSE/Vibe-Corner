import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

interface Participant {
  id: string;
  name: string;
  presence: string;
  cursor?: { x: number; y: number };
}

interface Vote {
  upvotes: number;
  downvotes: number;
  total: number;
  voters: string[];
}

interface Session {
  id: string;
  name: string;
  creatorId?: string;
  createdAt?: string;
  endedAt?: string | null;
  status?: 'active' | 'ended' | string;
  participants: Participant[];
  itinerary: {
    items: any[];
    startDate: string | null;
    endDate: string | null;
  };
  votes: Record<string, Vote>;
  settings: {
    votingEnabled: boolean;
    anonymousVoting: boolean;
    requireConsensus: boolean;
    autoSchedule: boolean;
  };
}

interface CollaborationContextType {
  socket: Socket | null;
  currentSession: Session | null;
  sessions: Session[];
  isConnected: boolean;
  joinSession: (sessionId: string) => void;
  leaveSession: () => void;
  createSession: (name: string, teamId?: string) => Promise<Session>;
  endSession: (sessionId: string) => Promise<boolean>;
  vote: (itemId: string, vote: 'up' | 'down' | null) => void;
  updateItinerary: (itinerary: any) => void;
  addComment: (itemId: string, comment: string) => void;
  moveCursor: (position: { x: number; y: number }) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Initialize socket connection
  useEffect(() => {
    // Don't initialize socket if no user or token
    if (!user || !accessToken) {
      // Clean up any existing socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Only create new socket if we don't have one
    if (socket) return;

    const socketInstance = io('/', {
      auth: {
        token: accessToken
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Connected to collaboration server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socketInstance.on('session-state', (session: Session) => {
      setCurrentSession(session);
    });

    // Realtime session discovery
    socketInstance.on('session-created', (session: Session) => {
      setSessions(prev => {
        const exists = prev.some(s => s.id === session.id);
        return exists ? prev : [session, ...prev];
      });
    });

    socketInstance.on('user-joined', ({ userId, userName }) => {
      console.log(`${userName} joined the session`);
    });

    socketInstance.on('user-left', ({ userId }) => {
      console.log(`User ${userId} left the session`);
    });

    // Server emits 'vote-update'
    socketInstance.on('vote-update', ({ itemId, votes }) => {
      setCurrentSession(prev => {
        if (!prev) return prev;
        return { ...prev, votes: { ...prev.votes, [itemId]: votes } } as Session;
      });
    });

    // Server emits 'itinerary-updated' with itinerary object
    socketInstance.on('itinerary-updated', (payload: any) => {
      const itinerary = (payload && payload.itinerary) || payload;
      setCurrentSession(prev => prev ? { ...prev, itinerary } : null);
    });

    // Server emits 'cursor-update'
    socketInstance.on('cursor-update', ({ userId, position }: { userId: string; position: { x: number; y: number } }) => {
      setCurrentSession(prev => {
        if (!prev) return null;
        const participants = prev.participants.map(p => 
          p.id === userId ? { ...p, cursor: position } : p
        );
        return { ...prev, participants } as Session;
      });
    });

    setSocket(socketInstance);

    // Cleanup function
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, accessToken]); // Remove socket from dependencies to prevent loops

  // Fetch sessions (all in demo) and keep them fresh
  useEffect(() => {
    if (!accessToken) return;

    let timer: any;
    const fetchSessions = () => {
      fetch('/api/collaboration/sessions?all=1', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
        .then(res => res.json())
        .then(async data => {
          let list = data.sessions || data.mySessions || data.activeSessions || [];
          if (!Array.isArray(list) || list.length === 0) {
            // Fallback to persistent list
            const resAll = await fetch('/api/collaboration/sessions/all', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (resAll.ok) {
              const dataAll = await resAll.json();
              list = dataAll.sessions || [];
            }
          }
          setSessions(list);
        })
        .catch(console.error);
    };

    fetchSessions();
    timer = setInterval(fetchSessions, 10000); // refresh every 10s

    return () => clearInterval(timer);
  }, [accessToken]);

  const endSession = useCallback(async (sessionId: string) => {
    let token = accessToken;
    const attemptPost = async () => fetch(`/api/collaboration/sessions/${sessionId}/end`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const attemptPatch = async () => fetch(`/api/collaboration/sessions/${sessionId}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ status: 'ended' }) });
    try {
      let res = await attemptPost();
      if (res.status === 404 || res.status === 405) {
        // Try PATCH fallback
        res = await attemptPatch();
      }
      if (res.status === 401) {
        // Try to refresh token once
        try {
          const r = await fetch('/api/auth/refresh', { method: 'POST' });
          if (r.ok) {
            const data = await r.json();
            if (data?.accessToken) token = data.accessToken;
            res = await attemptPost();
            if (!res.ok) res = await attemptPatch();
          }
        } catch (e) {
          console.error('Token refresh failed while ending session:', e);
        }
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('End session failed', res.status, text);
        return false;
      }
      setSessions(prev => prev.map(s => (s.id === sessionId ? { ...s, status: 'ended' } as Session : s)));
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...(currentSession as Session), status: 'ended' } as Session);
      }
      return true;
    } catch (e) {
      console.error('End session error', e);
      return false;
    }
  }, [accessToken, currentSession]);

  // API methods with error handling
  const createSession = useCallback(async (name: string, teamId?: string): Promise<Session> => {
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch('/api/collaboration/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name, teamId })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      // Backend returns { session, shareableLink }
      return (data.session || data) as Session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }, [accessToken]);

  const joinSession = useCallback((sessionId: string) => {
    if (!socket || !isConnected || !user) {
      console.warn('Socket not connected, cannot join session');
      return;
    }
    socket.emit('join-session', { sessionId, userId: user.id, userName: user.name });
  }, [socket, isConnected, user]);

  const leaveSession = useCallback(() => {
    if (!socket || !currentSession || !user) return;
    socket.emit('leave-session', { sessionId: currentSession.id, userId: user.id });
    setCurrentSession(null);
  }, [socket, currentSession, user]);

  const vote = useCallback((itemId: string, voteType: 'up' | 'down' | null) => {
    if (!socket || !currentSession || !user) return;
    socket.emit('vote', {
      sessionId: currentSession.id,
      itemId,
      userId: user.id,
      vote: voteType
    });
  }, [socket, currentSession, user]);

  const updateItinerary = useCallback((itinerary: any) => {
    if (!socket || !currentSession || !user) return;
    socket.emit('update-itinerary', {
      sessionId: currentSession.id,
      itinerary,
      userId: user.id
    });
  }, [socket, currentSession, user]);

  const addComment = useCallback((itemId: string, comment: string) => {
    if (!socket || !currentSession || !user) return;
    socket.emit('add-comment', {
      sessionId: currentSession.id,
      itemId,
      userId: user.id,
      comment
    });
  }, [socket, currentSession, user]);

  const moveCursor = useCallback((position: { x: number; y: number }) => {
    if (!socket || !currentSession || !user) return;
    socket.emit('cursor-move', {
      sessionId: currentSession.id,
      userId: user.id,
      position
    });
  }, [socket, currentSession, user]);

  const value: CollaborationContextType = {
    socket,
    currentSession,
    sessions,
    isConnected,
    joinSession,
    leaveSession,
    createSession,
    endSession,
    vote,
    updateItinerary,
    addComment,
    moveCursor
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}; 
