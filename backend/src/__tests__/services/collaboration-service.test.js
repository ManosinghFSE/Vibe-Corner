import { jest } from '@jest/globals';

// Mock Socket.IO
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn(() => mockSocket),
  broadcast: {
    to: jest.fn(() => mockSocket),
    emit: jest.fn()
  }
};

const mockIo = {
  on: jest.fn(),
  emit: jest.fn(),
  to: jest.fn(() => mockSocket),
  sockets: {
    sockets: new Map()
  }
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo)
}));

jest.mock('../../services/supabase-client.js', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
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

describe('Collaboration Service', () => {
  let collaborationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../services/collaboration-service.js');
    collaborationService = module.collaborationService;
  });

  describe('initialize', () => {
    it('should initialize Socket.IO server', () => {
      const mockHttpServer = {};
      
      collaborationService.initialize(mockHttpServer);
      
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('handleConnection', () => {
    it('should handle new socket connections', () => {
      const mockHttpServer = {};
      collaborationService.initialize(mockHttpServer);
      
      // Get the connection handler
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      
      // Simulate a new connection
      connectionHandler(mockSocket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('join-session', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave-session', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('activity-update', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('vote-cast', expect.any(Function));
    });
  });

  describe('session management', () => {
    beforeEach(() => {
      const mockHttpServer = {};
      collaborationService.initialize(mockHttpServer);
    });

    it('should handle joining a session', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const mockSession = {
        id: 'session-123',
        name: 'Test Session',
        created_by: 'user-123'
      };

      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockSession, error: null })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const joinHandler = mockSocket.on.mock.calls.find(call => call[0] === 'join-session')[1];
      
      await joinHandler({
        sessionId: 'session-123',
        userId: 'user-456'
      });

      expect(mockSocket.join).toHaveBeenCalledWith('session-123');
      expect(mockSocket.to).toHaveBeenCalledWith('session-123');
    });

    it('should handle leaving a session', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const leaveHandler = mockSocket.on.mock.calls.find(call => call[0] === 'leave-session')[1];
      
      leaveHandler({
        sessionId: 'session-123',
        userId: 'user-456'
      });

      expect(mockSocket.leave).toHaveBeenCalledWith('session-123');
    });
  });

  describe('activity updates', () => {
    it('should broadcast activity updates to session participants', () => {
      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const updateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'activity-update')[1];
      
      const updateData = {
        sessionId: 'session-123',
        activityId: 'activity-456',
        updates: { name: 'Updated Activity' }
      };

      updateHandler(updateData);

      expect(mockSocket.to).toHaveBeenCalledWith('session-123');
      expect(mockSocket.broadcast.to).toHaveBeenCalledWith('session-123');
    });
  });

  describe('voting system', () => {
    it('should handle vote casting and broadcast results', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const mockSupabase = {
        from: jest.fn(() => ({
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ 
              data: [{ activity_id: 'activity-123', vote_count: 5 }], 
              error: null 
            })
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const voteHandler = mockSocket.on.mock.calls.find(call => call[0] === 'vote-cast')[1];
      
      await voteHandler({
        sessionId: 'session-123',
        activityId: 'activity-456',
        userId: 'user-789',
        vote: 'up'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('collaboration_votes');
      expect(mockSocket.to).toHaveBeenCalledWith('session-123');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { getSupabase } = await import('../../services/supabase-client.js');
      
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
            }))
          }))
        }))
      };

      getSupabase.mockReturnValue(mockSupabase);

      const connectionHandler = mockIo.on.mock.calls.find(call => call[0] === 'connection')[1];
      connectionHandler(mockSocket);

      const joinHandler = mockSocket.on.mock.calls.find(call => call[0] === 'join-session')[1];
      
      await joinHandler({
        sessionId: 'invalid-session',
        userId: 'user-456'
      });

      // Should not join the room if session doesn't exist
      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });
}); 