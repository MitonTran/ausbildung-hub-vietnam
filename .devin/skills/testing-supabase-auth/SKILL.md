# Testing Supabase auth + RLS in this repo

Use this when verifying changes to Supabase clients, the auth flow, the profiles migration, role gating, or RLS / privilege-escalation guards.

## TL;DR — happy path (~5 min once you have keys)

1. Get a Supabase project (see "Project access" below). You need three values: project URL, anon key, service-role key.
2. Apply the migration: paste `supabase/migrations/0001_profiles_foundation.sql` into Supabase SQL editor (`https://supabase.com/dashboard/project/<ref>/sql/new`) and Run. Idempotent.
3. Disable email confirmation in the project for the test run (Authentication → Providers → Email → toggle off Confirm email → Save), OR use the Auth admin API to confirm test users via the service-role key.
4. Write `.env.local` at the repo root with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Run `npm run dev`.
5. Drive register → /dashboard → /admin (denied) → privilege-escalation regression → service-role admin promotion → /admin (allowed) → logout in the browser. Record.

## Why `supabase start` will probably NOT work on a shared Devin VM

The Supabase CLI's local stack pulls 13 images from `public.ecr.aws/supabase/...`. ECR Public has anonymous per-IP rate limits, and shared CI VMs hit them within a few sessions. Symptom: `toomanyrequests: Data limit exceeded` on every image during `supabase start`.

**Don't waste time fighting this.** Pivot to a Supabase Cloud throwaway project — it's faster anyway because you skip the Docker boot.

Docker Hub itself usually still works on the same VM, so you *can* spin up a vanilla `postgres:16-alpine` to syntax-check the migration. But you need a real GoTrue instance for `auth.signUp` / cookie sessions, and that's only available in the bundled stack or in Supabase Cloud.

## Project access — three options for the user

1. **Skip the live auth flow.** Verify the migration on a vanilla Postgres + verify the UI in mock-fallback mode. Degraded but fast; OK only if you've already proven the SQL behaviour separately.
2. **Throwaway Supabase Cloud project for one session.** Free tier, ~30s to create. After the test, delete or rotate keys. This is the recommended default.
3. **Permanent org-scoped Supabase test project.** Save URL + anon + service-role as org secrets so future sessions just work. Best long-term.

Present all three via `message_user(content_type="user_question")`. When asking for keys, **prefer the secret-request UI over chat paste**, otherwise the JWTs end up in the session log.

## Applying the migration

JWT keys (anon, service-role) do **not** authenticate `psql` against the Supabase Postgres directly — the DB password is a separate credential. Two practical paths:

- **SQL editor (fastest).** Send the user a deep link to `https://supabase.com/dashboard/project/<ref>/sql/new` and attach the migration file. One paste + Run.
- **Direct psql.** Ask for the connection string from Project Settings → Database → "Connection string" (with password). Run `psql "$DATABASE_URL" -f supabase/migrations/0001_profiles_foundation.sql`.

Probe whether the migration is applied:
```bash
curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
  "$URL/rest/v1/profiles?select=id&limit=1"
```
`PGRST205` (`Could not find the table 'public.profiles'`) → not applied. `[]` or rows → applied.

## Email confirmation

Supabase Cloud projects default to "Confirm email" ON. With it on, `signUpAction` returns `data.session === null` and the form shows "Vui lòng kiểm tra email" — login won't proceed without a real magic-link click. Three workarounds:

- Toggle off in dashboard for the test run (cleanup recommendation: re-enable afterwards).
- After self-signup, PATCH the user via the Auth admin API to set `email_confirm: true`:
  ```bash
  curl -X PUT -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
    -H "Content-Type: application/json" -d '{"email_confirm":true}' \
    "$URL/auth/v1/admin/users/<user-id>"
  ```
- Probe state by self-signing-up a throwaway address and inspecting `data.access_token` / `data.user.email_confirmed_at`. If `email_confirmed_at` is set on signup, confirmation is OFF.

## Privilege-escalation regression — the pattern

The profiles migration includes a BEFORE UPDATE trigger that reverts changes to `role`, `verified_stage`, `verification_status`, `trust_score`, `risk_score` for non-admin sessions. To exercise it:

```bash
# 1. Get a user JWT (sign in as the victim — a normal student account)
TOKEN=$(curl -s -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<pw>"}' \
  "$URL/auth/v1/token?grant_type=password" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 2. Decode sub
USER_ID=$(python3 -c "import base64,json;p='$TOKEN'.split('.')[1];p+='='*(-len(p)%4);print(json.loads(base64.urlsafe_b64decode(p))['sub'])")

# 3. Attack: PATCH the user's own row using PUBLIC anon key + their JWT
curl -i -H "apikey: $ANON" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -X PATCH -d '{"role":"super_admin","trust_score":9999}' \
  "$URL/rest/v1/profiles?id=eq.$USER_ID"

# 4. Verify with service-role read
curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
  "$URL/rest/v1/profiles?select=role,trust_score&id=eq.$USER_ID"
```

**Pass:** PATCH returns 200 with the (silently reverted) row, OR returns an RLS error. The service-role read shows `role=student`, `trust_score=0`. **Fail:** the service-role read shows the privileged values — that means the trigger isn't installed or its `auth.uid()`/`is_admin` check is wrong.

## Promoting a user to admin for testing the /admin gate

Use the service role (it runs with `auth.uid()` null, so the privilege-escalation guard's `if acting_uid is null then return new` short-circuits and lets the change through):

```bash
curl -X PATCH -H "apikey: $SVC" -H "Authorization: Bearer $SVC" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"role":"admin"}' \
  "$URL/rest/v1/profiles?email=eq.<test-email>"
```

Then refresh `/dashboard` in the browser — the role badge should update from `Học viên` to `Quản trị viên` and the `Mở /admin` card should appear.

## Trust Engine + admin moderation testing

Use this section when verifying PRs that change public org/job pages, admin moderation queues, dispute pages, or any SELECT projection that should drop a moderator-only field (`risk_score`, `internal_note`, etc.).

### Mock-data gatekeeper gotcha (centers / companies)

`src/app/centers/[slug]/page.tsx` and `src/app/companies/[slug]/page.tsx` call `findCenter(slug)` / `findCompany(slug)` from `src/lib/mock-data.ts` **first** and return `notFound()` if the slug isn't in mock-data. The DB load via `loadOrgBySlug` only enhances the verification badge — it never gates rendering. Implications:

- Seeding a DB org with an arbitrary slug won't make the page render — it'll 404 in mock-data first.
- To actually exercise `loadOrgBySlug` filters (`is_published`, `is_suspended`, `deleted_at IS NULL`), reuse a slug that already exists in mock-data: e.g. `goethe-hub-can-tho`, `bremen-akademie-vinh` for centers; `siemens`, `bosch`, `b-braun`, `lidl` for companies. Then patch the seeded DB row's slug to match.
- The reverse — proving a hidden DB org is filtered — is observable via the page's header: the page uses `dbOrg?.brand_name ?? center.name`, so if `dbOrg` is correctly null the mock brand_name wins. Grep the served HTML for the DB-only brand_name; absent = filtered.

The `/jobs/[slug]` route does NOT have this gate — it queries `job_orders` directly, so seeded slugs work end-to-end and the route returns 404 cleanly when `status` is non-public.

### Canary-string pattern for SELECT projection fixes

When verifying a fix that drops a sensitive field from a SELECT (e.g. `internal_note` removed from `/disputes/mine`), set the field to a unique sentinel string in the DB and grep for it across served bytes:

```bash
CANARY="LEAK_CANARY_$(date +%s)_$RANDOM"
curl -s -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" \
  -X PATCH "$URL/rest/v1/dispute_cases?id=eq.<dispute-id>" \
  -d "{\"internal_note\":\"$CANARY\"}"
```

Then grep both the SSR HTML and the RSC fetch (see Playwright section below). Pre-fix, the canary would appear inside the serialized server-component payload. Post-fix, it shouldn't appear anywhere.

**Caveat — server-only fields don't distinguish.** If the field is fetched on the server but never passed to a client component, it never crosses the wire even pre-fix. (Example: `risk_score` on `/centers/[slug]` — `OrganizationVerificationBadge` is a server component, so the field was already not in the payload before the fix.) In that case, treat the test as a defense-in-depth regression check, not as e2e proof. Be honest about this in the report.

### Playwright over CDP for SSR HTML + RSC payload inspection

When the `computer(action="console")` action returns "Chrome is not in the foreground" (happens after window-state changes), connect to Chrome over CDP at `http://localhost:29229` instead. The browser is already authenticated — Playwright reuses the existing context.

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://localhost:29229")
    ctx = browser.contexts[0]
    pg = ctx.new_page()
    pg.goto("http://localhost:3000/disputes/mine", wait_until="networkidle")
    html = pg.content()
    print("CANARY in HTML:", "LEAK_CANARY_xxx" in html)
    # Also fetch the RSC chunk directly — this is where field projections leak
    rsc = pg.evaluate("""async () => (await fetch('/disputes/mine', { headers: { 'RSC': '1' } })).text()""")
    print("CANARY in RSC:", "LEAK_CANARY_xxx" in rsc)
```

The RSC fetch is the most decisive evidence — Next.js serializes server-component props to that chunk, so any field projected by the SQL but used as a prop to a client component will be visible there.

### REST seeding for moderation queues

When testing pagination or filter behaviour on admin queues, you usually need to seed >50 rows. The fastest way:

```bash
# Bulk insert via PostgREST POST with array body
python3 - <<PY
import json, urllib.request, os
url=os.environ['NEXT_PUBLIC_SUPABASE_URL']+"/rest/v1/user_verifications"
svc=os.environ['SUPABASE_SERVICE_ROLE_KEY']
rows=[{"user_id":"<existing-profile-id>","requested_stage":"studying_german",
       "verification_type":"manual_confirmation","status":"pending",
       "evidence_summary":f"devin-sec-pending #{i+1}"} for i in range(51)]
req=urllib.request.Request(url,data=json.dumps(rows).encode(),headers={
    "apikey":svc,"Authorization":f"Bearer {svc}",
    "Content-Type":"application/json","Prefer":"return=minimal"},method="POST")
print(urllib.request.urlopen(req).status)
PY
```

Always tag seeded rows with a recognisable prefix (e.g. `evidence_summary LIKE 'devin-sec-pending #%'`) so cleanup is a one-line DELETE.

Key check constraints to remember (migration 0002):
- `organizations.verification_status` ∈ {unverified, pending_review, basic_verified, trusted_partner, recently_updated, expired, rejected, suspended, revoked} — note `pending_review`, NOT `verified`.
- `job_orders.status` ∈ {draft, pending_verification, published, closing_soon, expired, filled, under_review, suspended, rejected}; only `published` and `closing_soon` are public.
- `user_verifications.verification_type` and `requested_stage` are enum-checked — cribbing the values straight from the migration is faster than guessing.

### Pagination assertions for admin queues

The shared `<AdminPagination>` component renders `Trang <pageNum> / <totalPages> · <totalCount> mục` and `Trước` / `Sau` buttons. The card description is `<totalCount> yêu cầu (đang xem <list.length>)`. To prove pagination is wired correctly:

1. Seed exactly 51 rows so total count and page boundary are unambiguous.
2. Visit `/admin/<queue>` (page 1). Assert: badge shows `51 yêu cầu (đang xem 50)`, footer shows `Trang 1 / 2 · 51 mục`, `Sau` is visible / `Trước` hidden.
3. Click `Sau` → URL becomes `/admin/<queue>?<filter>=<value>&page=2`. Assert: `(đang xem 1)`, `Trang 2 / 2 · 51 mục`, `Trước` visible / `Sau` hidden, AND the filter param is still in the URL.

If step 3 drops the filter from the URL, the `<AdminPagination>` `params` prop wasn't wired up by that page.

## Recording — what to capture

Keep the recording short and high-signal:
- `setup`: "Local Next.js dev server bound to a real Supabase project. Migration applied; 0 users."
- `test_start` / `assertion` per assertion in the plan.
- The full register form submission, the /admin redirect, the post-promotion /admin page render, and the logout → /dashboard bounce are the most informative scenes.

DevTools / browser console interactions are fine to omit — running the privilege-escalation test via `curl` from the shell is faster and produces cleaner evidence (HTTP status + JSON in the test report). Same goes for canary-string checks: prefer Playwright-over-CDP scripted checks (text output) over screenshots of devtools.

## Cleanup

- Delete the throwaway project (or rotate keys at Project Settings → API → "Reset anon" / "Reset service_role") if the keys touched chat logs.
- Re-enable Confirm email if you toggled it off.
- Stop the dev server.
- For seeded test rows on a permanent project, use predictable slugs / sentinel strings so a single `DELETE … WHERE slug LIKE 'devin-sec-%'` cleans up.

## Devin secrets needed

- `NEXT_PUBLIC_SUPABASE_URL` (plain, not sensitive)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (plain, sensitive — request via secret UI; subject to RLS but still worth treating as sensitive)
- `SUPABASE_SERVICE_ROLE_KEY` (plain, sensitive — bypasses RLS; never expose to the client)
- `TEST_ADMIN_EMAIL` (plain, not sensitive — email of an existing profile with `role IN (admin, super_admin)`)
- `TEST_ADMIN_PASSWORD` (plain, sensitive — password for `TEST_ADMIN_EMAIL`; alternative: reset via Auth admin API at session start)

Always present three options when asking: skip / session-only / org-scoped permanent.
