-- ===================================================================
-- 0009_dispute_cases_extensions_and_storage.sql
-- Dispute Case workflow extensions.
--
-- Builds on the dispute_cases table created in 0002 and the RLS
-- policies in 0003 to support the full dispute workflow per
-- /docs/admin-moderation-flow.md §10, /docs/audit-log-rules.md §5.7,
-- and /docs/database-schema.md §2.9 + §3.4.
--
-- 1. Adds CHECK constraints on `target_type`, `dispute_type`, and
--    `resolution` so the queue only accepts the values the spec
--    enumerates. This is the same pattern used for report_flags
--    in 0007.
-- 2. Adds an `internal_note` text column so admins/moderators can
--    record private notes (parallel to report_flags.internal_note
--    introduced in 0007). The append-only history of changes lives
--    in audit_logs.
-- 3. Creates the private Supabase Storage bucket
--    `dispute-evidence-private` (/docs/database-schema.md §3.4)
--    plus per-user RLS on storage.objects, mirroring
--    0007_review_proof_storage.sql.
-- 4. Adds a SELECT RLS policy so active organization members can
--    read disputes that target their own organization or a job
--    order owned by their organization. The user-spec acceptance
--    criterion is "Organization admin sees only disputes related
--    to their organization." All other access continues to flow
--    through the existing "opener" / "moderator-or-admin" policies
--    from 0003.
--
-- Idempotent — safe to re-apply.
-- ===================================================================


-- ===================================================================
-- 1. CHECK constraints
-- ===================================================================

-- ---- target_type allow-list (the 6 dispute targets) ----
alter table public.dispute_cases
  drop constraint if exists dispute_cases_target_type_check;
alter table public.dispute_cases
  add constraint dispute_cases_target_type_check
  check (target_type in (
    'review',
    'organization',
    'job_order',
    'report_flag',
    'verification_decision',
    'content_removal'
  ));

-- ---- dispute_type allow-list (user-facing reason for the dispute) ----
alter table public.dispute_cases
  drop constraint if exists dispute_cases_dispute_type_check;
alter table public.dispute_cases
  add constraint dispute_cases_dispute_type_check
  check (dispute_type in (
    'review_unfair',
    'verification_unfair',
    'badge_revocation_unfair',
    'fee_dispute',
    'fake_job_order',
    'content_removal_unfair',
    'other'
  ));

-- ---- resolution allow-list (the 7 resolution options) ----
-- nullable: resolution is only set when the case is resolved.
alter table public.dispute_cases
  drop constraint if exists dispute_cases_resolution_check;
alter table public.dispute_cases
  add constraint dispute_cases_resolution_check
  check (
    resolution is null
    or resolution in (
      'keep_content',
      'remove_content',
      'redact_content',
      'restore_content',
      'revoke_badge',
      'suspend_profile',
      'no_action'
    )
  );


-- ===================================================================
-- 2. internal_note column
-- ===================================================================
alter table public.dispute_cases
  add column if not exists internal_note text;


-- ===================================================================
-- 3. Org-member SELECT policy on dispute_cases
-- -------------------------------------------------------------------
-- Active members of an organization can read disputes filed against
-- their organization directly, or filed against a job order owned by
-- their organization. We deliberately do NOT cascade visibility for
-- target_type='review' / 'verification_decision' / 'report_flag' /
-- 'content_removal' — those rows commonly contain reporter or
-- third-party information that should remain confined to the opener
-- and platform moderators until the case is reviewed.
-- ===================================================================
drop policy if exists "Org members can read disputes about their org"
  on public.dispute_cases;
create policy "Org members can read disputes about their org"
  on public.dispute_cases for select
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
        where jo.id = dispute_cases.target_id
          and public.is_org_member(jo.organization_id)
      )
    )
  );


-- ===================================================================
-- 4. Private bucket for dispute evidence
-- -------------------------------------------------------------------
-- Path layout (enforced in policy below):
--   user/<auth.uid()>/dispute/<dispute_id>/<filename>
-- Mirrors 0007_review_proof_storage.sql exactly.
-- ===================================================================
insert into storage.buckets (id, name, public)
values ('dispute-evidence-private', 'dispute-evidence-private', false)
on conflict (id) do update
  set public = excluded.public;


-- ===================================================================
-- 5. RLS policies on storage.objects, scoped to the dispute bucket
-- ===================================================================
alter table storage.objects enable row level security;

drop policy if exists "Users can upload own dispute evidence"
  on storage.objects;
create policy "Users can upload own dispute evidence"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dispute-evidence-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'dispute'
  );

drop policy if exists "Users can read own dispute evidence"
  on storage.objects;
create policy "Users can read own dispute evidence"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dispute-evidence-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'dispute'
  );

drop policy if exists "Users can update own dispute evidence"
  on storage.objects;
create policy "Users can update own dispute evidence"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dispute-evidence-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'dispute'
  )
  with check (
    bucket_id = 'dispute-evidence-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'dispute'
  );

drop policy if exists "Users can delete own dispute evidence"
  on storage.objects;
create policy "Users can delete own dispute evidence"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dispute-evidence-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'dispute'
  );
