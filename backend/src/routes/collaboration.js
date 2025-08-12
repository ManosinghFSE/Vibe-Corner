import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { collaborationService } from '../services/collaboration-service.js';
import { graphService } from '../services/graph-service.js';

export const collaborationRouter = express.Router();

// Helper to get user ID from request
const getUserId = (req) => req.user.sub || req.user.id;

// List all sessions (persistent)
collaborationRouter.get('/sessions/all', requireAuth, (req, res) => {
  const sessions = collaborationService.listAllSessions();
  res.json({ sessions });
});

// End a session
collaborationRouter.post('/sessions/:sessionId/end', requireAuth, (req, res) => {
  const ok = collaborationService.endSession(req.params.sessionId, getUserId(req));
  if (!ok) return res.status(404).json({ error: 'Session not found' });
  res.json({ success: true });
});

// Create a new planning session
collaborationRouter.post('/sessions', requireAuth, (req, res) => {
  const { name, teamId } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Session name is required' });
  }
  
  const session = collaborationService.createSession(req.user.sub, name, teamId, req.user.name);
  
  res.status(201).json({
    session,
    shareableLink: collaborationService.generateShareableLink(session.id)
  });
});

// Get session details
collaborationRouter.get('/sessions/:sessionId', requireAuth, (req, res) => {
  const session = collaborationService.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// Get sessions
collaborationRouter.get('/sessions', requireAuth, (req, res) => {
  const returnAll = req.query.all === '1' || process.env.NODE_ENV !== 'production';

  if (returnAll) {
    // Return all active sessions so other users can discover and join in demo mode
    const sessions = collaborationService.listAllSessions()
      .filter(session => session.status !== 'ended');
    return res.json({ sessions });
  }

  // Default: only sessions the user is in
  const sessions = collaborationService.getUserSessions(req.user.sub);
  
  res.json({ sessions });
});

// Update session settings
collaborationRouter.patch('/sessions/:sessionId/settings', requireAuth, (req, res) => {
  const session = collaborationService.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Allow settings by creator; allow status in dev
  const isCreator = session.creatorId === req.user.sub;
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isCreator && !isDev) {
    return res.status(403).json({ error: 'Only session creator can update settings' });
  }
  
  const { votingEnabled, anonymousVoting, requireConsensus, autoSchedule, status } = req.body;
  
  if (status === 'ended') {
    const ok = collaborationService.endSession(req.params.sessionId, req.user.sub);
    if (!ok) return res.status(404).json({ error: 'Session not found' });
    return res.json({ status: 'ended' });
  }
  
  if (votingEnabled !== undefined) session.settings.votingEnabled = votingEnabled;
  if (anonymousVoting !== undefined) session.settings.anonymousVoting = anonymousVoting;
  if (requireConsensus !== undefined) session.settings.requireConsensus = requireConsensus;
  if (autoSchedule !== undefined) session.settings.autoSchedule = autoSchedule;
  
  res.json({ settings: session.settings });
});

// Export session data
collaborationRouter.get('/sessions/:sessionId/export', requireAuth, (req, res) => {
  const sessionData = collaborationService.exportSession(req.params.sessionId);
  
  if (!sessionData) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(sessionData);
});

// Schedule activities to calendar
collaborationRouter.post('/sessions/:sessionId/schedule', requireAuth, async (req, res) => {
  const { accessToken } = req.body;
  
  if (!accessToken) {
    return res.status(400).json({ error: 'Access token required for calendar integration' });
  }
  
  try {
    const events = await collaborationService.scheduleActivities(
      req.params.sessionId,
      graphService,
      accessToken
    );
    
    // Create events in calendar
    const createdEvents = [];
    for (const event of events) {
      const created = await graphService.createCalendarEvent(accessToken, event);
      createdEvents.push(created);
    }
    
    res.json({
      message: 'Activities scheduled successfully',
      events: createdEvents
    });
  } catch (error) {
    console.error('Error scheduling activities:', error);
    res.status(500).json({ error: 'Failed to schedule activities' });
  }
});

// Get session votes
collaborationRouter.get('/sessions/:sessionId/votes', requireAuth, (req, res) => {
  const votes = collaborationService.getSessionVotes(req.params.sessionId);
  res.json({ votes });
});

// Send activity to Teams channel
collaborationRouter.post('/sessions/:sessionId/share-to-teams', requireAuth, async (req, res) => {
  const { teamId, channelId, activityId, accessToken } = req.body;
  
  if (!teamId || !channelId || !activityId || !accessToken) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const session = collaborationService.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Find the activity in the itinerary
  const activity = session.itinerary.items.find(item => item.id === activityId);
  if (!activity) {
    return res.status(404).json({ error: 'Activity not found in session' });
  }
  
  try {
    // Create adaptive card
    const card = graphService.createActivityCard({
      ...activity,
      detailsUrl: `${process.env.APP_URL}/activity/${activity.id}`
    });
    
    // Send to Teams channel
    await graphService.sendChannelMessage(accessToken, teamId, channelId, {
      content: `Check out this activity suggestion from our planning session: ${session.name}`,
      contentType: 'html',
      attachments: [card]
    });
    
    res.json({ message: 'Activity shared to Teams successfully' });
  } catch (error) {
    console.error('Error sharing to Teams:', error);
    res.status(500).json({ error: 'Failed to share to Teams' });
  }
});

// Mock data generator for sessions
collaborationRouter.post('/sessions/generate-mock', requireAuth, (req, res) => {
  const mockSessions = [];
  
  // Generate 5 mock sessions
  for (let i = 0; i < 5; i++) {
    const session = collaborationService.createSession(
      req.user.sub,
      `Team Outing ${i + 1}`,
      `team-${i + 1}`
    );
    
    // Add mock participants
    const participants = [
      { id: 'user-1', name: 'Alice Johnson', email: 'alice@company.com' },
      { id: 'user-2', name: 'Bob Smith', email: 'bob@company.com' },
      { id: 'user-3', name: 'Charlie Brown', email: 'charlie@company.com' },
      { id: 'user-4', name: 'Diana Prince', email: 'diana@company.com' }
    ];
    
    participants.forEach(p => {
      collaborationService.addUserToSession(session.id, p.id, p.name, `socket-${p.id}`);
    });
    
    // Add mock itinerary items
    const activities = [
      {
        id: `activity-${i}-1`,
        title: 'Team Lunch at Italian Bistro',
        type: 'restaurant',
        description: 'Authentic Italian cuisine with vegetarian options',
        location: '123 Main St, Downtown',
        price: 25,
        rating: 4.5,
        duration: 90,
        scheduledTime: new Date(Date.now() + (i + 1) * 86400000).toISOString()
      },
      {
        id: `activity-${i}-2`,
        title: 'Escape Room Challenge',
        type: 'activity',
        description: 'Team building through puzzle solving',
        location: '456 Adventure Ave',
        price: 35,
        rating: 4.8,
        duration: 60,
        scheduledTime: new Date(Date.now() + (i + 1) * 86400000 + 7200000).toISOString()
      },
      {
        id: `activity-${i}-3`,
        title: 'Rooftop Bar & Lounge',
        type: 'restaurant',
        description: 'Casual drinks with city views',
        location: '789 Sky Tower',
        price: 20,
        rating: 4.2,
        duration: 120,
        scheduledTime: new Date(Date.now() + (i + 1) * 86400000 + 14400000).toISOString()
      }
    ];
    
    session.itinerary.items = activities;
    session.itinerary.startDate = activities[0].scheduledTime;
    session.itinerary.endDate = activities[activities.length - 1].scheduledTime;
    
    // Add mock votes
    activities.forEach((activity, actIdx) => {
      participants.forEach((p, pIdx) => {
        // Random voting pattern
        if (Math.random() > 0.3) {
          collaborationService.handleVote(
            session.id,
            activity.id,
            p.id,
            Math.random() > 0.3 ? 'up' : 'down'
          );
        }
      });
    });
    
    // Add mock comments
    session.comments[activities[0].id] = [
      {
        id: 'comment-1',
        userId: 'user-1',
        text: 'Great choice! I love their pasta dishes.',
        timestamp: new Date().toISOString()
      },
      {
        id: 'comment-2',
        userId: 'user-2',
        text: 'Do they have parking available?',
        timestamp: new Date().toISOString()
      }
    ];
    
    mockSessions.push(session);
  }
  
  res.json({
    message: 'Mock sessions created',
    sessions: mockSessions.map(s => ({
      id: s.id,
      name: s.name,
      participantCount: s.participants.size,
      activityCount: s.itinerary.items.length,
      shareableLink: collaborationService.generateShareableLink(s.id)
    }))
  });
}); 