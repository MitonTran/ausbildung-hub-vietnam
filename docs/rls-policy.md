# Supabase RLS Policy Specification

This document defines Row Level Security rules for Ausbildung Hub Vietnam.

## 1. Principles

1. Never rely only on frontend checks.
2. Enable RLS on every table containing user, business, review, report, verification, lead, dispute, or audit data.
3. Public users should only read explicitly published public records.
4. Users can manage their own profile and submissions.
5. Organization admins can manage only organizations they belong to.
6. Admin and moderator privileges must be checked server-side.
7. Evidence files must not be publicly accessible.
8. Service role key must never be exposed in frontend code.

## 2. Helper Functions

Recommended helper functions:

```sql
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = uid
    and role in ('admin', 'super_admin')
    and deleted_at is null
  );
$$;

create or replace function public.is_moderator_or_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = uid
    and role in ('moderator', 'admin', 'super_admin')
    and deleted_at is null
  );
$$;

create or replace function public.is_org_member(uid uuid, org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where user_id = uid
    and organization_id = org_id
    and status = 'active'
  );
$$;
```

Important:

- Keep helper functions minimal.
- Avoid recursive policy references where possible.
- Use `security definer` carefully.
- Set `search_path` explicitly.

## 3. profiles Policies

RLS: enabled.

### Public read

Visitors may read limited public profile fields only through a sanitized view, not directly from `profiles`.

Recommended:

- Do not allow anonymous direct select on `profiles`.
- Create `public_profiles_view` if public user display is needed.

### User read own profile

```sql
create policy "Users can read own profile"
on profiles for select
to authenticated
using (id = auth.uid());
```

### User update own safe fields

Users may update personal fields but not role, verified stage, trust score, or risk score.

Use RPC or server action for sensitive profile updates. If direct update policy is used, enforce column-level controls in application code and triggers.

```sql
create policy "Users can update own profile"
on profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
```

### Admin read all profiles

```sql
create policy "Admins can read all profiles"
on profiles for select
to authenticated
using (public.is_admin(auth.uid()));
```

### Admin update profiles

```sql
create policy "Admins can update profiles"
on profiles for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

## 4. organizations Policies

RLS: enabled.

### Public read published organizations

```sql
create policy "Anyone can read published organizations"
on organizations for select
to anon, authenticated
using (
  is_published = true
  and is_suspended = false
  and deleted_at is null
);
```

### Members read own organizations

```sql
create policy "Members can read own organizations"
on organizations for select
to authenticated
using (public.is_org_member(auth.uid(), id));
```

### Members update own organizations

Organization members may update non-sensitive profile fields. They must not update verification status, trust badge, risk score, or suspension fields directly. Enforce this with server actions/triggers.

```sql
create policy "Members can update own organizations"
on organizations for update
to authenticated
using (public.is_org_member(auth.uid(), id))
with check (public.is_org_member(auth.uid(), id));
```

### Admin full access

```sql
create policy "Admins can manage organizations"
on organizations for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

## 5. organization_members Policies

RLS: enabled.

### Members can read membership of their organizations

```sql
create policy "Users can read own memberships"
on organization_members for select
to authenticated
using (user_id = auth.uid() or public.is_org_member(auth.uid(), organization_id));
```

### Admin manage organization members

```sql
create policy "Admins can manage organization members"
on organization_members for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

Initial organization owner assignment should happen through a server-side function or admin action.

## 6. user_verifications Policies

RLS: enabled.

### Users can create own verification requests

```sql
create policy "Users can create own verification requests"
on user_verifications for insert
to authenticated
with check (user_id = auth.uid());
```

### Users can read own verification requests

```sql
create policy "Users can read own verification requests"
on user_verifications for select
to authenticated
using (user_id = auth.uid());
```

### Users can update pending own requests

Users may update only requests not yet reviewed.

```sql
create policy "Users can update pending own verification requests"
on user_verifications for update
to authenticated
using (user_id = auth.uid() and status in ('pending', 'need_more_info'))
with check (user_id = auth.uid());
```

### Moderators/admins can read verification queue

```sql
create policy "Moderators and admins can read user verification requests"
on user_verifications for select
to authenticated
using (public.is_moderator_or_admin(auth.uid()));
```

### Admins can approve/reject verification

```sql
create policy "Admins can manage user verification requests"
on user_verifications for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

Recommended: approvals should be done through an RPC/server action that also updates `profiles.verified_stage` and writes `audit_logs`.

## 7. organization_verifications Policies

RLS: enabled.

### Organization members can create verification requests

```sql
create policy "Org members can create verification requests"
on organization_verifications for insert
to authenticated
with check (public.is_org_member(auth.uid(), organization_id));
```

### Organization members can read own verification requests

```sql
create policy "Org members can read own organization verification requests"
on organization_verifications for select
to authenticated
using (public.is_org_member(auth.uid(), organization_id));
```

### Admins can manage organization verification requests

```sql
create policy "Admins can manage organization verification requests"
on organization_verifications for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

## 8. job_orders Policies

RLS: enabled.

### Public read published job orders

```sql
create policy "Anyone can read published job orders"
on job_orders for select
to anon, authenticated
using (
  status in ('published', 'closing_soon')
  and deleted_at is null
);
```

### Organization members manage own job orders

```sql
create policy "Org members can manage own job orders"
on job_orders for all
to authenticated
using (public.is_org_member(auth.uid(), organization_id))
with check (public.is_org_member(auth.uid(), organization_id));
```

### Admins manage all job orders

```sql
create policy "Admins can manage all job orders"
on job_orders for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

Important:

- Organization members should not be able to directly set `verification_status = approved` unless through admin workflow.
- Use triggers or server-side validation.

## 9. reviews Policies

RLS: enabled.

### Public read published reviews

```sql
create policy "Anyone can read published reviews"
on reviews for select
to anon, authenticated
using (
  moderation_status = 'published'
  and deleted_at is null
);
```

### Users create reviews for themselves

```sql
create policy "Users can create own reviews"
on reviews for insert
to authenticated
with check (reviewer_id = auth.uid());
```

Important: eligibility should be checked server-side before insert or by a database function. RLS alone should not contain complex review eligibility logic unless well-tested.

### Users read own unpublished reviews

```sql
create policy "Users can read own reviews"
on reviews for select
to authenticated
using (reviewer_id = auth.uid());
```

### Users update pending own reviews

```sql
create policy "Users can update pending own reviews"
on reviews for update
to authenticated
using (reviewer_id = auth.uid() and moderation_status in ('pending', 'need_more_info'))
with check (reviewer_id = auth.uid());
```

### Moderators/admins manage reviews

```sql
create policy "Moderators and admins can manage reviews"
on reviews for all
to authenticated
using (public.is_moderator_or_admin(auth.uid()))
with check (public.is_moderator_or_admin(auth.uid()));
```

## 10. report_flags Policies

RLS: enabled.

### Authenticated users can create reports

```sql
create policy "Authenticated users can create reports"
on report_flags for insert
to authenticated
with check (reporter_id = auth.uid());
```

### Users can read own reports

```sql
create policy "Users can read own reports"
on report_flags for select
to authenticated
using (reporter_id = auth.uid());
```

### Moderators/admins can manage reports

```sql
create policy "Moderators and admins can manage reports"
on report_flags for all
to authenticated
using (public.is_moderator_or_admin(auth.uid()))
with check (public.is_moderator_or_admin(auth.uid()));
```

## 11. dispute_cases Policies

RLS: enabled.

### Users create disputes

```sql
create policy "Users can create own disputes"
on dispute_cases for insert
to authenticated
with check (opened_by = auth.uid());
```

### Users read own disputes

```sql
create policy "Users can read own disputes"
on dispute_cases for select
to authenticated
using (opened_by = auth.uid());
```

### Moderators/admins manage disputes

```sql
create policy "Moderators and admins can manage disputes"
on dispute_cases for all
to authenticated
using (public.is_moderator_or_admin(auth.uid()))
with check (public.is_moderator_or_admin(auth.uid()));
```

## 12. audit_logs Policies

RLS: enabled.

### Admins can read audit logs

```sql
create policy "Admins can read audit logs"
on audit_logs for select
to authenticated
using (public.is_admin(auth.uid()));
```

### No normal insert/update/delete from client

Do not allow direct client insert/update/delete. Audit logs should be written by trusted server code, database trigger, RPC, Edge Function, or service role.

Optional policy for server-generated authenticated insert is not recommended unless carefully restricted.

```sql
-- No update/delete policies for normal users.
```

## 13. articles Policies

RLS: enabled.

### Public read published articles

```sql
create policy "Anyone can read published articles"
on articles for select
to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
);
```

### Admin/editor manage articles

If editor role is added later, update helper function.

```sql
create policy "Admins can manage articles"
on articles for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

## 14. community_posts and comments Policies

### Public read approved published content

```sql
create policy "Anyone can read published community posts"
on community_posts for select
to anon, authenticated
using (
  status = 'published'
  and moderation_status = 'approved'
  and deleted_at is null
);
```

```sql
create policy "Anyone can read published comments"
on comments for select
to anon, authenticated
using (
  status = 'published'
  and moderation_status = 'approved'
  and deleted_at is null
);
```

### Authenticated users create own content

```sql
create policy "Users can create posts"
on community_posts for insert
to authenticated
with check (author_id = auth.uid());
```

```sql
create policy "Users can create comments"
on comments for insert
to authenticated
with check (author_id = auth.uid());
```

### Users update pending/own content

```sql
create policy "Users can update own posts"
on community_posts for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());
```

```sql
create policy "Users can update own comments"
on comments for update
to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());
```

### Moderators/admins manage community content

```sql
create policy "Moderators and admins can manage posts"
on community_posts for all
to authenticated
using (public.is_moderator_or_admin(auth.uid()))
with check (public.is_moderator_or_admin(auth.uid()));
```

```sql
create policy "Moderators and admins can manage comments"
on comments for all
to authenticated
using (public.is_moderator_or_admin(auth.uid()))
with check (public.is_moderator_or_admin(auth.uid()));
```

## 15. application_leads Policies

RLS: enabled.

### Users create own leads

```sql
create policy "Users can create own leads"
on application_leads for insert
to authenticated
with check (student_id = auth.uid());
```

### Users read own leads

```sql
create policy "Users can read own leads"
on application_leads for select
to authenticated
using (student_id = auth.uid());
```

### Organization members read leads for owned target

This is complex if `target_type` can vary. Prefer server-side API/RPC for lead access.

For MVP, if target is always organization or job_order, implement separate policies or views.

### Admins manage all leads

```sql
create policy "Admins can manage all leads"
on application_leads for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

## 16. Storage Policies

### 16.1 Public buckets

`public-assets`, `organization-logos`:

- Public read allowed.
- Authenticated uploads only where appropriate.
- Organization logo update only by org member or admin.

### 16.2 Private evidence buckets

Buckets:

- `verification-evidence-private`
- `review-proof-private`
- `dispute-evidence-private`

Rules:

- No public read.
- Users may upload only into own path.
- Example path format:
  - `user/{user_id}/verification/{verification_id}/{filename}`
  - `user/{user_id}/reviews/{review_id}/{filename}`
  - `disputes/{dispute_id}/{filename}`
- Admin/moderator access must be via server-generated signed URL.
- Never expose permanent public URLs.

## 17. Security Checklist

Before launch:

- [ ] RLS enabled on all sensitive tables.
- [ ] No service role key in frontend bundle.
- [ ] Private buckets are not public.
- [ ] Users cannot access other users' verification evidence.
- [ ] Organization admins cannot approve their own verification.
- [ ] Moderation actions write audit logs.
- [ ] Badge changes write audit logs.
- [ ] Job order status changes write audit logs.
- [ ] Dispute resolution writes audit logs.
- [ ] Admin routes are server-protected.
- [ ] All list queries are paginated.
- [ ] All file signed URLs expire quickly.
