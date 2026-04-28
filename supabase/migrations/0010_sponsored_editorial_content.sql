-- ===================================================================
-- 0010_sponsored_editorial_content.sql
--
-- Implements sponsored / editorial content labeling per
-- /docs/trust-engine.md §9 ("Content Types") and
-- /docs/admin-moderation-flow.md §9 ("Sponsored Content Moderation").
--
-- Adds the canonical articles table from /docs/database-schema.md
-- §2.11 (with `content_type` and `sponsor_organization_id`), and
-- introduces a parallel `content_type` + `is_featured` pair on the
-- existing `organizations` and `job_orders` tables so that:
--
--   * articles, organization profile highlights, job order
--     promotions, and homepage featured sections all carry an
--     explicit content_type from the four-value enum below; and
--   * paid placement (`is_featured` / `is_sponsored`) stays
--     completely separate from the verified / trusted_partner
--     trust signals — it does NOT grant any verification badge.
--
-- Allowed content_type values (kept in sync with /docs/trust-engine.md §9):
--   * editorial         — Nội dung biên tập
--   * sponsored         — Nội dung tài trợ        (paid placement)
--   * partner_content   — Nội dung từ đối tác     (org-supplied)
--   * user_generated    — Nội dung từ người dùng
--
-- Idempotent — safe to re-run.
-- ===================================================================

create extension if not exists "pgcrypto";

-- The set_updated_at helper is defined in 0001/0002. We re-create it
-- defensively so this migration can be applied stand-alone.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ===================================================================
-- articles  (/docs/database-schema.md §2.11)
-- -------------------------------------------------------------------
-- Editorial, sponsored, partner-supplied, or user-generated long-form
-- content surfaced via /news. The `content_type` column is required
-- and defaults to 'editorial' so any row inserted without an explicit
-- type still gets a safe label rather than silently looking
-- editorial-by-omission.
-- ===================================================================
create table if not exists public.articles (
  id                       uuid primary key default gen_random_uuid(),
  author_id                uuid references public.profiles(id) on delete set null,
  title                    text not null,
  slug                     text unique,
  excerpt                  text,
  content                  text,
  cover_image_url          text,
  category                 text,
  read_time                integer,
  views                    integer not null default 0,
  tags                     text[] not null default '{}',
  content_type             text not null default 'editorial',
  sponsor_organization_id  uuid references public.organizations(id) on delete set null,
  is_featured              boolean not null default false,
  status                   text not null default 'draft',
  published_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

alter table public.articles
  drop constraint if exists articles_content_type_check;
alter table public.articles
  add constraint articles_content_type_check
  check (content_type in (
    'editorial',
    'sponsored',
    'partner_content',
    'user_generated'
  ));

alter table public.articles
  drop constraint if exists articles_status_check;
alter table public.articles
  add constraint articles_status_check
  check (status in (
    'draft',
    'pending_review',
    'published',
    'unpublished',
    'rejected'
  ));

-- A sponsored article must point at a sponsor organization. Partner
-- content optionally points at the partner org. Editorial and
-- user-generated content must not have a sponsor.
alter table public.articles
  drop constraint if exists articles_sponsor_consistency_check;
alter table public.articles
  add constraint articles_sponsor_consistency_check
  check (
    (content_type = 'sponsored'        and sponsor_organization_id is not null)
    or
    (content_type = 'partner_content')
    or
    (content_type in ('editorial', 'user_generated')
     and sponsor_organization_id is null)
  );

create index if not exists articles_status_idx
  on public.articles(status);
create index if not exists articles_content_type_idx
  on public.articles(content_type);
create index if not exists articles_sponsor_org_idx
  on public.articles(sponsor_organization_id);
create index if not exists articles_published_at_idx
  on public.articles(published_at desc);

select public._attach_set_updated_at('public.articles');


-- ===================================================================
-- organizations: content_type + is_featured
-- -------------------------------------------------------------------
-- Adds the same four-value `content_type` taxonomy to the org-profile
-- highlights surface, plus an explicit `is_featured` flag for paid
-- placement on the homepage / category landing pages.
--
-- Default of 'partner_content' reflects that organizations are
-- partner-supplied profiles by definition. Admins can flip the value
-- to 'sponsored' for paid placements; the public UI is then required
-- to label that placement accordingly (see ContentTypeBadge).
-- ===================================================================
alter table public.organizations
  add column if not exists content_type text not null default 'partner_content';

alter table public.organizations
  add column if not exists is_featured boolean not null default false;

alter table public.organizations
  drop constraint if exists organizations_content_type_check;
alter table public.organizations
  add constraint organizations_content_type_check
  check (content_type in (
    'editorial',
    'sponsored',
    'partner_content',
    'user_generated'
  ));

create index if not exists organizations_content_type_idx
  on public.organizations(content_type);
create index if not exists organizations_is_featured_idx
  on public.organizations(is_featured)
  where is_featured = true;


-- ===================================================================
-- job_orders: content_type + is_featured
-- -------------------------------------------------------------------
-- `is_sponsored` already exists on job_orders (added in 0002) and
-- represents paid promotion of a single job. We keep it for backward
-- compatibility but also add `content_type` so the public UI can pick
-- the right Vietnamese label, and a separate `is_featured` flag for
-- "appears in homepage featured section" placement that is decoupled
-- from the verified/trusted_partner badge.
-- ===================================================================
alter table public.job_orders
  add column if not exists content_type text not null default 'partner_content';

alter table public.job_orders
  add column if not exists is_featured boolean not null default false;

alter table public.job_orders
  drop constraint if exists job_orders_content_type_check;
alter table public.job_orders
  add constraint job_orders_content_type_check
  check (content_type in (
    'editorial',
    'sponsored',
    'partner_content',
    'user_generated'
  ));

create index if not exists job_orders_content_type_idx
  on public.job_orders(content_type);
create index if not exists job_orders_is_featured_idx
  on public.job_orders(is_featured)
  where is_featured = true;

-- Backfill: any job_order that was previously toggled to is_sponsored
-- gets its content_type aligned to 'sponsored' so the public UI label
-- matches reality without a manual admin touch.
update public.job_orders
   set content_type = 'sponsored'
 where is_sponsored = true
   and content_type <> 'sponsored';


-- ===================================================================
-- Privilege-escalation guard for organizations
-- -------------------------------------------------------------------
-- Mirrors the job_orders guard installed in 0003. Org members can
-- already update their own organization (per RLS), but they must NOT
-- be able to self-grant sponsored / featured / verified-looking
-- attributes by writing to:
--
--   verification_status, trust_badge, last_verified_at,
--   verification_expires_at, content_type, is_featured, is_suspended,
--   deleted_at
--
-- All of those are reset to OLD on UPDATE for non-admin actors. On
-- INSERT, content_type / is_featured fall back to safe defaults.
-- ===================================================================
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

  if acting_uid is null then
    return new;
  end if;

  if public.is_admin(acting_uid) then
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.verification_status     := 'unverified';
    new.trust_badge             := null;
    new.last_verified_at        := null;
    new.verification_expires_at := null;
    new.is_suspended            := false;
    new.deleted_at              := null;
    new.content_type            := 'partner_content';
    new.is_featured             := false;
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    new.verification_status := old.verification_status;
  end if;
  if new.trust_badge is distinct from old.trust_badge then
    new.trust_badge := old.trust_badge;
  end if;
  if new.last_verified_at is distinct from old.last_verified_at then
    new.last_verified_at := old.last_verified_at;
  end if;
  if new.verification_expires_at is distinct from old.verification_expires_at then
    new.verification_expires_at := old.verification_expires_at;
  end if;
  if new.is_suspended is distinct from old.is_suspended then
    new.is_suspended := old.is_suspended;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_at := old.deleted_at;
  end if;
  if new.content_type is distinct from old.content_type then
    new.content_type := old.content_type;
  end if;
  if new.is_featured is distinct from old.is_featured then
    new.is_featured := old.is_featured;
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_prevent_privilege_escalation
  on public.organizations;
create trigger organizations_prevent_privilege_escalation
  before insert or update on public.organizations
  for each row execute function public.organizations_prevent_privilege_escalation();


-- ===================================================================
-- Extend the existing job_orders privilege-escalation guard so it
-- also locks down the new content_type / is_featured columns.
-- The existing guard already covers verification_status,
-- last_verified_at, is_sponsored, deleted_at, status — we re-define
-- it here to additionally pin content_type and is_featured.
-- ===================================================================
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
    if new.status is null
       or new.status not in ('draft', 'pending_verification') then
      new.status := 'draft';
    end if;
    new.verification_status := 'pending_verification';
    new.last_verified_at    := null;
    new.is_sponsored        := false;
    new.is_featured         := false;
    new.content_type        := 'partner_content';
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
  if new.is_featured is distinct from old.is_featured then
    new.is_featured := old.is_featured;
  end if;
  if new.content_type is distinct from old.content_type then
    new.content_type := old.content_type;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_at := old.deleted_at;
  end if;

  -- status: org-driven subset only.
  if new.status is distinct from old.status then
    if old.status not in ('draft', 'pending_verification', 'filled')
       or new.status not in ('draft', 'pending_verification', 'filled') then
      new.status := old.status;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger already exists from 0003, but re-create defensively so the
-- updated function is wired in even if 0003 is replayed afterwards.
drop trigger if exists job_orders_prevent_privilege_escalation
  on public.job_orders;
create trigger job_orders_prevent_privilege_escalation
  before insert or update on public.job_orders
  for each row execute function public.job_orders_prevent_privilege_escalation();


-- ===================================================================
-- articles RLS
-- -------------------------------------------------------------------
-- * Anyone (including anon) can read articles that have been
--   published and are not soft-deleted.
-- * Only admin / super_admin can insert / update / delete (matches
--   /docs/rls-policy.md §11). Service role obviously bypasses RLS so
--   server actions running with the admin client can still mutate.
-- ===================================================================
alter table public.articles enable row level security;

drop policy if exists "Articles public read"             on public.articles;
drop policy if exists "Articles admin write"             on public.articles;

create policy "Articles public read"
  on public.articles
  for select
  using (
    status = 'published'
    and deleted_at is null
  );

create policy "Articles admin write"
  on public.articles
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
