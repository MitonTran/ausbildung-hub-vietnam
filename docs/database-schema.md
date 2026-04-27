# Database Schema Specification

This document defines the initial database schema for the Trust Engine of Ausbildung Hub Vietnam.

Target database: Supabase Postgres.

## 1. Naming Conventions

- Use snake_case for table and column names.
- Use UUID primary keys.
- Use `created_at`, `updated_at`, `deleted_at` where relevant.
- Use soft delete for sensitive business objects.
- Use enum-like text fields initially unless native Postgres enums are intentionally used.
- All sensitive tables must have RLS enabled.

## 2. Core Tables

## 2.1 profiles

One row per authenticated user.

Columns:

```sql
id uuid primary key references auth.users(id) on delete cascade,
email text,
full_name text,
avatar_url text,
phone text,
role text not null default 'student',
self_declared_stage text not null default 'exploring',
verified_stage text,
verification_status text not null default 'unverified',
trust_score integer not null default 0,
risk_score integer not null default 0,
last_active_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

Allowed `role` values:

- `student`
- `center_admin`
- `employer_admin`
- `moderator`
- `admin`
- `super_admin`

Allowed `self_declared_stage` and `verified_stage` values:

- `exploring`
- `studying_german`
- `studying_at_center`
- `completed_center_course`
- `interviewed`
- `contract_signed`
- `visa_process`
- `in_germany`
- `doing_ausbildung`
- `alumni`

## 2.2 organizations

Stores training centers, employers, recruiters, agencies, schools, and consulting centers.

```sql
id uuid primary key default gen_random_uuid(),
org_type text not null,
legal_name text,
brand_name text not null,
slug text unique,
country text,
city text,
address text,
website_url text,
contact_email text,
contact_phone text,
description text,
services text[],
verification_status text not null default 'unverified',
trust_badge text,
last_verified_at timestamptz,
verification_expires_at timestamptz,
last_updated_by_org_at timestamptz,
risk_score integer not null default 0,
is_published boolean not null default false,
is_suspended boolean not null default false,
created_by uuid references profiles(id),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

Allowed `org_type`:

- `training_center`
- `consulting_center`
- `employer`
- `recruiter`
- `agency`
- `school`
- `other`

Allowed `verification_status`:

- `unverified`
- `pending_review`
- `basic_verified`
- `trusted_partner`
- `recently_updated`
- `expired`
- `rejected`
- `suspended`
- `revoked`

## 2.3 organization_members

Maps users to organizations they can manage.

```sql
id uuid primary key default gen_random_uuid(),
organization_id uuid not null references organizations(id) on delete cascade,
user_id uuid not null references profiles(id) on delete cascade,
member_role text not null default 'manager',
status text not null default 'active',
created_at timestamptz not null default now(),
unique (organization_id, user_id)
```

Allowed `member_role`:

- `owner`
- `manager`
- `editor`
- `viewer`

## 2.4 user_verifications

Stores user stage verification requests and outcomes.

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references profiles(id) on delete cascade,
requested_stage text not null,
verification_type text not null,
evidence_summary text,
evidence_file_paths text[],
status text not null default 'pending',
reviewed_by uuid references profiles(id),
reviewed_at timestamptz,
expires_at timestamptz,
rejection_reason text,
admin_note text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Allowed `verification_type`:

- `invoice`
- `course_schedule`
- `student_id`
- `email_confirmation`
- `interview_invitation`
- `offer_letter`
- `ausbildung_contract`
- `visa_appointment`
- `residence_proof`
- `employer_school_email`
- `manual_confirmation`
- `other`

Allowed `status`:

- `pending`
- `approved`
- `rejected`
- `need_more_info`
- `expired`
- `revoked`

## 2.5 organization_verifications

Stores organization verification requests and outcomes.

```sql
id uuid primary key default gen_random_uuid(),
organization_id uuid not null references organizations(id) on delete cascade,
requested_status text not null,
submitted_by uuid not null references profiles(id),
document_file_paths text[],
document_summary text,
fee_disclosure text,
status text not null default 'pending',
reviewed_by uuid references profiles(id),
reviewed_at timestamptz,
expires_at timestamptz,
rejection_reason text,
admin_note text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## 2.6 job_orders

Structured recruitment/training order pages.

```sql
id uuid primary key default gen_random_uuid(),
organization_id uuid not null references organizations(id),
created_by uuid not null references profiles(id),
title text not null,
occupation text not null,
germany_city text,
germany_state text,
training_type text not null,
german_level_required text,
education_required text,
start_date date,
interview_date date,
monthly_training_allowance numeric,
accommodation_support text,
fee_disclosure text,
application_deadline date,
expires_at timestamptz,
verification_status text not null default 'pending_verification',
status text not null default 'draft',
last_verified_at timestamptz,
last_updated_by_org_at timestamptz,
is_sponsored boolean not null default false,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

Allowed `training_type`:

- `dual`
- `school_based`
- `other`

Allowed `status`:

- `draft`
- `pending_verification`
- `published`
- `closing_soon`
- `expired`
- `filled`
- `under_review`
- `suspended`
- `rejected`

## 2.7 reviews

Official verified or moderated reviews.

```sql
id uuid primary key default gen_random_uuid(),
reviewer_id uuid not null references profiles(id) on delete cascade,
target_type text not null,
target_id uuid not null,
review_type text not null,
relationship_to_target text not null,
rating integer check (rating >= 1 and rating <= 5),
title text,
content text not null,
proof_status text not null default 'not_submitted',
proof_file_paths text[],
moderation_status text not null default 'pending',
published_at timestamptz,
rejected_reason text,
right_to_reply text,
reply_by uuid references profiles(id),
reply_at timestamptz,
dispute_status text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

Allowed `target_type`:

- `organization`
- `job_order`
- `course`
- `article`

Allowed `review_type`:

- `center_experience`
- `recruiter_experience`
- `employer_hiring_process`
- `ausbildung_experience`
- `germany_life_experience`

Allowed `relationship_to_target`:

- `studied_at_center`
- `completed_course`
- `consulted_only`
- `interviewed`
- `signed_contract`
- `visa_process`
- `in_germany`
- `doing_ausbildung`
- `alumni`

Allowed `moderation_status`:

- `pending`
- `approved`
- `published`
- `rejected`
- `need_more_info`
- `hidden`
- `under_dispute`
- `removed`

## 2.8 report_flags

Reports submitted by users.

```sql
id uuid primary key default gen_random_uuid(),
reporter_id uuid references profiles(id) on delete set null,
target_type text not null,
target_id uuid not null,
reason text not null,
description text,
evidence_file_paths text[],
severity text not null default 'medium',
status text not null default 'open',
handled_by uuid references profiles(id),
handled_at timestamptz,
outcome text,
internal_note text,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Allowed `reason`:

- `false_information`
- `scam_suspicion`
- `hidden_fees`
- `guaranteed_visa_claim`
- `impersonation`
- `expired_job_order`
- `harassment`
- `spam`
- `privacy_violation`
- `other`

Allowed `status`:

- `open`
- `triaged`
- `under_review`
- `resolved`
- `rejected`
- `escalated_to_dispute`
- `closed`

## 2.9 dispute_cases

Formal complaints and appeals.

```sql
id uuid primary key default gen_random_uuid(),
opened_by uuid not null references profiles(id),
target_type text not null,
target_id uuid not null,
dispute_type text not null,
summary text not null,
evidence_file_paths text[],
status text not null default 'open',
assigned_to uuid references profiles(id),
resolution text,
resolved_by uuid references profiles(id),
resolved_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Allowed `status`:

- `open`
- `waiting_for_user`
- `waiting_for_organization`
- `under_review`
- `resolved`
- `rejected`
- `closed`

## 2.10 audit_logs

Immutable audit events for sensitive actions.

```sql
id uuid primary key default gen_random_uuid(),
actor_id uuid references profiles(id),
actor_type text not null,
action text not null,
target_type text not null,
target_id uuid,
changed_fields text[],
before_data jsonb,
after_data jsonb,
reason text,
ai_generated boolean not null default false,
human_approved boolean not null default false,
ip_address text,
user_agent text,
created_at timestamptz not null default now()
```

Rules:

- Normal users cannot update or delete audit logs.
- Admins can read audit logs.
- Super admins can export audit logs.
- No UI should allow destructive edit of audit logs.

## 2.11 articles

Editorial, sponsored, or partner content.

```sql
id uuid primary key default gen_random_uuid(),
author_id uuid references profiles(id),
title text not null,
slug text unique,
excerpt text,
content text,
content_type text not null default 'editorial',
sponsor_organization_id uuid references organizations(id),
status text not null default 'draft',
published_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

Allowed `content_type`:

- `editorial`
- `sponsored`
- `partner_content`
- `user_generated`

## 2.12 community_posts

Community Q&A posts.

```sql
id uuid primary key default gen_random_uuid(),
author_id uuid not null references profiles(id) on delete cascade,
title text not null,
content text not null,
tags text[],
status text not null default 'published',
moderation_status text not null default 'approved',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

## 2.13 comments

Comments on posts, articles, reviews, or other supported objects.

```sql
id uuid primary key default gen_random_uuid(),
author_id uuid not null references profiles(id) on delete cascade,
target_type text not null,
target_id uuid not null,
content text not null,
status text not null default 'published',
moderation_status text not null default 'approved',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
deleted_at timestamptz
```

## 2.14 application_leads

Lead submissions from students to centers, recruiters, employers, or job orders.

```sql
id uuid primary key default gen_random_uuid(),
student_id uuid references profiles(id),
target_type text not null,
target_id uuid not null,
full_name text,
email text,
phone text,
german_level text,
education_level text,
interested_occupation text,
message text,
status text not null default 'new',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

## 3. Storage Buckets

### 3.1 public-assets

For public images and non-sensitive assets.

Examples:

- Site images
- Public icons
- Public article images

Access:

- Public read
- Admin/editor write

### 3.2 organization-logos

For public organization logos and cover images.

Access:

- Public read
- Organization member write for owned organization
- Admin write

### 3.3 verification-evidence-private

For sensitive user and organization verification evidence.

Examples:

- Invoices
- Student IDs
- Interview invitations
- Contracts
- Visa appointment proof
- Residence proof
- Business registration documents

Access:

- Private
- Owner may upload own evidence
- Admin/moderator may access only when authorized
- Use signed URLs with short expiry

### 3.4 dispute-evidence-private

For dispute evidence.

Access:

- Private
- Dispute opener may upload
- Assigned admin/moderator may access
- Signed URLs only

### 3.5 review-proof-private

For review proof files.

Access:

- Private
- Reviewer upload
- Admin/moderator access
- Signed URLs only

## 4. Recommended Indexes

```sql
create index profiles_role_idx on profiles(role);
create index profiles_verified_stage_idx on profiles(verified_stage);
create index organizations_org_type_idx on organizations(org_type);
create index organizations_slug_idx on organizations(slug);
create index organizations_verification_status_idx on organizations(verification_status);
create index organization_members_user_id_idx on organization_members(user_id);
create index organization_members_org_id_idx on organization_members(organization_id);
create index user_verifications_user_id_idx on user_verifications(user_id);
create index user_verifications_status_idx on user_verifications(status);
create index organization_verifications_org_id_idx on organization_verifications(organization_id);
create index job_orders_org_id_idx on job_orders(organization_id);
create index job_orders_status_idx on job_orders(status);
create index job_orders_expires_at_idx on job_orders(expires_at);
create index reviews_reviewer_id_idx on reviews(reviewer_id);
create index reviews_target_idx on reviews(target_type, target_id);
create index reviews_moderation_status_idx on reviews(moderation_status);
create index report_flags_target_idx on report_flags(target_type, target_id);
create index report_flags_status_idx on report_flags(status);
create index dispute_cases_status_idx on dispute_cases(status);
create index audit_logs_target_idx on audit_logs(target_type, target_id);
create index audit_logs_actor_idx on audit_logs(actor_id);
create index audit_logs_created_at_idx on audit_logs(created_at);
```

## 5. Database Functions To Consider

- `is_admin(user_id uuid)`
- `is_moderator_or_admin(user_id uuid)`
- `is_org_member(user_id uuid, organization_id uuid)`
- `can_review_target(user_id uuid, target_type text, target_id uuid, review_type text)`
- `write_audit_log(...)`
- `expire_old_job_orders()`
- `update_updated_at_column()`

## 6. MVP Migration Order

1. Create helper functions.
2. Create `profiles`.
3. Create `organizations`.
4. Create `organization_members`.
5. Create verification tables.
6. Create job orders.
7. Create reviews.
8. Create reports.
9. Create disputes.
10. Create audit logs.
11. Create articles/community/comments/leads.
12. Enable RLS.
13. Add policies.
14. Add indexes.
15. Add storage buckets and storage policies.
