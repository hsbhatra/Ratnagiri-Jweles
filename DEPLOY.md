# Deploying the testing server

| Piece | Where | Free tier |
|---|---|---|
| Storefront (frontend/) | Netlify | yes |
| API (backend/) | Render web service | yes (sleeps after 15 min idle) |
| Database | MongoDB Atlas M0 | yes |
| OTP store | Upstash Redis | yes |
| Email | Brevo (HTTPS API) | 300 emails/day |
| Uptime pings | UptimeRobot | yes |

Both hosts deploy the **`testing`** branch automatically on every push.
`netlify.toml` and `render.yaml` (repo root) hold the settings; secrets are typed into the
dashboards and never committed.

How the pieces talk: the browser only ever talks to the Netlify domain. Netlify proxies
`/api/*` to Render and signs each call; Render rejects API calls that are not signed, so the
`onrender.com` URL can't be used to get around the storefront. Cookies stay first-party.

---

## 1. MongoDB Atlas

1. cloud.mongodb.com → **Create** cluster → **M0 Free** → provider AWS, region **Singapore (ap-southeast-1)**.
2. **Database Access** → Add user (password auth). Save the username and password.
3. **Network Access** → Add IP → `0.0.0.0/0`. (Render's free plan has no fixed IP.)
4. **Connect → Drivers** → copy the string and put a database name before the `?`:
   `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/ratnagiri-testing?retryWrites=true&w=majority`
   → this is `MONGODB_URI`.

## 2. Upstash Redis (OTP store)

Production refuses to start without Redis, so the testing server needs it. Locally you can leave
`UPSTASH_REDIS_URL` empty (OTPs are then kept in memory).

1. Go to **console.upstash.com** → sign up with Google or GitHub (free, no card).
2. Open the **Redis** tab → **+ Create Database**.
3. Fill in:
   - **Name:** `ratnagiri-testing`
   - **Primary region:** AWS **ap-southeast-1 (Singapore)** — same region as the Render service, so OTP checks are fast
   - **Read regions:** none
   - **Plan:** **Free**
   - Leave eviction off, then **Create**.
4. On the database page, find the **Connect** section and choose the **ioredis** (Node.js) tab. It shows
   `new Redis("rediss://default:AbC…@xxxx-xxxx.upstash.io:6379")`.
   Copy the text inside the quotes — it starts with **`rediss://`** (two s = encrypted). That is `UPSTASH_REDIS_URL`.
   (Don't use the REST URL/token — the backend talks plain Redis.)
5. Treat it like a password: it goes only into Render's environment variables.
6. Check later: after a test sign-up on the testing server, open **Data Browser** in Upstash — an
   OTP key appears and disappears after 10 minutes.

## 3. Brevo (email)

Brevo works on every environment and can email anyone as soon as your sender address is verified —
no domain needed. It is called over HTTPS, so Render's SMTP block doesn't affect it.

1. **brevo.com** → sign up (free plan). Finish the profile questions; a brand-new account can be
   under review for a short while before it may send.
2. **Verify a sender:** click your name (top right) → **Senders, domains & dedicated IPs** → **Senders** →
   **Add a sender** → name `RatnaGiri Jewels`, email = the shop's email address → confirm the code sent to that inbox.
3. **API key:** your name → **SMTP & API** → **API keys** tab → **Generate a new API key** → name
   `ratnagiri-testing` → copy it (starts with `xkeysib-`, shown once). Make one key per environment
   (local, testing, production). Use the API key, not the SMTP key.
4. **Allow Render's changing IPs:** your name → **Security** → **Authorized IPs** → turn off blocking of
   unknown IP addresses. Otherwise Brevo rejects calls from Render with an "unrecognised IP" error.
5. Local check — in `backend/.env`:
   ```
   BREVO_API_KEY=xkeysib-…
   EMAIL_FROM=RatnaGiri Jewels <the-verified-sender@gmail.com>
   EMAIL_REPLY_TO=
   ```
   then `cd backend && npm install && npm run email:test -- any-address@gmail.com`.
   If nothing arrives: Brevo → **Transactional → Logs** shows what happened to each email.
6. **Deliverability:** sending "from" a Gmail address through Brevo works but may land in spam more
   often. Once the shop's domain is bought, add it under **Senders, domains & dedicated IPs → Domains**,
   add the DNS records Brevo shows (Brevo code, DKIM, DMARC), and switch `EMAIL_FROM` to an address on that domain.

## 4. Shared proxy secret

Generate one random value; it goes on **both** Render (`EDGE_PROXY_SECRET`) and Netlify (`API_SIGNATURE_TOKEN`):

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 5. Render (API)

1. Push the code, and merge `development` into `testing` (after the regression checklist).
2. dashboard.render.com → **New → Blueprint** → connect GitHub → pick the repo, branch `testing`.
   Render reads `render.yaml` and proposes the service `ratnagiri-api-testing`.
3. Fill in the prompted values:
   - `FRONTEND_ORIGIN` = `https://ratnagiri-testing.netlify.app` (the Netlify name you'll pick in step 6)
   - `MONGODB_URI`, `UPSTASH_REDIS_URL`, `BREVO_API_KEY`, `EMAIL_FROM` from steps 1–3
   - `EDGE_PROXY_SECRET` from step 4
   - `EMAIL_REPLY_TO` = an inbox you read (or leave empty)
   - `JWT_ACCESS_SECRET` / `OTP_HASH_SECRET` are generated by Render automatically.
4. **Apply**. When the deploy is live, note the URL (normally `https://ratnagiri-api-testing.onrender.com`).
   Open `<that URL>/api/health` → you should see `"status":"ok"`.
   If Render gave a different URL, update the `to =` line in `netlify.toml` and push.

## 6. Netlify (storefront)

1. app.netlify.com → **Add new project → Import an existing project → GitHub** → pick the repo.
2. **Branch to deploy: `testing`.** Build settings are read from `netlify.toml` (base `frontend`,
   command `npm run build`, publish `dist`) — leave the fields as detected.
3. Before deploying, add the environment variable **`API_SIGNATURE_TOKEN`** = the value from step 4
   (scope must include *Runtime*; "All scopes" is fine).
4. Deploy. Then **Project configuration → Change project name** → `ratnagiri-testing`, so the
   URL matches `FRONTEND_ORIGIN` on Render.

## 7. Check it

1. Open `https://ratnagiri-testing.netlify.app` → landing page, scenes autoplay.
2. Register with any email → the code arrives → you're signed in.
3. `https://ratnagiri-api-testing.onrender.com/api/v1/auth/me` opened directly → `403 DIRECT_ACCESS` (expected).
4. Optional admin account on the testing DB: in `backend/.env` temporarily set `MONGODB_URI` to
   the Atlas string plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`, run `npm run seed:admin`,
   then switch `MONGODB_URI` back.

## 8. UptimeRobot (keeps the free API awake)

1. **uptimerobot.com** → sign up (free).
2. **+ New monitor** → type **HTTP(s)** → friendly name `RatnaGiri API testing` →
   URL `https://ratnagiri-api-testing.onrender.com/api/health` → interval **5 minutes** → Create.
3. It pings the API's health check (which skips the proxy check and the rate limiter), so Render
   never reaches its 15-minute sleep, and you get an email if the API goes down. One always-on free
   service fits inside Render's 750 free hours a month.

## Known limits of the free testing setup

- **Cold starts.** Render's free API sleeps after 15 min without traffic and takes up to about a
  minute to wake. Netlify gives up on a proxied call after 26 s, so the first request after a nap
  can fail. Fix: UptimeRobot (step 8) keeps it awake. The paid Render plan budgeted for launch removes this.
- **Brevo free**: 300 emails/day.
- The testing site sends `X-Robots-Tag: noindex` so it stays out of Google. Remove that header
  for the production site.

## Git branches

`development` (work) → `testing` (this server) → `main` (production, later). `netlify.toml` and
`render.yaml` live on every branch; which branch each host deploys is set in the host
(`branch: testing` in `render.yaml`, "Branch to deploy" on Netlify).

## Production later

Same platforms, separate projects: a Netlify site and Render service deploying the production
branch, their own Atlas database (or cluster), Upstash database, Brevo API key and proxy secret,
the shop's custom domain on Netlify, a verified Brevo domain, and a paid Render instance.
