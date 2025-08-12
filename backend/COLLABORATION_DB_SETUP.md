# Collaboration Sessions Database Setup Guide

## Overview
This guide explains how to set up persistent collaboration sessions in Supabase instead of using in-memory storage.

## 1. Create Database Tables

Run the following SQL in your Supabase SQL editor:

```sql
-- First, ensure you're in the correct schema
SET search_path TO vc_app;

-- Run the SQL from: backend/src/scripts/create-collaboration-tables.sql
```

This will create:
- `collaboration_sessions` - Main sessions table
- `session_participants` - Track who's in each session
- `session_activities` - Activities/items in the itinerary
- `activity_votes` - Voting data
- `session_comments` - Comments on sessions/activities

## 2. Update Environment Variables

Ensure your `.env` file has:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 3. Seed the Database

Run the new database seeding script:

```bash
cd backend
npm run seed:collab-db
```

This will create 1000 collaboration sessions with:
- Random participants from your users
- 3-6 activities per session
- Voting data
- Some comments

## 4. Benefits of Database Persistence

- **Persistence**: Sessions survive server restarts
- **Scalability**: Can handle thousands of sessions
- **Querying**: Can filter/search sessions efficiently
- **Analytics**: Can generate reports on session data
- **Multi-server**: Works across multiple server instances

## 5. Migration from In-Memory

The current implementation uses in-memory storage. To fully migrate:

1. Update `collaboration-service.js` to read/write from Supabase
2. Update the REST APIs in `routes/collaboration.js` to query the database
3. Keep WebSocket functionality for real-time updates

## 6. Hybrid Approach

For best performance, consider a hybrid approach:
- Use database for persistence
- Cache active sessions in memory
- Sync changes to database periodically
- Load from database on server start

## 7. Dashboard Integration

The dashboard can now show:
- Total sessions created (from DB)
- Active sessions count
- Popular activities
- Voting statistics
- User participation rates

## 8. Example Queries

Get all sessions for a user:
```sql
SELECT cs.*, COUNT(DISTINCT sp2.user_id) as participant_count
FROM collaboration_sessions cs
JOIN session_participants sp ON cs.id = sp.session_id
LEFT JOIN session_participants sp2 ON cs.id = sp2.session_id
WHERE sp.user_id = 'user-uuid-here'
GROUP BY cs.id;
```

Get most popular activities:
```sql
SELECT sa.title, sa.type, COUNT(av.id) as vote_count,
       SUM(CASE WHEN av.vote_type = 'up' THEN 1 ELSE 0 END) as upvotes
FROM session_activities sa
LEFT JOIN activity_votes av ON sa.id = av.activity_id
GROUP BY sa.title, sa.type
ORDER BY upvotes DESC
LIMIT 10;
``` 