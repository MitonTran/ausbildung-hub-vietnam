-- ===================================================================
-- 0002_trust_engine_schema.sql
-- Trust Engine database schema for Ausbildung Hub Vietnam.
--
-- Implements the tables defined in /docs/database-schema.md:
--   profiles                    (already created in 0001)
--   organizations
--   organization_members
--   user_verifications
--   organization_verifications
--   job_orders
--   reviews
--   review_proofs
--   report_flags
--   dispute_cases
--   audit_logs
--   application_leads
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid()).
--   * snake_case identifiers.
--   * created_at / updated_at timestamptz columns where relevant
--     (deleted_at on soft-deletable business objects).
--   * Status fields enforced with CHECK constraints (not enums) so
--     adding a value is a one-line ALTER, per /docs/database-schema.md
--     §1.
--   * updated_at columns are maintained by the shared trigger
--     `public.set_updated_at()` defined in 0001_profiles_foundation.sql.
--   * No RLS policies are defined here — they are added in a later
--     migration once the table set is finalised. RLS is intentionally
--     left disabled for these tables in this migration so the schema
--     can be reasoned about independently of the policy layer.
--
-- This migration does NOT touch any auth.* tables. It only creates
-- new public.* objects. Apply with `supabase db push` or paste into
-- the Supabase SQL editor. Idempotent — safe to re-run.
-- ===================================================================

create extension if not exists "pgcrypto";

-- The `public.set_updated_at()` function is defined in
-- 0001_profiles_foundation.sql. We re-create it here defensively so
-- this migration can be applied stand-alone (e.g. in a new project
-- snapshot) without depending on 0001 having been run first.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Helper: attach `set_updated_at` BEFORE UPDATE trigger to a table
-- if it has an updated_at column. Idempotent.
create or replace function public._attach_set_updated_at(target_table regclass)
returns void
language plpgsql
as $$
declare
  trg_name text;
  tbl_name text;
begin
  tbl_name := target_table::text; -- e.g. public.organizations
  trg_name := replace(replace(tbl_name, 'public.', ''), '.', '_') || '_set_updated_at';

  execute format('drop trigger if exists %I on %s', trg_name, tbl_name);
  execute format(
    'create trigger %I before update on %s
       for each row execute function public.set_updated_at()',
    trg_name, tbl_name
  );
end;
$$;


-- ===================================================================
-- profiles
-- -------------------------------------------------------------------
-- Already created in 0001_profiles_foundation.sql with the canonical
-- shape from /docs/database-schema.md §2.1 (role / stage CHECK
-- constraints, set_updated_at trigger, handle_new_user trigger,
-- privilege-escalation guard). Listed here for completeness; this
-- migration does not redefine it.
-- ===================================================================


-- ===================================================================
-- organizations  (/docs/database-schema.md §2.2)
-- ===================================================================
create table if not exists public.organizations (
  id                          uuid primary key default gen_random_uuid(),
  org_type                    text not null,
  legal_name                  text,
  brand_name                  text not null,
  slug                        text unique,
  country                     text,
  city                        text,
  address                     text,
  website_url                 text,
  contact_email               text,
  contact_phone               text,
  description                 text,
  services                    text[],
  verification_status         text not null default 'unverified',
  trust_badge                 text,
  last_verified_at            timestamptz,
  verification_expires_at     timestamptz,
  last_updated_by_org_at      timestamptz,
  risk_score                  integer not null default 0,
  is_published                boolean not null default false,
  is_suspended                boolean not null default false,
  created_by                  uuid references public.profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz
);

alter table public.organizations
  drop constraint if exists organizations_org_type_check;
alter table public.organizations
  add constraint organizations_org_type_check
  check (org_type in (
    'training_center',
    'consulting_center',
    'employer',
    'recruiter',
    'agency',
    'school',
    'other'
  ));

alter table public.organizations
  drop constraint if exists organizations_verification_status_check;
alter table public.organizations
  add constraint organizations_verification_status_check
  check (verification_status in (
    'unverified',
    'pending_review',
    'basic_verified',
    'trusted_partner',
    'recently_updated',
    'expired',
    'rejected',
    'suspended',
    'revoked'
  ));

create index if not exists organizations_org_type_idx
  on public.organizations(org_type);
create index if not exists organizations_slug_idx
  on public.organizations(slug);
create index if not exists organizations_verification_status_idx
  on public.organizations(verification_status);
create index if not exists organizations_created_by_idx
  on public.organizations(created_by);
create index if not exists organizations_created_at_idx
  on public.organizations(created_at desc);
create index if not exists organizations_verification_expires_at_idx
  on public.organizations(verification_expires_at);

select public._attach_set_updated_at('public.organizations');


-- ===================================================================
-- organization_members  (/docs/database-schema.md §2.3)
-- ===================================================================
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  member_role     text not null default 'manager',
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members
  drop constraint if exists organization_members_member_role_check;
alter table public.organization_members
  add constraint organization_members_member_role_check
  check (member_role in ('owner','manager','editor','viewer'));

alter table public.organization_members
  drop constraint if exists organization_members_status_check;
alter table public.organization_members
  add constraint organization_members_status_check
  check (status in ('active','invited','suspended','revoked'));

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);
create index if not exists organization_members_org_id_idx
  on public.organization_members(organization_id);
create index if not exists organization_members_status_idx
  on public.organization_members(status);


-- ===================================================================
-- user_verifications  (/docs/database-schema.md §2.4)
-- ===================================================================
create table if not exists public.user_verifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  requested_stage     text not null,
  verification_type   text not null,
  evidence_summary    text,
  evidence_file_paths text[],
  status              text not null default 'pending',
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  expires_at          timestamptz,
  rejection_reason    text,
  admin_note          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.user_verifications
  drop constraint if exists user_verifications_requested_stage_check;
alter table public.user_verifications
  add constraint user_verifications_requested_stage_check
  check (requested_stage in (
    'exploring','studying_german','studying_at_center','completed_center_course',
    'interviewed','contract_signed','visa_process','in_germany',
    'doing_ausbildung','alumni'
  ));

alter table public.user_verifications
  drop constraint if exists user_verifications_verification_type_check;
alter table public.user_verifications
  add constraint user_verifications_verification_type_check
  check (verification_type in (
    'invoice',
    'course_schedule',
    'student_id',
    'email_confirmation',
    'interview_invitation',
    'offer_letter',
    'ausbildung_contract',
    'visa_appointment',
    'residence_proof',
    'employer_school_email',
    'manual_confirmation',
    'other'
  ));

alter table public.user_verifications
  drop constraint if exists user_verifications_status_check;
alter table public.user_verifications
  add constraint user_verifications_status_check
  check (status in (
    'pending','approved','rejected','need_more_info','expired','revoked'
  ));

create index if not exists user_verifications_user_id_idx
  on public.user_verifications(user_id);
create index if not exists user_verifications_status_idx
  on public.user_verifications(status);
create index if not exists user_verifications_reviewed_by_idx
  on public.user_verifications(reviewed_by);
create index if not exists user_verifications_expires_at_idx
  on public.user_verifications(expires_at);
create index if not exists user_verifications_created_at_idx
  on public.user_verifications(created_at desc);

select public._attach_set_updated_at('public.user_verifications');


-- ===================================================================
-- organization_verifications  (/docs/database-schema.md §2.5)
-- ===================================================================
create table if not exists public.organization_verifications (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  requested_status    text not null,
  submitted_by        uuid not null references public.profiles(id),
  document_file_paths text[],
  document_summary    text,
  fee_disclosure      text,
  status              text not null default 'pending',
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  expires_at          timestamptz,
  rejection_reason    text,
  admin_note          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- The requested_status mirrors the badge level the org is asking for.
alter table public.organization_verifications
  drop constraint if exists organization_verifications_requested_status_check;
alter table public.organization_verifications
  add constraint organization_verifications_requested_status_check
  check (requested_status in (
    'basic_verified',
    'trusted_partner',
    'recently_updated'
  ));

alter table public.organization_verifications
  drop constraint if exists organization_verifications_status_check;
alter table public.organization_verifications
  add constraint organization_verifications_status_check
  check (status in (
    'pending','approved','rejected','need_more_info','expired','revoked'
  ));

create index if not exists organization_verifications_org_id_idx
  on public.organization_verifications(organization_id);
create index if not exists organization_verifications_status_idx
  on public.organization_verifications(status);
create index if not exists organization_verifications_submitted_by_idx
  on public.organization_verifications(submitted_by);
create index if not exists organization_verifications_reviewed_by_idx
  on public.organization_verifications(reviewed_by);
create index if not exists organization_verifications_expires_at_idx
  on public.organization_verifications(expires_at);
create index if not exists organization_verifications_created_at_idx
  on public.organization_verifications(created_at desc);

select public._attach_set_updated_at('public.organization_verifications');


-- ===================================================================
-- job_orders  (/docs/database-schema.md §2.6)
-- ===================================================================
-- NOTE: The legacy demo file `supabase/schema.sql` defines a different
-- `public.job_orders` shape (FK to `public.companies`, allowance min/max
-- columns, etc.). The Trust Engine migrations are canonical: do not
-- apply that legacy demo schema.sql alongside this migration.
create table if not exists public.job_orders (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id),
  created_by                  uuid not null references public.profiles(id),
  title                       text not null,
  occupation                  text not null,
  germany_city                text,
  germany_state               text,
  training_type               text not null,
  german_level_required       text,
  education_required          text,
  start_date                  date,
  interview_date              date,
  monthly_training_allowance  numeric,
  accommodation_support       text,
  fee_disclosure              text,
  application_deadline        date,
  expires_at                  timestamptz,
  verification_status         text not null default 'pending_verification',
  status                      text not null default 'draft',
  last_verified_at            timestamptz,
  last_updated_by_org_at      timestamptz,
  is_sponsored                boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz
);

alter table public.job_orders
  drop constraint if exists job_orders_training_type_check;
alter table public.job_orders
  add constraint job_orders_training_type_check
  check (training_type in ('dual','school_based','other'));

alter table public.job_orders
  drop constraint if exists job_orders_status_check;
alter table public.job_orders
  add constraint job_orders_status_check
  check (status in (
    'draft',
    'pending_verification',
    'published',
    'closing_soon',
    'expired',
    'filled',
    'under_review',
    'suspended',
    'rejected'
  ));

alter table public.job_orders
  drop constraint if exists job_orders_verification_status_check;
alter table public.job_orders
  add constraint job_orders_verification_status_check
  check (verification_status in (
    'unverified',
    'pending_verification',
    'basic_verified',
    'trusted_partner',
    'recently_updated',
    'expired',
    'rejected',
    'suspended',
    'revoked'
  ));

create index if not exists job_orders_org_id_idx
  on public.job_orders(organization_id);
create index if not exists job_orders_created_by_idx
  on public.job_orders(created_by);
create index if not exists job_orders_status_idx
  on public.job_orders(status);
create index if not exists job_orders_expires_at_idx
  on public.job_orders(expires_at);
create index if not exists job_orders_application_deadline_idx
  on public.job_orders(application_deadline);
create index if not exists job_orders_created_at_idx
  on public.job_orders(created_at desc);

select public._attach_set_updated_at('public.job_orders');


-- ===================================================================
-- reviews  (/docs/database-schema.md §2.7)
-- ===================================================================
create table if not exists public.reviews (
  id                       uuid primary key default gen_random_uuid(),
  reviewer_id              uuid not null references public.profiles(id) on delete cascade,
  target_type              text not null,
  target_id                uuid not null,
  review_type              text not null,
  relationship_to_target   text not null,
  rating                   integer check (rating >= 1 and rating <= 5),
  title                    text,
  content                  text not null,
  proof_status             text not null default 'not_submitted',
  proof_file_paths         text[],
  moderation_status        text not null default 'pending',
  published_at             timestamptz,
  rejected_reason          text,
  right_to_reply           text,
  reply_by                 uuid references public.profiles(id),
  reply_at                 timestamptz,
  dispute_status           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

alter table public.reviews
  drop constraint if exists reviews_target_type_check;
alter table public.reviews
  add constraint reviews_target_type_check
  check (target_type in ('organization','job_order','course','article'));

alter table public.reviews
  drop constraint if exists reviews_review_type_check;
alter table public.reviews
  add constraint reviews_review_type_check
  check (review_type in (
    'center_experience',
    'recruiter_experience',
    'employer_hiring_process',
    'ausbildung_experience',
    'germany_life_experience'
  ));

alter table public.reviews
  drop constraint if exists reviews_relationship_to_target_check;
alter table public.reviews
  add constraint reviews_relationship_to_target_check
  check (relationship_to_target in (
    'studied_at_center',
    'completed_course',
    'consulted_only',
    'interviewed',
    'signed_contract',
    'visa_process',
    'in_germany',
    'doing_ausbildung',
    'alumni'
  ));

alter table public.reviews
  drop constraint if exists reviews_moderation_status_check;
alter table public.reviews
  add constraint reviews_moderation_status_check
  check (moderation_status in (
    'pending',
    'approved',
    'published',
    'rejected',
    'need_more_info',
    'hidden',
    'under_dispute',
    'removed'
  ));

alter table public.reviews
  drop constraint if exists reviews_proof_status_check;
alter table public.reviews
  add constraint reviews_proof_status_check
  check (proof_status in (
    'not_submitted',
    'submitted',
    'approved',
    'rejected',
    'need_more_info'
  ));

alter table public.reviews
  drop constraint if exists reviews_dispute_status_check;
alter table public.reviews
  add constraint reviews_dispute_status_check
  check (
    dispute_status is null or dispute_status in (
      'open','under_review','resolved','rejected','closed'
    )
  );

create index if not exists reviews_reviewer_id_idx
  on public.reviews(reviewer_id);
create index if not exists reviews_target_idx
  on public.reviews(target_type, target_id);
create index if not exists reviews_moderation_status_idx
  on public.reviews(moderation_status);
create index if not exists reviews_created_at_idx
  on public.reviews(created_at desc);
create index if not exists reviews_published_at_idx
  on public.reviews(published_at desc);

select public._attach_set_updated_at('public.reviews');


-- ===================================================================
-- review_proofs
-- -------------------------------------------------------------------
-- Normalised per-file proof records for `reviews`. Complements the
-- denormalised `reviews.proof_file_paths text[]` column by tracking
-- each uploaded proof file independently with its own moderation
-- state. The `review_proof_uploaded` audit event from
-- /docs/audit-log-rules.md §5.5 corresponds to inserts into this
-- table.
-- ===================================================================
create table if not exists public.review_proofs (
  id                uuid primary key default gen_random_uuid(),
  review_id         uuid not null references public.reviews(id) on delete cascade,
  uploaded_by       uuid references public.profiles(id),
  proof_type        text not null default 'other',
  file_path         text not null,
  file_size         bigint,
  mime_type         text,
  status            text not null default 'pending',
  reviewed_by       uuid references public.profiles(id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.review_proofs
  drop constraint if exists review_proofs_proof_type_check;
alter table public.review_proofs
  add constraint review_proofs_proof_type_check
  check (proof_type in (
    'invoice',
    'course_schedule',
    'student_id',
    'email_confirmation',
    'interview_invitation',
    'offer_letter',
    'ausbildung_contract',
    'visa_appointment',
    'residence_proof',
    'employer_school_email',
    'manual_confirmation',
    'other'
  ));

alter table public.review_proofs
  drop constraint if exists review_proofs_status_check;
alter table public.review_proofs
  add constraint review_proofs_status_check
  check (status in (
    'pending','approved','rejected','need_more_info','revoked'
  ));

create index if not exists review_proofs_review_id_idx
  on public.review_proofs(review_id);
create index if not exists review_proofs_uploaded_by_idx
  on public.review_proofs(uploaded_by);
create index if not exists review_proofs_status_idx
  on public.review_proofs(status);
create index if not exists review_proofs_created_at_idx
  on public.review_proofs(created_at desc);

select public._attach_set_updated_at('public.review_proofs');


-- ===================================================================
-- report_flags  (/docs/database-schema.md §2.8)
-- ===================================================================
create table if not exists public.report_flags (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid references public.profiles(id) on delete set null,
  target_type         text not null,
  target_id           uuid not null,
  reason              text not null,
  description         text,
  evidence_file_paths text[],
  severity            text not null default 'medium',
  status              text not null default 'open',
  handled_by          uuid references public.profiles(id),
  handled_at          timestamptz,
  outcome             text,
  internal_note       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.report_flags
  drop constraint if exists report_flags_reason_check;
alter table public.report_flags
  add constraint report_flags_reason_check
  check (reason in (
    'false_information',
    'scam_suspicion',
    'hidden_fees',
    'guaranteed_visa_claim',
    'impersonation',
    'expired_job_order',
    'harassment',
    'spam',
    'privacy_violation',
    'other'
  ));

alter table public.report_flags
  drop constraint if exists report_flags_severity_check;
alter table public.report_flags
  add constraint report_flags_severity_check
  check (severity in ('low','medium','high','critical'));

alter table public.report_flags
  drop constraint if exists report_flags_status_check;
alter table public.report_flags
  add constraint report_flags_status_check
  check (status in (
    'open',
    'triaged',
    'under_review',
    'resolved',
    'rejected',
    'escalated_to_dispute',
    'closed'
  ));

create index if not exists report_flags_target_idx
  on public.report_flags(target_type, target_id);
create index if not exists report_flags_status_idx
  on public.report_flags(status);
create index if not exists report_flags_reporter_id_idx
  on public.report_flags(reporter_id);
create index if not exists report_flags_handled_by_idx
  on public.report_flags(handled_by);
create index if not exists report_flags_severity_idx
  on public.report_flags(severity);
create index if not exists report_flags_created_at_idx
  on public.report_flags(created_at desc);

select public._attach_set_updated_at('public.report_flags');


-- ===================================================================
-- dispute_cases  (/docs/database-schema.md §2.9)
-- ===================================================================
create table if not exists public.dispute_cases (
  id                  uuid primary key default gen_random_uuid(),
  opened_by           uuid not null references public.profiles(id),
  target_type         text not null,
  target_id           uuid not null,
  dispute_type        text not null,
  summary             text not null,
  evidence_file_paths text[],
  status              text not null default 'open',
  assigned_to         uuid references public.profiles(id),
  resolution          text,
  resolved_by         uuid references public.profiles(id),
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.dispute_cases
  drop constraint if exists dispute_cases_status_check;
alter table public.dispute_cases
  add constraint dispute_cases_status_check
  check (status in (
    'open',
    'waiting_for_user',
    'waiting_for_organization',
    'under_review',
    'resolved',
    'rejected',
    'closed'
  ));

create index if not exists dispute_cases_status_idx
  on public.dispute_cases(status);
create index if not exists dispute_cases_target_idx
  on public.dispute_cases(target_type, target_id);
create index if not exists dispute_cases_opened_by_idx
  on public.dispute_cases(opened_by);
create index if not exists dispute_cases_assigned_to_idx
  on public.dispute_cases(assigned_to);
create index if not exists dispute_cases_resolved_by_idx
  on public.dispute_cases(resolved_by);
create index if not exists dispute_cases_created_at_idx
  on public.dispute_cases(created_at desc);

select public._attach_set_updated_at('public.dispute_cases');


-- ===================================================================
-- audit_logs  (/docs/database-schema.md §2.10, /docs/audit-log-rules.md)
-- -------------------------------------------------------------------
-- Append-only table. Per /docs/audit-log-rules.md §2 and the rules in
-- /docs/database-schema.md §2.10, normal users must not be able to
-- update or delete rows. We do not enable RLS in this migration, but
-- we do add a defensive trigger that rejects UPDATE/DELETE so the
-- append-only invariant holds even from the service role until policy
-- rules are layered on top.
-- ===================================================================
create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references public.profiles(id),
  actor_type      text not null,
  action          text not null,
  target_type     text not null,
  target_id       uuid,
  changed_fields  text[],
  before_data     jsonb,
  after_data      jsonb,
  reason          text,
  ai_generated    boolean not null default false,
  human_approved  boolean not null default false,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

alter table public.audit_logs
  drop constraint if exists audit_logs_actor_type_check;
alter table public.audit_logs
  add constraint audit_logs_actor_type_check
  check (actor_type in (
    'user',
    'organization_member',
    'moderator',
    'admin',
    'super_admin',
    'system',
    'ai',
    'edge_function'
  ));

alter table public.audit_logs
  drop constraint if exists audit_logs_target_type_check;
alter table public.audit_logs
  add constraint audit_logs_target_type_check
  check (target_type in (
    'profile',
    'user_verification',
    'organization',
    'organization_verification',
    'organization_member',
    'job_order',
    'review',
    'review_proof',
    'report_flag',
    'dispute_case',
    'article',
    'community_post',
    'comment',
    'application_lead',
    'storage_file',
    'badge',
    'system_setting'
  ));

create index if not exists audit_logs_target_idx
  on public.audit_logs(target_type, target_id);
create index if not exists audit_logs_actor_idx
  on public.audit_logs(actor_id);
create index if not exists audit_logs_action_idx
  on public.audit_logs(action);
create index if not exists audit_logs_created_at_idx
  on public.audit_logs(created_at desc);

-- Append-only guard: reject UPDATE and DELETE on audit_logs.
create or replace function public.audit_logs_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only; % is not permitted', tg_op;
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.audit_logs_block_mutation();

drop trigger if exists audit_logs_no_delete on public.audit_logs;
create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.audit_logs_block_mutation();


-- ===================================================================
-- application_leads  (/docs/database-schema.md §2.14)
-- ===================================================================
create table if not exists public.application_leads (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid references public.profiles(id),
  target_type           text not null,
  target_id             uuid not null,
  full_name             text,
  email                 text,
  phone                 text,
  german_level          text,
  education_level       text,
  interested_occupation text,
  message               text,
  status                text not null default 'new',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.application_leads
  drop constraint if exists application_leads_target_type_check;
alter table public.application_leads
  add constraint application_leads_target_type_check
  check (target_type in (
    'organization',
    'job_order',
    'course'
  ));

alter table public.application_leads
  drop constraint if exists application_leads_status_check;
alter table public.application_leads
  add constraint application_leads_status_check
  check (status in (
    'new',
    'contacted',
    'qualified',
    'converted',
    'rejected',
    'spam',
    'closed'
  ));

create index if not exists application_leads_student_id_idx
  on public.application_leads(student_id);
create index if not exists application_leads_target_idx
  on public.application_leads(target_type, target_id);
create index if not exists application_leads_status_idx
  on public.application_leads(status);
create index if not exists application_leads_created_at_idx
  on public.application_leads(created_at desc);

select public._attach_set_updated_at('public.application_leads');
