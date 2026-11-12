# Regression checklist

Run in full before every promotion `development` → `testing` and `testing` → `main`.
Tick on desktop Chrome **and** a real phone. Log any failure in `BUGS.md`.

## Automated
- [ ] `cd backend && npm test` — all pass
- [ ] `cd frontend && npm run lint && npm run build` — no errors

## Landing page
- [ ] Header shows on every shop page: Collections, Stones, Our promise, Sign in (or "Hi, name")
- [ ] Hero film plays once in place; "Pause film" / "Replay film" work; the page never scrolls by itself
- [ ] "Shop by stone" lists all 32 stones; a stone opens `/collections?stone=...`
- [ ] Collection cards and "Shop the collection" open a collection page (products, or "being added")
- [ ] A product card opens its product page: photos switch, price, details, variants and related pieces show; an unknown product says "not available"
- [ ] Stone to Setting: Citrine → London Blue Topaz play in turn; captions + links appear; "Next" works
- [ ] With OS "reduce motion" on: no film, stills shown
- [ ] No horizontal scroll at 360 px width

## Auth (Module 2)
- [ ] Register → code email arrives → verified and signed in, welcome shown
- [ ] Wrong code 5× → locked; resend cooldown 60 s
- [ ] Login / logout; "log out all devices"
- [ ] Third device login asks which device to sign out (2-device cap); revoking a device from Account works
- [ ] Forgot password → code → new password → old sessions signed out
- [ ] Protected pages redirect to login and come back after sign-in
- [ ] Address book: add, edit, delete, set default (always exactly one default; no limit on how many)
- [ ] Change password: wrong current → error; same as current → error; success signs out other devices only
- [ ] Delete account: wrong password → error; success → signed out, email can register again
- [ ] Session ended elsewhere (sign out of all devices on another device) → this tab goes to sign-in with a message
- [ ] Name with a link ("evil.com") or phone without +country code → field error
- [ ] Unknown URL shows the 404 page

## Deployed (testing server only)
- [ ] `<render-url>/api/health` → ok
- [ ] `<render-url>/api/v1/auth/me` opened directly → 403 DIRECT_ACCESS
- [ ] Site sends `X-Robots-Tag: noindex`
