# Env

Required
- `DATABASE_URL` — Supabase Postgres connection string
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth client
- `NEXTAUTH_URL` — site origin (e.g., https://du-north.vercel.app)
- `AUTH_SECRET` — 32+ char random string (JWT/cookie signing)
- `OPENAI_API_KEY` — for chat formatting

Optional
- `NODE_ENV=production` on Vercel

Google console
- Authorized JavaScript origins: http://localhost:3000, https://du-north.vercel.app
- Authorized redirect URIs: http://localhost:3000/api/auth/callback/google, https://du-north.vercel.app/api/auth/callback/google
