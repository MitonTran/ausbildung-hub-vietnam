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
-- Two attack surfaces are closed here:
--
--   * UPDATE: the "Users can update pending own verification
--     requests" policy lets owners edit their own pending requests
--     (evidence files, typos). Without a trigger, an owner could
--     also self-approve via `update user_verifications set
--     status = 'approved' where id = <own_id>`: USING is satisfied
--     (old.status = 'pending') and WITH CHECK is satisfied
--     (user_id = auth.uid()).
--   * INSERT: the "Users can create own verification requests"
--     policy WITH CHECK only validates ownership of user_id, not
--     the values of status/reviewed_by/admin_note. Without a
--     trigger, an owner could self-approve **on creation** via
--     `insert into user_verifications (user_id, status, ...)
--      values ('<self>', 'approved', ...)`.
--
-- The trigger fires BEFORE INSERT OR UPDATE and, for non-admins,
-- either reverts each protected column to its OLD value (UPDATE)
-- or clamps it to the safe default (INSERT). Admins and rows
-- inserted with no JWT (service role) are passed through.
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

  -- Admins / super_admins can write any value.
  if public.is_admin(acting_uid) then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    -- Clamp moderation columns to their safe defaults so a user
    -- cannot ship a row that is already approved.
    new.status           := 'pending';
    new.reviewed_by      := null;
    new.reviewed_at      := null;
    new.expires_at       := null;
    new.rejection_reason := null;
    new.admin_note       := null;
    return new;
  end if;

  -- UPDATE: revert moderation columns. user_id is also pinned so
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
  before insert or update on public.user_verifications
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

-- Privilege-escalation trigger on organization_verifications.
--
-- The "Org members can create verification requests" INSERT policy
-- WITH CHECK only validates that the caller is a member of the
-- target organization and that submitted_by = auth.uid(); it does
-- not constrain status/reviewed_by/admin_note. Without this
-- trigger, an org member could ship a row that is already approved
-- via `insert into organization_verifications (..., status,
-- reviewed_by, admin_note) values (..., 'approved', '<self>',
-- 'lgtm')` and bypass the admin verification queue entirely.
--
-- There is no UPDATE policy for non-admins on this table (only the
-- admin "for all" policy can update), so the UPDATE branch is
-- defensive: it costs nothing and matches the pattern used by the
-- other tables.
create or replace function public.organization_verifications_prevent_privilege_escalation()
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

  if public.is_admin(acting_uid) then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.status           := 'pending';
    new.reviewed_by      := null;
    new.reviewed_at      := null;
    new.expires_at       := null;
    new.rejection_reason := null;
    new.admin_note       := null;
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id then
    new.organization_id := old.organization_id;
  end if;
  if new.submitted_by is distinct from old.submitted_by then
    new.submitted_by := old.submitted_by;
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

drop trigger if exists organization_verifications_prevent_privilege_escalation on public.organization_verifications;
create trigger organization_verifications_prevent_privilege_escalation
  before insert or update on public.organization_verifications
  for each row execute function public.organization_verifications_prevent_privilege_escalation();


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

-- Active members of the publishing organization can manage their own
-- job orders (CRUD job content). The
-- `job_orders_prevent_privilege_escalation` trigger below prevents
-- non-admins from self-promoting their own job into the public
-- listing or self-granting the trust badge — see
-- /docs/rls-policy.md §8 ("members must not directly set
-- verification_status = approved unless through admin workflow") and
-- /docs/trust-engine.md §"Organization admins must not self-approve
-- verification or badges".
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

-- Privilege-escalation trigger on job_orders.
--
-- The "Org members can manage own job orders" policy is
-- deliberately broad (`for all`) so org members can create, edit
-- content on, and delete their own draft postings. Without this
-- trigger, the same policy would let them:
--
--   * UPDATE: self-publish + self-grant the trust badge:
--       update job_orders
--       set verification_status = 'basic_verified',
--           status              = 'published',
--           last_verified_at    = now(),
--           is_sponsored        = true
--       where organization_id = <own_org>;
--
--   * INSERT: ship a row that is already published + verified:
--       insert into job_orders (organization_id, ..., status,
--           verification_status, is_sponsored)
--       values ('<own_org>', ..., 'published',
--           'basic_verified', true);
--
-- Both paths bypass the admin moderation / sponsorship workflow.
--
-- Protected columns and rationale:
--   verification_status   admin-only badging (per /docs/rls-policy.md §8)
--   last_verified_at      admin-only (audit trail of admin's review)
--   is_sponsored          admin-only (paid sponsorship is an admin op)
--   deleted_at            admin-only (soft-delete bypasses moderation)
--   status                state-machine: org members may only move
--                         a job through their own legitimate
--                         transitions {draft, pending_verification,
--                         filled}. Promoting to published / under_review /
--                         suspended / rejected / closing_soon / expired
--                         is admin-only — those reflect the platform's
--                         moderation decision, not the org's.
--
-- On INSERT, non-admins always start at `(status='draft',
-- verification_status='pending_verification', is_sponsored=false)`
-- (the table's own column defaults). On UPDATE, non-admin writes
-- to those columns are reverted to OLD.
--
-- Admins / super_admins (and rows written with no JWT, i.e.
-- service role) bypass this trigger entirely.
create or replace function public.job_orders_prevent_privilege_escalation()
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

  if public.is_admin(acting_uid) then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    -- A non-admin INSERT must start in the draft moderation state,
    -- regardless of what the client passed. The status itself is
    -- allowed to be 'draft' or 'pending_verification' (org may
    -- submit for review at creation time); anything else is forced
    -- to 'draft'.
    if new.status is null
       or new.status not in ('draft', 'pending_verification') then
      new.status := 'draft';
    end if;
    new.verification_status := 'pending_verification';
    new.last_verified_at    := null;
    new.is_sponsored        := false;
    new.deleted_at          := null;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    new.verification_status := old.verification_status;
  end if;
  if new.last_verified_at is distinct from old.last_verified_at then
    new.last_verified_at := old.last_verified_at;
  end if;
  if new.is_sponsored is distinct from old.is_sponsored then
    new.is_sponsored := old.is_sponsored;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_at := old.deleted_at;
  end if;

  -- status: allow only the org-driven subset of the state machine.
  -- Anything else (publishing, suspending, expiring, etc.) is admin
  -- territory and is silently reverted.
  if new.status is distinct from old.status
     and new.status not in ('draft', 'pending_verification', 'filled') then
    new.status := old.status;
  end if;

  return new;
end;
$$;

drop trigger if exists job_orders_prevent_privilege_escalation on public.job_orders;
create trigger job_orders_prevent_privilege_escalation
  before insert or update on public.job_orders
  for each row execute function public.job_orders_prevent_privilege_escalation();


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
-- Closes both UPDATE and INSERT self-publish attacks:
--
--   * UPDATE: the "Users can update pending own reviews" policy
--     lets an owner mutate their own review while it is pending.
--     Without a trigger they could publish it themselves via
--     `update reviews set moderation_status='published' where
--      id = <own_id>` because the WITH CHECK only validates
--     reviewer ownership.
--   * INSERT: the "Users can create own reviews" policy WITH CHECK
--     only validates that reviewer_id = auth.uid(). Without a
--     trigger they could self-publish on creation via `insert
--     into reviews (reviewer_id, moderation_status, published_at,
--     ...) values ('<self>', 'published', now(), ...)`.
--
-- For non-mods, INSERT clamps moderation columns to their safe
-- defaults; UPDATE reverts them to OLD. Moderators / admins /
-- super_admins (and rows written with no JWT) bypass.
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

  -- Moderators, admins, and super_admins can write any value.
  if public.is_moderator_or_admin(acting_uid) then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.moderation_status := 'pending';
    new.published_at      := null;
    new.rejected_reason   := null;
    new.dispute_status    := null;
    new.deleted_at        := null;
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
  before insert or update on public.reviews
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
-- Closes both UPDATE and INSERT self-approval attacks. The
-- "Users can upload proofs for own reviews" INSERT policy WITH
-- CHECK only validates that the parent review belongs to the
-- caller; without this trigger the user could ship a row that
-- already has `status='approved', reviewed_by=<self>`. Same shape
-- as the user_verifications fix.
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

  if TG_OP = 'INSERT' then
    new.status           := 'pending';
    new.reviewed_by      := null;
    new.reviewed_at      := null;
    new.rejection_reason := null;
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
  before insert or update on public.review_proofs
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

-- Privilege-escalation trigger on report_flags.
--
-- The "Authenticated users can create reports" INSERT policy WITH
-- CHECK only validates that the caller is the reporter. It does not
-- constrain `status`, `severity`, `handled_by`, `handled_at`,
-- `outcome`, or `internal_note`. Without this trigger, a user could
-- ship a row that closes itself, sets a triage outcome, or attaches
-- moderator-only `internal_note` content via:
--
--   insert into report_flags
--     (reporter_id, target_type, target_id, reason,
--      status, handled_by, handled_at, outcome, internal_note,
--      severity)
--   values
--     ('<self>', 'review', '<some-review-id>', 'spam',
--      'resolved', '<self>', now(), 'no action', 'self-closed',
--      'low');
--
-- bypassing the moderation queue or poisoning the queue with
-- attacker-chosen severity. The trigger clamps these columns on
-- INSERT for non-mods and reverts them on UPDATE.
--
-- There is no UPDATE policy for non-mods on this table, so the
-- UPDATE branch is defensive but harmless.
create or replace function public.report_flags_prevent_privilege_escalation()
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

  if TG_OP = 'INSERT' then
    new.status        := 'open';
    new.severity      := 'medium';
    new.handled_by    := null;
    new.handled_at    := null;
    new.outcome       := null;
    new.internal_note := null;
    return new;
  end if;

  if new.reporter_id is distinct from old.reporter_id then
    new.reporter_id := old.reporter_id;
  end if;
  if new.status is distinct from old.status then
    new.status := old.status;
  end if;
  if new.severity is distinct from old.severity then
    new.severity := old.severity;
  end if;
  if new.handled_by is distinct from old.handled_by then
    new.handled_by := old.handled_by;
  end if;
  if new.handled_at is distinct from old.handled_at then
    new.handled_at := old.handled_at;
  end if;
  if new.outcome is distinct from old.outcome then
    new.outcome := old.outcome;
  end if;
  if new.internal_note is distinct from old.internal_note then
    new.internal_note := old.internal_note;
  end if;

  return new;
end;
$$;

drop trigger if exists report_flags_prevent_privilege_escalation on public.report_flags;
create trigger report_flags_prevent_privilege_escalation
  before insert or update on public.report_flags
  for each row execute function public.report_flags_prevent_privilege_escalation();


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

-- Privilege-escalation trigger on dispute_cases.
--
-- The "Users can create own disputes" INSERT policy WITH CHECK only
-- validates that opened_by = auth.uid(). It does not constrain
-- `status`, `assigned_to`, `resolution`, `resolved_by`, or
-- `resolved_at`. Without this trigger, a user could:
--
--   * mark their own dispute resolved on creation:
--       insert into dispute_cases
--         (opened_by, target_type, target_id, dispute_type, summary,
--          status, resolution, resolved_by, resolved_at, assigned_to)
--       values
--         ('<self>', 'organization', '<some-org-id>', 'fee_dispute',
--          'x', 'resolved', 'fully refunded', '<self>', now(),
--          '<self>');
--   * spam-assign a dispute to a specific moderator on creation
--     (poisoning the moderator's queue or routing logic).
--
-- The trigger clamps these columns on INSERT for non-mods and
-- reverts them on UPDATE. There is no UPDATE policy for non-mods on
-- this table, so the UPDATE branch is defensive.
create or replace function public.dispute_cases_prevent_privilege_escalation()
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

  if TG_OP = 'INSERT' then
    new.status      := 'open';
    new.assigned_to := null;
    new.resolution  := null;
    new.resolved_by := null;
    new.resolved_at := null;
    return new;
  end if;

  if new.opened_by is distinct from old.opened_by then
    new.opened_by := old.opened_by;
  end if;
  if new.status is distinct from old.status then
    new.status := old.status;
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    new.assigned_to := old.assigned_to;
  end if;
  if new.resolution is distinct from old.resolution then
    new.resolution := old.resolution;
  end if;
  if new.resolved_by is distinct from old.resolved_by then
    new.resolved_by := old.resolved_by;
  end if;
  if new.resolved_at is distinct from old.resolved_at then
    new.resolved_at := old.resolved_at;
  end if;

  return new;
end;
$$;

drop trigger if exists dispute_cases_prevent_privilege_escalation on public.dispute_cases;
create trigger dispute_cases_prevent_privilege_escalation
  before insert or update on public.dispute_cases
  for each row execute function public.dispute_cases_prevent_privilege_escalation();


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
