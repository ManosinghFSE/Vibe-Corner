# VibeCorner Backend (Mock Auth)

Quick start:

1. Copy `.env` (create if needed) with:
   - `PORT=4000`
   - `CLIENT_URL=http://localhost:5173`
   - `JWT_SECRET=dev-super-secret-change-this`
2. Install deps: `npm install`
3. Run: `npm run dev` (uses Node directly)

Endpoints:
- POST `/api/auth/login` { email, password }
- POST `/api/auth/logout`
- POST `/api/auth/refresh`
- GET `/api/auth/me` (Bearer accessToken)
- GET `/api/users/` (admin|manager)
- POST `/api/users/invite` (admin)

Mock users: 20 seeded users
- Admin: email `user1@example.com`, password `Password1!`
- Managers: `user2..user5@example.com` with `PasswordX!`
- Users: `user6..user20@example.com` with `PasswordX!` 