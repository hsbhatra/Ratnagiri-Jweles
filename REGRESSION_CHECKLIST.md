# Regression checklist

Run in full before every promotion `development` → `testing` and `testing` → `main`.
Tick on desktop Chrome **and** a real phone. Log any failure in `BUGS.md`.

## Automated
- [ ] `cd backend && npm test` — all pass
- [ ] `cd frontend && npm run lint && npm run build` — no errors

## Landing page
- [ ] Hero shows title; one scroll plays Scene 1 → 2 → 3 by themselves
- [ ] Skip (and Esc) ends the current scene; the next one starts by itself
- [ ] Scrolling up inside a scene plays it backwards to its start
- [ ] Stone to Setting: Citrine → London Blue Topaz → Emerald play in turn; captions + links appear
- [ ] "Next" moves to the next stone; "Skip" on Emerald (or Emerald ending) moves to Collections
- [ ] With OS "reduce motion" on: no autoplay, final frames / stills shown
- [ ] No horizontal scroll at 360 px width

## Auth (Module 2)
- [ ] Register → code email arrives → verified and signed in, welcome shown
- [ ] Wrong code 5× → locked; resend cooldown 60 s
- [ ] Login / logout; "log out all devices"
- [ ] Third device login asks which device to sign out (2-device cap); revoking a device from Account works
- [ ] Forgot password → code → new password → old sessions signed out
- [ ] Protected pages redirect to login and come back after sign-in
- [ ] Address book: add, edit, delete, set default

## Deployed (testing server only)
- [ ] `<render-url>/api/health` → ok
- [ ] `<render-url>/api/v1/auth/me` opened directly → 403 DIRECT_ACCESS
- [ ] Site sends `X-Robots-Tag: noindex`
