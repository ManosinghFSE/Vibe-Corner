# Vibe Cooler

Modern team experience app with activities, bills, birthdays, budgets, collaboration, events, memory journaling, meetings, recommendations, skills, and more.

## Features (updated)

- Event Grid (Event planning)
  - Create/list events, RSVP, export ICS
  - Supabase tables: `vc_app.events`, `vc_app.event_rsvps`
- Meeting Mind (Outings & team activities)
  - Create meetings/activities, proposed/scheduled times, action items, upcoming/past views
  - Supabase tables: `vc_app.meetings`, `vc_app.meeting_actions`
- Memory Lane (Journal)
  - Create/edit/delete entries with mood, tags, images
  - Paginated entries and optimized stats
  - Supabase table: `vc_app.memory_entries` (+ `image_url` column)
- Skill Swap
  - Add/list skills, my skills, simple matches
  - Supabase table: `vc_app.skills`
- Birthdays and Holidays
  - Dashboard shows upcoming birthdays (from `birthdays` table) and a minimal holiday list
- Recommendations
  - `/api/recommendations/dashboard` aggregates recommendations + upcoming events

## Tech

- Frontend: React + Vite + React Router + TypeScript support, Bootstrap
- Backend: Node.js + Express + Supabase JS SDK
- Auth: bearer token via `AuthContext`

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (env vars):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Recommended: create `.env` in `backend` based on `env.example`

### Install

```bash
# backend
cd backend
npm ci

# frontend
cd ../frontend
npm ci
```

### Run

```bash
# backend
cd backend
npm run dev

# frontend (new terminal)
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Database Schema (Supabase)

Run the SQL blocks in `docs/supabase/schema-app.sql` to create/update tables and policies.

- Memory Lane: `vc_app.memory_entries` (with `image_url`)
- Event Grid: `vc_app.events`, `vc_app.event_rsvps`
- Meeting Mind: `vc_app.meetings`, `vc_app.meeting_actions`
- Skills: `vc_app.skills`
- Birthdays: `birthdays` (existing)

## Seeding

Convenience scripts (run from `backend`):

```bash
# Event Grid (12 upcoming events with images)
npm run seed:events

# Meeting Mind (outings & activities)
npm run seed:meetings

# Memory Lane (40 entries with images) + Skill Swap
npm run seed:memory-skills
```

Ensure you’ve applied schema before seeding.

## Key API Endpoints

- Event Grid
  - `GET /api/eventgrid/events?from&tag&search`
  - `POST /api/eventgrid/events`
  - `GET /api/eventgrid/events/:id`
  - `POST /api/eventgrid/events/:id/rsvp`
  - `GET /api/eventgrid/events/:id/calendar`
- Meeting Mind
  - `GET /api/meetingmind/meetings?status=upcoming|past`
  - `POST /api/meetingmind/meetings`
  - `GET /api/meetingmind/meetings/:id`
  - `PATCH /api/meetingmind/meetings/:id` (set `decidedTime`)
  - `POST /api/meetingmind/meetings/:id/actions`
  - `PUT /api/meetingmind/actions/:id`
  - `GET /api/meetingmind/my-actions`
- Memory Lane
  - `POST /api/memorylane/entries`
  - `GET /api/memorylane/entries?page&pageSize&from&to&mood&tag&search`
  - `GET /api/memorylane/entries/:id`
  - `PUT /api/memorylane/entries/:id`
  - `DELETE /api/memorylane/entries/:id`
  - `GET /api/memorylane/stats`
  - `GET /api/memorylane/export`
- Skill Swap
  - `POST /api/skillswap/skills`
  - `GET /api/skillswap/skills?category`
  - `GET /api/skillswap/my-skills`
  - `GET /api/skillswap/matches`
- Recommendations / Dashboard
  - `GET /api/recommendations/dashboard` (recs + upcoming birthdays/holidays)
  - `GET /api/recommendations/events?days=` (holidays)
- Birthdays
  - `GET /api/birthday/upcoming?window=`

## Accessibility & UI

- Improved button contrast and focus states in `frontend/src/ui-fixes.css` (WCAG AA)
- Guards for invalid dates and RSVP merges in Event Grid
- Memory Lane editor toggling and auto-title when blank

## Troubleshooting

- 401 Unauthorized: ensure valid auth header; re-login
- Supabase errors (table missing): apply SQL in `docs/supabase/schema-app.sql`
- Socket warnings on port 5173: point client to backend port 4000 for Socket.IO or disable in dev

## License

MIT 