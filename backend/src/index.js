import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import session from 'express-session';

// Load environment variables
dotenv.config();

// Import routes
import authRouter from './routes/auth.js';
import authSupabaseRouter from './routes/auth-supabase.js';
import { authV2Router } from './routes/auth-v2.js';
import { usersRouter } from './routes/users.js';
import { teamsRouter } from './routes/teams.js';
import activityPlannerRouter from './routes/activityPlanner.js';
import { collaborationRouter } from './routes/collaboration.js';
import { billSplitterRouter } from './routes/billsplitter.js';
import { birthdayRouter } from './routes/birthday.js';
import { budgetRouter } from './routes/budget.js';
import { codeMoodRouter, codeMoodApi } from './routes/codemood.js';
import { eventGridRouter } from './routes/eventgrid.js';
import { meetingMindRouter } from './routes/meetingmind.js';
import { memoryLaneRouter } from './routes/memorylane.js';
import { skillSwapRouter } from './routes/skillswap.js';
import recommendationsRouter from './routes/recommendations.js';
import storyCraftRouter from './routes/storycraft.js';
import { bountyRouter } from './routes/bounty.js';

// Import services
import { collaborationService } from './services/collaboration-service.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Trust proxy for correct secure cookie handling behind reverse proxies
app.set('trust proxy', 1);

// Initialize Socket.IO for real-time collaboration (non-blocking)
setImmediate(() => {
  try {
    collaborationService.initialize(httpServer);
    console.log('✅ Collaboration service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize collaboration service:', error);
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"],
    },
  },
}));

const allowedOrigins = new Set([
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173', // vite preview
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    // Allow any localhost:port during development
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Session middleware for OAuth and auth persistence
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'vibe-session', // Custom session name
  rolling: true // Reset expiry on activity
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    services: {
      auth: 'operational',
      authV2: 'operational',
      collaboration: 'operational',
      location: 'operational',
      graph: 'operational'
    }
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/auth/v2', authV2Router);
app.use('/api/auth/v3', authSupabaseRouter); // New Supabase auth routes
app.use('/api/users', usersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/activityplanner', activityPlannerRouter);
app.use('/api/collaboration', collaborationRouter);
app.use('/api/billsplitter', billSplitterRouter);
app.use('/api/birthday', birthdayRouter);
app.use('/api/budget', budgetRouter);
app.use('/api/codemood', codeMoodRouter);
app.use('/api/codemood', codeMoodApi);

app.use('/api/eventgrid', eventGridRouter);
app.use('/api/meetingmind', meetingMindRouter);
app.use('/api/memorylane', memoryLaneRouter);
app.use('/api/skillswap', skillSwapRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/storycraft', storyCraftRouter);
app.use('/api/bounty', bountyRouter);

// Teams integration endpoints
app.get('/api/teams/config', (req, res) => {
  res.json({
    appId: process.env.TEAMS_APP_ID || 'mock-teams-app-id',
    validDomains: [process.env.APP_DOMAIN || 'localhost:5173'],
    version: '1.0.0'
  });
});

// Mock data generation endpoints have been removed (DB-only mode).

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Global safety nets: log unexpected errors instead of crashing in dev
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
}); 