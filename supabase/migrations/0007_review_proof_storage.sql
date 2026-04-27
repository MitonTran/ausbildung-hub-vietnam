-- ===================================================================
-- 0007_review_proof_storage.sql
--
-- 1. Creates the private Supabase Storage bucket
--    `review-proof-private` used by the verified-review submission
--    flow (/docs/database-schema.md §3.5, /docs/trust-engine.md §6).
-- 2. Adds RLS policies on `storage.objects` so:
--      * users can upload / read / replace / delete files only under
--        their own path prefix
--        `user/<auth.uid()>/review/<review_id>/<filename>`,
--      * moderators and admins access files only via service-role
--        signed URLs from the admin UI (no anon access).
--
-- Mirrors the structure of 0004_user_verification_storage.sql.
-- Idempotent — safe to re-apply.
-- ===================================================================


-- ===================================================================
-- 1. Private bucket
-- ===================================================================
insert into storage.buckets (id, name, public)
values ('review-proof-private', 'review-proof-private', false)
on conflict (id) do update
  set public = excluded.public;


-- ===================================================================
-- 2. RLS policies on storage.objects, scoped to this bucket
-- -------------------------------------------------------------------
-- Path layout (enforced in policy):
--   user/<auth.uid()>/review/<review_id>/<filename>
-- ===================================================================
alter table storage.objects enable row level security;

drop policy if exists "Users can upload own review proof"
  on storage.objects;
create policy "Users can upload own review proof"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-proof-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'review'
  );

drop policy if exists "Users can read own review proof"
  on storage.objects;
create policy "Users can read own review proof"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'review-proof-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'review'
  );

drop policy if exists "Users can update own review proof"
  on storage.objects;
create policy "Users can update own review proof"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-proof-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'review'
  )
  with check (
    bucket_id = 'review-proof-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'review'
  );

drop policy if exists "Users can delete own review proof"
  on storage.objects;
create policy "Users can delete own review proof"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-proof-private'
    and (storage.foldername(name))[1] = 'user'
    and (storage.foldername(name))[2] = auth.uid()::text
    and (storage.foldername(name))[3] = 'review'
  );
