# RatnaGiri Jewels — E-Commerce Web Application

MERN e-commerce platform for RatnaGiri Jewels, a handcrafted (mainly silver) jewellery brand.
Specs (SRS, Architecture, STS) are kept separately as PDFs.

## Structure
```
backend/    Express REST API (routes → middleware → controllers → services → models)
frontend/   Vite + React SPA (Redux Toolkit, React Router, GSAP, Tailwind v4)
media/      raw design sources (not in git)
netlify.toml, render.yaml   deployment config (see DEPLOY.md)
BUGS.md, REGRESSION_CHECKLIST.md
```

## Branches
- `development` — day-to-day work
- `testing` — deployed to the testing server (Netlify + Render); promote only after the full regression checklist
- `main` — production (later)

Flow: work on `development` → merge into `testing` → (later) merge into `main`.

## Running locally
1. `cd backend && cp .env.example .env` — fill in `MONGODB_URI` and generate `JWT_ACCESS_SECRET` +
   `OTP_HASH_SECRET` (command is in the file). Without `BREVO_API_KEY`, emails print in the backend
   terminal; without `UPSTASH_REDIS_URL`, OTPs live in memory.
2. `npm install && npm run dev`
3. Second terminal: `cd frontend && npm install && npm run dev` → http://localhost:5173
   (`/api` is proxied to the backend port from `backend/.env`).
4. Admin account: set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` in `backend/.env`, run `npm run seed:admin`.
5. Email check: `npm run email:test -- you@example.com` in `backend/`.

## Tests
`cd backend && npm test` — unit tests plus DB-backed auth tests (mongodb-memory-server). CI runs
the same on every push (`.github/workflows/ci.yml`).

## Deployment
See [DEPLOY.md](DEPLOY.md).
