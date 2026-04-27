-- ===================================================================
-- 0003_trust_engine_rls.sql
-- Row Level Security for the Trust Engine.
--
-- Implements the policies in /docs/rls-policy.md for every Trust
-- Engine table created in 0001 and 0002. Specifically:
--
--   profiles                    (RLS already enabled in 0001 — we
--                                only TOP UP missing policies here)
--   organizations
--   organization_members
--   user_verifications
--   organization_verifications
--   reviews
--   review_proofs
--   report_flags
--   dispute_cases
--   audit_logs
--   job_orders
--   application_leads
--
-- Design notes:
--   * Helper functions are SECURITY DEFINER with an explicit
--     search_path so that policy expressions cannot be hijacked by a
--     caller-controlled search_path. They are also idempotent
--     (CREATE OR REPLACE).
--   * For helpers that conceptually take "the current user", we
--     expose a 0/1-arg variant that uses auth.uid() internally
--     (matching the signatures requested in the task) AND keep the
--     2-arg variants from /docs/rls-policy.md §2 so server code that
--     wants to ask "is some other user X?" still works.
--   * Policies are dropped-then-created so re-running the migration
--     is a no-op.
--   * Server-only mutations (verification approval, badge grants,
--     audit log writes, etc.) are expected to use the service role
--     key, which bypasses RLS. Policies here are written assuming
--     untrusted clients (anon + authenticated).
--   * /docs/rls-policy.md §4 and §8 also call for column-level
--     restrictions ("members must not update verification_status,
--     trust_badge, risk_score, suspension fields directly"). RLS
--     alone cannot express that — we add a BEFORE UPDATE trigger
--     `organizations_prevent_privilege_escalation` which mirrors the
--     existing `profiles_prevent_privilege_escalation` trigger from
--     0001.
--
-- This migration does NOT touch any auth.* tables. Idempotent — safe
-- to run multiple times.
-- ===================================================================


-- ===================================================================
-- 1. Helper functions
-- ===================================================================

-- is_admin(uid) — already defined in 0001. Re-create for safety so
-- this migration can apply stand-alone in a fresh project.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and role in ('admin', 'super_admin')
      and deleted_at is null
  );
$$;

-- is_admin() — convenience overload using auth.uid().
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin(auth.uid());
$$;

-- is_super_admin(uid) / is_super_admin() — strictly super_admin only.
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and role = 'super_admin'
      and deleted_at is null
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_super_admin(auth.uid());
$$;

-- is_moderator(uid) / is_moderator() — strictly moderator role.
-- For the common "moderator OR admin" check, use is_moderator_or_admin().
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and role = 'moderator'
      and deleted_at is null
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_moderator(auth.uid());
$$;

-- is_moderator_or_admin(uid) — already defined in 0001. Re-create.
create or replace function public.is_moderator_or_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and role in ('moderator', 'admin', 'super_admin')
      and deleted_at is null
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_moderator_or_admin(auth.uid());
$$;

-- is_org_member(org_id) — uses auth.uid() (matches task signature).
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

-- is_org_member(uid, org_id) — explicit two-arg form from
-- /docs/rls-policy.md §2 for server code.
create or replace function public.is_org_member(uid uuid, org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = uid
      and om.status = 'active'
  );
$$;

-- has_org_role(org_id, required_role) — true if the current user has
-- the given member_role on the given organization (and is active).
-- Roles are 'owner' | 'manager' | 'editor' | 'viewer' per
-- /docs/database-schema.md §2.3. The second parameter is named
-- `required_role` (not `member_role`) on purpose so it does not
-- shadow the `member_role` column on `organization_members`, which
-- would silently turn the equality check into `m.member_role =
-- m.member_role` (always true).
--
-- We DROP first because CREATE OR REPLACE FUNCTION cannot rename an
-- existing input parameter, and an earlier draft of this migration
-- used the (shadowing) `member_role` parameter name. CASCADE so we
-- can also drop and recreate any dependent RLS policies in this
-- same migration (they are unconditionally recreated below).
drop function if exists public.has_org_role(uuid, text) cascade;
create or replace function public.has_org_role(org_id uuid, required_role text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.member_role = required_role
      and om.status = 'active'
  );
$$;

-- owns_profile(user_id) — true if the given profile id is the
-- current authenticated user. Trivial helper, but it makes policy
-- expressions read like English ("using owns_profile(reviewer_id)").
-- SECURITY DEFINER so the function can call auth.uid() regardless of
-- the caller's grants on the auth schema (in environments where the
-- authenticated/anon roles have not been granted USAGE on auth).
create or replace function public.owns_profile(user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select user_id is not null and user_id = auth.uid();
$$;


-- ===================================================================
-- 2. profiles policies
--
-- Already enabled + base policies created in 0001. We do not redefine
-- the existing self-read / self-update / self-insert / admin-read /
-- admin-update policies here. The privilege-escalation trigger from
-- 0001 (`profiles_prevent_privilege_escalation`) prevents non-admins
-- from changing role / verified_stage / verification_status /
-- trust_score / risk_score even with the self-update policy active.
-- ===================================================================

-- Defensive: ensure RLS is on. (No-op if already enabled.)
alter table public.profiles enable row level security;


-- ===================================================================
-- 3. organizations policies
-- ===================================================================
alter table public.organizations enable row level security;

-- Visitors and authenticated users can SELECT only published,
-- non-suspended, non-soft-deleted organizations.
drop policy if exists "Anyone can read published organizations" on public.organizations;
create policy "Anyone can read published organizations"
  on public.organizations for select
  to anon, authenticated
  using (
    is_published = true
    and is_suspended = false
    and deleted_at is null
  );

-- Active members of an organization can read their organization in
-- any state (draft, suspended, expired) so the dashboard works.
drop policy if exists "Members can read own organizations" on public.organizations;
create policy "Members can read own organizations"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

-- Active members may update their own organization. The following
-- columns are reverted for non-admins by the BEFORE UPDATE trigger
-- `organizations_prevent_privilege_escalation` defined below:
--   verification_status, trust_badge, risk_score      (trust state)
--   is_suspended                                      (admin-only)
--   is_published                                      (admin-only:
--     /docs/trust-engine.md requires orgs to clear verification
--     before going live, so members cannot self-publish a draft)
--   last_verified_at, verification_expires_at         (trust state)
--   deleted_at                                        (soft-delete
--     is an admin operation; members must not bypass the moderation
--     queue by tombstoning their own org)
-- See /docs/rls-policy.md §4 "members must not update verification
-- status, trust badge, risk score, or suspension fields".
drop policy if exists "Members can update own organizations" on public.organizations;
create policy "Members can update own organizations"
  on public.organizations for update
  to authenticated
  using (public.is_org_member(id))
  with check (public.is_org_member(id));

-- Admins (admin / super_admin) can do anything on organizations.
drop policy if exists "Admins can manage organizations" on public.organizations;
create policy "Admins can manage organizations"
  on public.organizations for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Privilege-escalation trigger on organizations: revert non-admin
-- attempts to change trust columns. Admins / super_admins bypass.
-- Service role bypasses RLS entirely so this trigger is the only
-- thing standing between an org member and an unauthorized badge
-- self-grant via the public anon key.
create or replace function public.organizations_prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_uid uuid;
begin
  acting_uid := auth.uid();

  -- No session (e.g. trigger fired from a server-side function with
  -- security definer, or service role): allow.
  if acting_uid is null then
    return new;
  end if;

  -- Admins / super_admins can change any column.
  if public.is_admin(acting_uid) then
    return new;
  end if;

  -- Otherwise: silently revert any attempt to mutate trust columns,
  -- so that legitimate full-row UPDATEs from org members succeed for
  -- the safe columns.
  if new.verification_status is distinct from old.verification_status then
    new.verification_status := old.verification_status;
  end if;
  if new.trust_badge is distinct from old.trust_badge then
    new.trust_badge := old.trust_badge;
  end if;
  if new.risk_score is distinct from old.risk_score then
    new.risk_score := old.risk_score;
  end if;
  if new.is_suspended is distinct from old.is_suspended then
    new.is_suspended := old.is_suspended;
  end if;
  if new.is_published is distinct from old.is_published then
    new.is_published := old.is_published;
  end if;
  if new.last_verified_at is distinct from old.last_verified_at then
    new.last_verified_at := old.last_verified_at;
  end if;
  if new.verification_expires_at is distinct from old.verification_expires_at then
    new.verification_expires_at := old.verification_expires_at;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_at := old.deleted_at;
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_prevent_privilege_escalation on public.organizations;
create trigger organizations_prevent_privilege_escalation
  before update on public.organizations
  for each row execute function public.organizations_prevent_privilege_escalation();


-- ===================================================================
-- 4. organization_members policies
-- ===================================================================
alter table public.organization_members enable row level security;

-- A user can read membership rows that either belong to themselves
-- (so they see "I'm a member of org X") or belong to an organization
-- they are also an active member of (so admins inside the org can
-- see the member list).
drop policy if exists "Users can read own memberships" on public.organization_members;
create policy "Users can read own memberships"
  on public.organization_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
  );

-- Org owners may add / update / remove members of their own org.
-- Editors and viewers cannot. (has_org_role is the right helper for
-- this — it checks for the specific 'owner' role.)
drop policy if exists "Org owners can manage their organization members" on public.organization_members;
create policy "Org owners can manage their organization members"
  on public.organization_members for all
  to authenticated
  using (public.has_org_role(organization_id, 'owner'))
  with check (public.has_org_role(organization_id, 'owner'));

-- Admins (platform-level) can manage all org member rows.
drop policy if exists "Admins can manage organization members" on public.organization_members;
create policy "Admins can manage organization members"
  on public.organization_members for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));


-- ===================================================================
-- 5. user_verifications policies
-- ===================================================================
alter table public.user_verifications enable row level security;

-- A user can submit a verification request, but only for themselves.
-- WITH CHECK on user_id = auth.uid() prevents user A from submitting
-- a request that targets user B (which would otherwise leak evidence
-- into B's row).
drop policy if exists "Users can create own verification requests" on public.user_verifications;
create policy "Users can create own verification requests"
  on public.user_verifications for insert
  to authenticated
  with check (owns_profile(user_id));

-- A user can read only their own verification requests. Other users'
-- evidence and admin notes must remain private.
drop policy if exists "Users can read own verification requests" on public.user_verifications;
create policy "Users can read own verification requests"
  on public.user_verifications for select
  to authenticated
  using (owns_profile(user_id));

-- A user can edit their own request only while it is still in a
-- "user-actionable" state (pending or need_more_info). Once a
-- moderator/admin has acted, the row becomes immutable to the user.
drop policy if exists "Users can update pending own verification requests" on public.user_verifications;
create policy "Users can update pending own verification requests"
  on public.user_verifications for update
  to authenticated
  using (
    owns_profile(user_id)
    and status in ('pending', 'need_more_info')
  )
  with check (owns_profile(user_id));

-- Moderators and admins can read every verification request (the
-- moderation queue).
drop policy if exists "Moderators and admins can read user verification requests" on public.user_verifications;
create policy "Moderators and admins can read user verification requests"
  on public.user_verifications for select
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()));

-- Only admins can approve/reject (i.e. UPDATE the row's status,
-- reviewed_by, reviewed_at, expires_at, etc.). Approvals should
-- normally go through a server-side RPC that also writes audit_logs.
drop policy if exists "Admins can manage user verification requests" on public.user_verifications;
create policy "Admins can manage user verification requests"
  on public.user_verifications for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Privilege-escalation trigger on user_verifications.
--
-- The "Users can update pending own verification requests" policy
-- intentionally allows owners to edit their own pending requests
-- (they may need to add evidence files, fix typos, etc.). However
-- without a trigger, an owner could also self-approve their request
-- via `update user_verifications set status = 'approved' where id =
-- <own_id>`: USING is satisfied (old.status = 'pending') and
-- WITH CHECK is satisfied (user_id = auth.uid()). Splitting the
-- policy into per-column WITH CHECK clauses is not expressible in
-- standard Postgres RLS, so we mirror the
-- `profiles_prevent_privilege_escalation` pattern from 0001 and
-- silently revert any non-admin attempt to mutate the moderation
-- columns. Admins (and the service role, which bypasses RLS but
-- still hits this trigger) can change anything.
create or replace function public.user_verifications_prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_uid uuid;
begin
  acting_uid := auth.uid();

  -- No session (server-side function / service role with no JWT):
  -- allow the write through.
  if acting_uid is null then
    return new;
  end if;

  -- Admins / super_admins can change any column.
  if public.is_admin(acting_uid) then
    return new;
  end if;

  -- Otherwise: revert moderation columns. user_id is also pinned so
  -- a malicious owner cannot reassign their own request to another
  -- user.
  if new.user_id is distinct from old.user_id then
    new.user_id := old.user_id;
  end if;
  if new.status is distinct from old.status then
    new.status := old.status;
  end if;
  if new.reviewed_by is distinct from old.reviewed_by then
    new.reviewed_by := old.reviewed_by;
  end if;
  if new.reviewed_at is distinct from old.reviewed_at then
    new.reviewed_at := old.reviewed_at;
  end if;
  if new.expires_at is distinct from old.expires_at then
    new.expires_at := old.expires_at;
  end if;
  if new.rejection_reason is distinct from old.rejection_reason then
    new.rejection_reason := old.rejection_reason;
  end if;
  if new.admin_note is distinct from old.admin_note then
    new.admin_note := old.admin_note;
  end if;

  return new;
end;
$$;

drop trigger if exists user_verifications_prevent_privilege_escalation on public.user_verifications;
create trigger user_verifications_prevent_privilege_escalation
  before update on public.user_verifications
  for each row execute function public.user_verifications_prevent_privilege_escalation();


-- ===================================================================
-- 6. organization_verifications policies
-- ===================================================================
alter table public.organization_verifications enable row level security;

-- Active members of an organization can submit a verification
-- request on behalf of that organization. submitted_by must be the
-- current user so we have an honest audit trail.
drop policy if exists "Org members can create verification requests" on public.organization_verifications;
create policy "Org members can create verification requests"
  on public.organization_verifications for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and submitted_by = auth.uid()
  );

-- Active members of an organization can read all verification
-- requests for that organization. Requests for OTHER orgs remain
-- hidden.
drop policy if exists "Org members can read own organization verification requests" on public.organization_verifications;
create policy "Org members can read own organization verification requests"
  on public.organization_verifications for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Moderators / admins can read the full org-verification queue.
drop policy if exists "Moderators and admins can read organization verification requests" on public.organization_verifications;
create policy "Moderators and admins can read organization verification requests"
  on public.organization_verifications for select
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()));

-- Only admins can approve / reject / mutate org verification rows.
drop policy if exists "Admins can manage organization verification requests" on public.organization_verifications;
create policy "Admins can manage organization verification requests"
  on public.organization_verifications for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));


-- ===================================================================
-- 7. job_orders policies
-- ===================================================================
alter table public.job_orders enable row level security;

-- Anyone (anon + authenticated) can read job orders that are live —
-- i.e. status IN (published, closing_soon) and not soft-deleted.
-- Drafts, pending verification, expired, suspended, etc. are hidden
-- from the public.
drop policy if exists "Anyone can read published job orders" on public.job_orders;
create policy "Anyone can read published job orders"
  on public.job_orders for select
  to anon, authenticated
  using (
    status in ('published', 'closing_soon')
    and deleted_at is null
  );

-- Active members of the publishing organization can do anything on
-- their own job orders. Triggers / server code are responsible for
-- preventing them from setting verification_status = approved.
drop policy if exists "Org members can manage own job orders" on public.job_orders;
create policy "Org members can manage own job orders"
  on public.job_orders for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Admins can manage every job order.
drop policy if exists "Admins can manage all job orders" on public.job_orders;
create policy "Admins can manage all job orders"
  on public.job_orders for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Moderators can read all job orders (e.g. to triage reports), but
-- only admins can mutate them.
drop policy if exists "Moderators can read all job orders" on public.job_orders;
create policy "Moderators can read all job orders"
  on public.job_orders for select
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()));


-- ===================================================================
-- 8. reviews policies
-- ===================================================================
alter table public.reviews enable row level security;

-- Public read: only reviews that have been moderated and published,
-- and have not been soft-deleted. Pending / hidden / under_dispute /
-- removed reviews are private.
drop policy if exists "Anyone can read published reviews" on public.reviews;
create policy "Anyone can read published reviews"
  on public.reviews for select
  to anon, authenticated
  using (
    moderation_status = 'published'
    and deleted_at is null
  );

-- A user can submit a review only as themselves. Eligibility (does
-- this user actually have a relationship_to_target?) is enforced by
-- server code / a future can_review_target() function — see
-- /docs/database-schema.md §5.
drop policy if exists "Users can create own reviews" on public.reviews;
create policy "Users can create own reviews"
  on public.reviews for insert
  to authenticated
  with check (owns_profile(reviewer_id));

-- A user can read all of their own reviews regardless of moderation
-- state (so they can see "rejected" / "need_more_info" feedback).
drop policy if exists "Users can read own reviews" on public.reviews;
create policy "Users can read own reviews"
  on public.reviews for select
  to authenticated
  using (owns_profile(reviewer_id));

-- A user can edit their own review only while it is still pending or
-- waiting for more info. Once published / rejected / hidden, it is
-- locked.
drop policy if exists "Users can update pending own reviews" on public.reviews;
create policy "Users can update pending own reviews"
  on public.reviews for update
  to authenticated
  using (
    owns_profile(reviewer_id)
    and moderation_status in ('pending', 'need_more_info')
  )
  with check (owns_profile(reviewer_id));

-- Moderators and admins can manage the review moderation queue.
drop policy if exists "Moderators and admins can manage reviews" on public.reviews;
create policy "Moderators and admins can manage reviews"
  on public.reviews for all
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()))
  with check (public.is_moderator_or_admin(auth.uid()));

-- Privilege-escalation trigger on reviews.
--
-- Without this trigger, the "Users can update pending own reviews"
-- policy lets an owner publish their own review:
--   update reviews set moderation_status = 'published' where id = <own_id>;
-- USING passes (old.moderation_status = 'pending'), WITH CHECK
-- passes (reviewer_id = auth.uid()). The trigger reverts
-- moderation columns and the reviewer_id pin so non-mods cannot
-- self-publish, set publishing metadata, file rejection reasons, or
-- reassign authorship.
create or replace function public.reviews_prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_uid uuid;
begin
  acting_uid := auth.uid();

  if acting_uid is null then
    return new;
  end if;

  -- Moderators, admins, and super_admins can change any column.
  if public.is_moderator_or_admin(acting_uid) then
    return new;
  end if;

  if new.reviewer_id is distinct from old.reviewer_id then
    new.reviewer_id := old.reviewer_id;
  end if;
  if new.moderation_status is distinct from old.moderation_status then
    new.moderation_status := old.moderation_status;
  end if;
  if new.published_at is distinct from old.published_at then
    new.published_at := old.published_at;
  end if;
  if new.rejected_reason is distinct from old.rejected_reason then
    new.rejected_reason := old.rejected_reason;
  end if;
  if new.dispute_status is distinct from old.dispute_status then
    new.dispute_status := old.dispute_status;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_at := old.deleted_at;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_prevent_privilege_escalation on public.reviews;
create trigger reviews_prevent_privilege_escalation
  before update on public.reviews
  for each row execute function public.reviews_prevent_privilege_escalation();


-- ===================================================================
-- 9. review_proofs policies
-- -------------------------------------------------------------------
-- review_proofs holds metadata for sensitive review evidence files.
-- Per /docs/database-schema.md §3.5 (review-proof-private bucket)
-- these files are private — do NOT expose any anon read here. Even
-- the file_path column is sensitive because it points into the
-- private storage bucket.
-- ===================================================================
alter table public.review_proofs enable row level security;

-- Reviewers can attach proof rows to their own reviews. uploaded_by
-- must be the current user. file_path enforcement is handled at the
-- storage layer.
drop policy if exists "Users can upload proofs for own reviews" on public.review_proofs;
create policy "Users can upload proofs for own reviews"
  on public.review_proofs for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.reviewer_id = auth.uid()
    )
  );

-- Reviewers can read proof rows for their own reviews.
drop policy if exists "Users can read own review proofs" on public.review_proofs;
create policy "Users can read own review proofs"
  on public.review_proofs for select
  to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.reviewer_id = auth.uid()
    )
  );

-- Reviewers can update / delete their own proof rows while the
-- parent review is still pending.
drop policy if exists "Users can update own review proofs while pending" on public.review_proofs;
create policy "Users can update own review proofs while pending"
  on public.review_proofs for update
  to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.reviewer_id = auth.uid()
        and r.moderation_status in ('pending', 'need_more_info')
    )
  )
  with check (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.reviewer_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own review proofs while pending" on public.review_proofs;
create policy "Users can delete own review proofs while pending"
  on public.review_proofs for delete
  to authenticated
  using (
    exists (
      select 1 from public.reviews r
      where r.id = review_id
        and r.reviewer_id = auth.uid()
        and r.moderation_status in ('pending', 'need_more_info')
    )
  );

-- Moderators and admins can read / manage all proofs.
drop policy if exists "Moderators and admins can manage review proofs" on public.review_proofs;
create policy "Moderators and admins can manage review proofs"
  on public.review_proofs for all
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()))
  with check (public.is_moderator_or_admin(auth.uid()));

-- Privilege-escalation trigger on review_proofs.
--
-- The "Users can update own review proofs while pending" policy
-- allows a reviewer to edit their own proof rows, which is needed so
-- they can swap a wrong file or correct mime/path metadata. Without
-- this trigger, the same policy would also let them self-approve
-- their own evidence:
--   update review_proofs set status = 'approved' where id = <own_id>;
-- The trigger reverts the moderation columns (status, reviewed_by,
-- reviewed_at, rejection_reason) and the uploaded_by / review_id
-- pins for non-moderators.
create or replace function public.review_proofs_prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_uid uuid;
begin
  acting_uid := auth.uid();

  if acting_uid is null then
    return new;
  end if;

  if public.is_moderator_or_admin(acting_uid) then
    return new;
  end if;

  if new.review_id is distinct from old.review_id then
    new.review_id := old.review_id;
  end if;
  if new.uploaded_by is distinct from old.uploaded_by then
    new.uploaded_by := old.uploaded_by;
  end if;
  if new.status is distinct from old.status then
    new.status := old.status;
  end if;
  if new.reviewed_by is distinct from old.reviewed_by then
    new.reviewed_by := old.reviewed_by;
  end if;
  if new.reviewed_at is distinct from old.reviewed_at then
    new.reviewed_at := old.reviewed_at;
  end if;
  if new.rejection_reason is distinct from old.rejection_reason then
    new.rejection_reason := old.rejection_reason;
  end if;

  return new;
end;
$$;

drop trigger if exists review_proofs_prevent_privilege_escalation on public.review_proofs;
create trigger review_proofs_prevent_privilege_escalation
  before update on public.review_proofs
  for each row execute function public.review_proofs_prevent_privilege_escalation();


-- ===================================================================
-- 10. report_flags policies
-- ===================================================================
alter table public.report_flags enable row level security;

-- Any authenticated user can file a report. The reporter_id column
-- must equal auth.uid() so we cannot impersonate another reporter.
-- Anonymous reports must be created via a server-side RPC using the
-- service role.
drop policy if exists "Authenticated users can create reports" on public.report_flags;
create policy "Authenticated users can create reports"
  on public.report_flags for insert
  to authenticated
  with check (owns_profile(reporter_id));

-- A user can read their own filed reports (status, outcome, etc.)
-- but not other people's reports against unrelated content.
drop policy if exists "Users can read own reports" on public.report_flags;
create policy "Users can read own reports"
  on public.report_flags for select
  to authenticated
  using (owns_profile(reporter_id));

-- Moderators and admins can read every report and act on it.
drop policy if exists "Moderators and admins can manage reports" on public.report_flags;
create policy "Moderators and admins can manage reports"
  on public.report_flags for all
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()))
  with check (public.is_moderator_or_admin(auth.uid()));


-- ===================================================================
-- 11. dispute_cases policies
-- ===================================================================
alter table public.dispute_cases enable row level security;

-- Users can open a dispute on their own behalf.
drop policy if exists "Users can create own disputes" on public.dispute_cases;
create policy "Users can create own disputes"
  on public.dispute_cases for insert
  to authenticated
  with check (owns_profile(opened_by));

-- Users can read disputes they themselves opened. Disputes opened by
-- other users are private.
drop policy if exists "Users can read own disputes" on public.dispute_cases;
create policy "Users can read own disputes"
  on public.dispute_cases for select
  to authenticated
  using (owns_profile(opened_by));

-- Moderators and admins can read and act on every dispute. (The task
-- spec asks for "Admins can read all dispute cases" — we extend to
-- moderators because /docs/rls-policy.md §11 explicitly grants them
-- the same access.)
drop policy if exists "Moderators and admins can manage disputes" on public.dispute_cases;
create policy "Moderators and admins can manage disputes"
  on public.dispute_cases for all
  to authenticated
  using (public.is_moderator_or_admin(auth.uid()))
  with check (public.is_moderator_or_admin(auth.uid()));


-- ===================================================================
-- 12. audit_logs policies
-- -------------------------------------------------------------------
-- audit_logs is intentionally append-only and admin-readable. Per
-- /docs/audit-log-rules.md §2 and /docs/rls-policy.md §12:
--   * Inserts come from trusted server flows (service role) or
--     internal triggers / RPCs — there is NO insert policy for
--     anon / authenticated clients, so untrusted clients cannot
--     forge audit rows.
--   * Updates and deletes are blocked by the
--     `audit_logs_block_mutation` BEFORE triggers from 0002 even at
--     the service-role level.
--   * Admins (and super_admins) can SELECT.
-- ===================================================================
alter table public.audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- No other policies are added on purpose. The absence of an INSERT
-- policy means authenticated and anon clients cannot write audit
-- rows. The service role bypasses RLS and remains the canonical
-- writer. The append-only triggers in 0002 enforce the no-update /
-- no-delete invariant globally.


-- ===================================================================
-- 13. application_leads policies
-- ===================================================================
alter table public.application_leads enable row level security;

-- A signed-in student can submit a lead linked to their own profile.
-- Anonymous lead capture (e.g. landing-page form) must go through a
-- server-side RPC using the service role.
drop policy if exists "Users can create own leads" on public.application_leads;
create policy "Users can create own leads"
  on public.application_leads for insert
  to authenticated
  with check (owns_profile(student_id));

-- A user can read their own submitted leads.
drop policy if exists "Users can read own leads" on public.application_leads;
create policy "Users can read own leads"
  on public.application_leads for select
  to authenticated
  using (owns_profile(student_id));

-- Org members can read leads addressed to their organization or to
-- a job order owned by their organization. /docs/rls-policy.md §15
-- flags this as complex (target_type can vary); we implement the two
-- well-defined cases inline. Other target types must be served via a
-- server-side RPC.
drop policy if exists "Org members can read leads for owned target" on public.application_leads;
create policy "Org members can read leads for owned target"
  on public.application_leads for select
  to authenticated
  using (
    (
      target_type = 'organization'
      and public.is_org_member(target_id)
    )
    or (
      target_type = 'job_order'
      and exists (
        select 1
        from public.job_orders jo
        where jo.id = application_leads.target_id
          and public.is_org_member(jo.organization_id)
      )
    )
  );

-- Admins manage every lead.
drop policy if exists "Admins can manage all leads" on public.application_leads;
create policy "Admins can manage all leads"
  on public.application_leads for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
