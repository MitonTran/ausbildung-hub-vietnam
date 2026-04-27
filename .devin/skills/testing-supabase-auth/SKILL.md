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

## Recording — what to capture

Keep the recording short and high-signal:
- `setup`: "Local Next.js dev server bound to a real Supabase project. Migration applied; 0 users."
- `test_start` / `assertion` per assertion in the plan.
- The full register form submission, the /admin redirect, the post-promotion /admin page render, and the logout → /dashboard bounce are the most informative scenes.

DevTools / browser console interactions are fine to omit — running the privilege-escalation test via `curl` from the shell is faster and produces cleaner evidence (HTTP status + JSON in the test report).

## Cleanup

- Delete the throwaway project (or rotate keys at Project Settings → API → "Reset anon" / "Reset service_role") if the keys touched chat logs.
- Re-enable Confirm email if you toggled it off.
- Stop the dev server.

## Devin secrets needed

- `NEXT_PUBLIC_SUPABASE_URL` (plain, not sensitive)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (plain, sensitive — request via secret UI; subject to RLS but still worth treating as sensitive)
- `SUPABASE_SERVICE_ROLE_KEY` (plain, sensitive — bypasses RLS; never expose to the client)

Always present three options when asking: skip / session-only / org-scoped permanent.
