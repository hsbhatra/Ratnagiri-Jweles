# Bug log

| # | Found | Module | Severity | Bug | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | 2026-10-24 live test | Infra | High | Vite dev proxy hard-coded to :5000; with backend `PORT=7000` every `/api` call returned 502 | Proxy target now read from `backend/.env` PORT (or `API_PROXY_TARGET`) | Fixed |
| 2 | 2026-10-24 live test | Auth | High | Code-request limit of 5 per IP / 15 min shared by register, resend and forgot-password (and counted invalid forms) — a few signups locked password reset for everyone on that IP, painful behind carrier NAT | Raised to 20 per IP; per-email 60s cooldown still blocks inbox spam | Fixed |
| 3 | 2026-10-24 live test | Auth | Medium | Login limit was 10 per IP, so one user's typos could block others on a shared IP | Now 10 per IP+email (brute-force guard) plus 60 per IP | Fixed |
| 4 | 2026-10-24 live test | Auth UI | Low | After verifying email the "Welcome" greeting never showed, and sign-in ignored the "return to" page — the guest-route redirect raced the page's own navigation | Guest route now redirects to the requested page; welcome flag kept in the auth store | Fixed |
| 5 | 2026-10-24 live test | Auth UI | Low | Sign-in/register/verify/reset pages had an empty browser-tab title (Helmet needs a single string) | Title built as one template string | Fixed |
