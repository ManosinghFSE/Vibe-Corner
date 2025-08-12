import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

class CollaborationService {
  constructor() {
    this.io = null;
    this.sessions = new Map(); // sessionId -> session data
    this.userSessions = new Map(); // userId -> Set of sessionIds
    this.votes = new Map(); // sessionId -> Map of itemId -> Set of userIds
    this.sessionsFile = path.resolve(process.cwd(), 'data/sessions.json');
    this.loadFromDisk();
  }

  // --- Persistence helpers ---
  serializeSession(sessionId) {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    return {
      id: s.id,
      name: s.name,
      teamId: s.teamId,
      creatorId: s.creatorId,
      createdAt: s.createdAt,
      endedAt: s.endedAt || null,
      status: s.status,
      itinerary: s.itinerary,
      comments: s.comments,
      settings: s.settings,
      participants: Array.from(s.participants.values())
    };
  }

  saveToDisk() {
    try {
      const all = Array.from(this.sessions.keys()).map(id => this.serializeSession(id)).filter(Boolean);
      fs.mkdirSync(path.dirname(this.sessionsFile), { recursive: true });
      fs.writeFileSync(this.sessionsFile, JSON.stringify(all, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save sessions:', e);
    }
  }

  loadFromDisk() {
    try {
      if (!fs.existsSync(this.sessionsFile)) return;
      const raw = fs.readFileSync(this.sessionsFile, 'utf-8');
      const arr = JSON.parse(raw);
      for (const s of arr) {
        const session = {
          id: s.id,
          name: s.name,
          teamId: s.teamId,
          creatorId: s.creatorId,
          createdAt: s.createdAt,
          endedAt: s.endedAt || null,
          participants: new Map(),
          itinerary: s.itinerary || { items: [], startDate: null, endDate: null },
          votes: new Map(),
          comments: s.comments || {},
          settings: s.settings || { votingEnabled: true, anonymousVoting: false, requireConsensus: false, autoSchedule: true },
          status: s.status || 'active'
        };
        if (Array.isArray(s.participants)) {
          for (const p of s.participants) {
            session.participants.set(p.id, { ...p, socketId: p.socketId || null });
            if (!this.userSessions.has(p.id)) this.userSessions.set(p.id, new Set());
            this.userSessions.get(p.id).add(session.id);
          }
        }
        this.sessions.set(session.id, session);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }

  listAllSessions() {
    return Array.from(this.sessions.keys())
      .map(id => this.serializeSession(id))
      .filter(Boolean)
      .sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }

  getUserSessions(userId) {
    const userSessionIds = this.userSessions.get(userId) || new Set();
    return Array.from(userSessionIds)
      .map(sessionId => this.getSession(sessionId))
      .filter(Boolean)
      .sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }

  // Initialize Socket.IO
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join session
      socket.on('join-session', ({ sessionId, userId, userName }) => {
        socket.join(sessionId);
        this.addUserToSession(sessionId, userId, userName, socket.id);
        
        // Send current session state (serialized)
        const session = this.getSession(sessionId);
        if (session) {
          socket.emit('session-state', session);
          
          // Notify others
          socket.to(sessionId).emit('user-joined', {
            userId,
            userName,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Leave session
      socket.on('leave-session', ({ sessionId, userId }) => {
        socket.leave(sessionId);
        this.removeUserFromSession(sessionId, userId);
        
        socket.to(sessionId).emit('user-left', {
          userId,
          timestamp: new Date().toISOString()
        });
      });

      // Handle voting
      socket.on('vote', ({ sessionId, itemId, userId, vote }) => {
        this.handleVote(sessionId, itemId, userId, vote);
        
        // Broadcast vote update
        this.io.to(sessionId).emit('vote-update', {
          itemId,
          votes: this.getVotes(sessionId, itemId),
          timestamp: new Date().toISOString()
        });
      });

      // Handle itinerary updates
      socket.on('update-itinerary', ({ sessionId, itinerary, userId }) => {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.itinerary = itinerary;
          session.lastUpdatedBy = userId;
          session.lastUpdatedAt = new Date().toISOString();
          this.saveToDisk();
          
          // Broadcast to all in session
          this.io.to(sessionId).emit('itinerary-updated', {
            itinerary,
            updatedBy: userId,
            timestamp: session.lastUpdatedAt
          });
        }
      });

      // Handle cursor/presence
      socket.on('cursor-move', ({ sessionId, userId, position }) => {
        socket.to(sessionId).emit('cursor-update', {
          userId,
          position,
          timestamp: new Date().toISOString()
        });
      });

      // Handle comments
      socket.on('add-comment', ({ sessionId, itemId, userId, comment }) => {
        const session = this.sessions.get(sessionId);
        if (session) {
          if (!session.comments[itemId]) {
            session.comments[itemId] = [];
          }
          
          const newComment = {
            id: uuidv4(),
            userId,
            text: comment,
            timestamp: new Date().toISOString()
          };
          
          session.comments[itemId].push(newComment);
          this.saveToDisk();
          
          this.io.to(sessionId).emit('comment-added', {
            itemId,
            comment: newComment
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up user from all sessions
        this.cleanupDisconnectedUser(socket.id);
      });
    });
  }

  // Create a new planning session
  createSession(creatorId, name, teamId, creatorName) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      name,
      teamId,
      creatorId,
      createdAt: new Date().toISOString(),
      participants: new Map(),
      itinerary: {
        items: [],
        startDate: null,
        endDate: null
      },
      votes: new Map(),
      comments: {},
      settings: {
        votingEnabled: true,
        anonymousVoting: false,
        requireConsensus: false,
        autoSchedule: true
      },
      status: 'active'
    };
    
    this.sessions.set(sessionId, session);

    // Add creator as initial participant (no socket yet)
    try {
      this.addUserToSession(sessionId, creatorId, creatorName || 'Creator', null);
    } catch {}

    // Broadcast session creation to connected clients
    if (this.io) {
      try {
        this.io.emit('session-created', this.getSession(sessionId));
      } catch {}
    }

    this.saveToDisk();
    return session;
  }

  // End a session
  endSession(sessionId, endedBy) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = 'ended';
    session.endedAt = new Date().toISOString();
    this.saveToDisk();
    if (this.io) {
      try { this.io.emit('session-ended', { sessionId, endedBy, endedAt: session.endedAt }); } catch {}
    }
    return true;
  }

  // Add user to session
  addUserToSession(sessionId, userId, userName, socketId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants.set(userId, {
        id: userId,
        name: userName,
        socketId: socketId || null,
        joinedAt: new Date().toISOString(),
        presence: 'active',
        cursor: null
      });
      
      // Track user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId).add(sessionId);
      this.saveToDisk();
    }
  }

  // Remove user from session
  removeUserFromSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants.delete(userId);
      
      // Update user sessions tracking
      const userSessions = this.userSessions.get(userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(userId);
        }
      }
      this.saveToDisk();
    }
  }

  // Handle voting
  handleVote(sessionId, itemId, userId, vote) {
    if (!this.votes.has(sessionId)) {
      this.votes.set(sessionId, new Map());
    }
    
    const sessionVotes = this.votes.get(sessionId);
    if (!sessionVotes.has(itemId)) {
      sessionVotes.set(itemId, new Map());
    }
    
    const itemVotes = sessionVotes.get(itemId);
    
    if (vote === null) {
      // Remove vote
      itemVotes.delete(userId);
    } else {
      // Add/update vote
      itemVotes.set(userId, {
        value: vote,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get votes for an item
  getVotes(sessionId, itemId) {
    const sessionVotes = this.votes.get(sessionId);
    if (!sessionVotes) return { upvotes: 0, downvotes: 0, total: 0 };
    
    const itemVotes = sessionVotes.get(itemId);
    if (!itemVotes) return { upvotes: 0, downvotes: 0, total: 0 };
    
    let upvotes = 0;
    let downvotes = 0;
    
    for (const [userId, voteData] of itemVotes) {
      if (voteData.value === 'up') upvotes++;
      else if (voteData.value === 'down') downvotes++;
    }
    
    return {
      upvotes,
      downvotes,
      total: upvotes - downvotes,
      voters: Array.from(itemVotes.keys())
    };
  }

  // Get session details
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Convert Maps to objects for serialization
    return {
      ...session,
      participants: Array.from(session.participants.values()),
      votes: this.getSessionVotes(sessionId)
    };
  }

  // Get all votes for a session
  getSessionVotes(sessionId) {
    const sessionVotes = this.votes.get(sessionId);
    if (!sessionVotes) return {};
    
    const result = {};
    for (const [itemId, itemVotes] of sessionVotes) {
      result[itemId] = this.getVotes(sessionId, itemId);
    }
    
    return result;
  }

  // Clean up disconnected user
  cleanupDisconnectedUser(socketId) {
    for (const [sessionId, session] of this.sessions) {
      for (const [userId, participant] of session.participants) {
        if (participant.socketId === socketId) {
          this.removeUserFromSession(sessionId, userId);
          
          // Notify others in session
          if (this.io) {
            this.io.to(sessionId).emit('user-disconnected', {
              userId,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  // Export session data
  exportSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    
    return {
      ...session,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  // Generate shareable link
  generateShareableLink(sessionId) {
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    return `${baseUrl}/collaborate/${sessionId}`;
  }

  // Schedule activities from itinerary
  async scheduleActivities(sessionId, calendarService, accessToken) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.itinerary.items.length) {
      throw new Error('No activities to schedule');
    }
    
    const events = [];
    
    for (const item of session.itinerary.items) {
      if (item.scheduledTime) {
        const event = {
          subject: `Team Activity: ${item.title}`,
          start: {
            dateTime: item.scheduledTime,
            timeZone: 'UTC'
          },
          end: {
            dateTime: new Date(new Date(item.scheduledTime).getTime() + item.duration * 60000).toISOString(),
            timeZone: 'UTC'
          },
          location: {
            displayName: item.location || 'TBD'
          },
          body: {
            contentType: 'HTML',
            content: `
              <h3>${item.title}</h3>
              <p>${item.description}</p>
              <p><strong>Type:</strong> ${item.type}</p>
              <p><strong>Price:</strong> $${item.price} per person</p>
              <p><strong>Rating:</strong> ${item.rating} ⭐</p>
              <p><a href="${item.detailsUrl}">View Details</a></p>
            `
          },
          attendees: session.participants.map(p => ({
            emailAddress: { address: p.email },
            type: 'required'
          }))
        };
        
        events.push(event);
      }
    }
    
    return events;
  }
}

export const collaborationService = new CollaborationService(); 