-- ===================================================================
-- 0001_profiles_foundation.sql
-- Foundation migration for the Trust Engine identity layer.
--
-- Creates the canonical `profiles` table per /docs/database-schema.md
-- and wires up the standard `handle_new_user` trigger so that every
-- new auth.users row gets a matching profile row automatically.
--
-- Apply with `supabase db push` or paste into the Supabase SQL editor.
-- This migration is idempotent — safe to run multiple times.
-- ===================================================================

-- 1. Required extensions ---------------------------------------------
create extension if not exists "pgcrypto";

-- 2. profiles table --------------------------------------------------
-- We deliberately use a TEXT role column with a CHECK constraint
-- (matching the schema doc) instead of a Postgres enum, to make future
-- role additions a one-line ALTER instead of an enum migration.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  full_name           text,
  avatar_url          text,
  phone               text,
  role                text not null default 'student',
  self_declared_stage text not null default 'exploring',
  verified_stage      text,
  verification_status text not null default 'unverified',
  trust_score         integer not null default 0,
  risk_score          integer not null default 0,
  last_active_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

-- Drop the legacy 4-value user_role enum dependency if a previous
-- demo schema created profiles.role as a `user_role` enum column.
-- (No-op when role is already TEXT.)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
      and udt_name = 'user_role'
  ) then
    alter table public.profiles
      alter column role drop default,
      alter column role type text using role::text,
      alter column role set default 'student';
  end if;
end $$;

-- Role CHECK constraint — keep in sync with src/lib/supabase/types.ts.
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'student',
    'center_admin',
    'employer_admin',
    'moderator',
    'admin',
    'super_admin'
  ));

-- Stage CHECK constraints (Trust Engine doc §5).
alter table public.profiles
  drop constraint if exists profiles_self_declared_stage_check;
alter table public.profiles
  add constraint profiles_self_declared_stage_check
  check (self_declared_stage in (
    'exploring','studying_german','studying_at_center','completed_center_course',
    'interviewed','contract_signed','visa_process','in_germany',
    'doing_ausbildung','alumni'
  ));

alter table public.profiles
  drop constraint if exists profiles_verified_stage_check;
alter table public.profiles
  add constraint profiles_verified_stage_check
  check (verified_stage is null or verified_stage in (
    'exploring','studying_german','studying_at_center','completed_center_course',
    'interviewed','contract_signed','visa_process','in_germany',
    'doing_ausbildung','alumni'
  ));

create index if not exists profiles_role_idx           on public.profiles(role);
create index if not exists profiles_email_idx          on public.profiles(lower(email));
create index if not exists profiles_last_active_at_idx on public.profiles(last_active_at desc);

-- updated_at trigger -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3. handle_new_user trigger ----------------------------------------
-- After every new auth.users row, insert a matching profiles row.
-- Pulls full_name and role from raw_user_meta_data when present, with
-- safe fallbacks. Service role / definer-owned function so it can write
-- under RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  meta_full_name text;
begin
  meta_role := nullif(new.raw_user_meta_data ->> 'role', '');
  meta_full_name := nullif(new.raw_user_meta_data ->> 'full_name', '');

  -- Only the three self-service roles are accepted from signup metadata.
  -- Privileged roles (moderator, admin, super_admin) must be granted by an
  -- existing admin via the service role / admin client; an attacker cannot
  -- bypass signUpAction and call auth.signUp directly to grant themselves
  -- a privileged role through raw_user_meta_data.
  if meta_role is null or meta_role not in (
    'student','center_admin','employer_admin'
  ) then
    meta_role := 'student';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, meta_full_name, meta_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. RLS helpers (per /docs/rls-policy.md §2) ------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
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
    select 1 from public.profiles
    where id = uid
      and role in ('moderator', 'admin', 'super_admin')
      and deleted_at is null
  );
$$;

-- 5. RLS policies on profiles ---------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile"   on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update profiles"   on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- The RLS policy below allows users to update their own row, but the
-- BEFORE UPDATE trigger `profiles_prevent_privilege_escalation` (defined
-- below) reverts attempts to change `role`, `verified_stage`,
-- `verification_status`, `trust_score`, or `risk_score` from a
-- non-admin session. This protects against a user calling
-- supabase.from('profiles').update({ role: 'super_admin' }) directly via
-- the public anon key.
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.profiles_prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_uid uuid;
begin
  acting_uid := auth.uid();

  -- Service-role / no-session contexts (e.g. handle_new_user trigger,
  -- admin client) bypass this guard. RLS already prevents anonymous
  -- callers from reaching this trigger via a normal session.
  if acting_uid is null then
    return new;
  end if;

  -- Admins / super admins can change any field.
  if public.is_admin(acting_uid) then
    return new;
  end if;

  -- Otherwise: revert any attempt to mutate trust/role/verification
  -- columns. We silently restore the old value rather than raising so
  -- that legitimate full-row UPDATEs from clients still succeed for the
  -- safe columns.
  if new.role is distinct from old.role then
    new.role := old.role;
  end if;
  if new.verified_stage is distinct from old.verified_stage then
    new.verified_stage := old.verified_stage;
  end if;
  if new.verification_status is distinct from old.verification_status then
    new.verification_status := old.verification_status;
  end if;
  if new.trust_score is distinct from old.trust_score then
    new.trust_score := old.trust_score;
  end if;
  if new.risk_score is distinct from old.risk_score then
    new.risk_score := old.risk_score;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;
create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.profiles_prevent_privilege_escalation();

-- Insert is normally done via the handle_new_user trigger, but we
-- allow self-insert as a fallback for clients that create profiles
-- explicitly with the user's own session.
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
