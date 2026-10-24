# RatnaGiri Jewels — E-Commerce Web Application

MERN stack e-commerce platform for RatnaGiri Jewels, a handcrafted jewellery brand.

See `/docs` references: SRS, Architecture Document, STS (delivered separately as branded PDFs).

## Structure
- `backend/` — Express REST API (layered: routes -> middleware -> controllers -> services -> models)
- `frontend/` — Vite + React SPA

## Branches
- `development` — active work
- `testing` — pre-release, full regression checklist required before promotion

## Running locally
1. `cd backend && cp .env.example .env` — fill in `MONGODB_URI` (Atlas M0 is fine) and generate
   `JWT_ACCESS_SECRET` + `OTP_HASH_SECRET` (command is in the file). Without `RESEND_API_KEY`,
   OTP emails are printed to the backend console; without `UPSTASH_REDIS_URL`, OTPs live in memory.
2. `npm install && npm run dev` (API on :5000)
3. In another terminal: `cd frontend && npm install && npm run dev` (site on :5173 — `/api` is proxied
   to the backend so the `SameSite=strict` session cookies work).
4. Admin account: `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin` in `backend/`.

## Tests
`cd backend && npm test` — unit tests plus DB-backed auth tests (mongodb-memory-server downloads
a MongoDB binary on first run). CI runs the same on every push (`.github/workflows/ci.yml`).

## Production note
The frontend must reach the API same-origin: configure the host to rewrite `/api/*` to the
backend URL (e.g. a Vercel rewrite). If the API is ever served from a different site, set
`COOKIE_SAMESITE=none` on the backend.
