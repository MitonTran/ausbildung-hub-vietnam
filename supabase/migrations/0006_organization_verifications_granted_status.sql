-- ============================================================================
-- 0006_organization_verifications_granted_status
--
-- Adds a `granted_status` column to organization_verifications so the badge
-- the admin actually granted can be persisted on the verification row.
--
-- WHY:
-- The Trust Engine lets admins grant a badge that differs from what the
-- organization originally requested (e.g. an org submits a request for
-- `basic_verified`, the admin reviews the documents and decides the org
-- qualifies for `trusted_partner` instead). Without this column, the only
-- record of the actual grant lives on the `organizations` row — which makes
-- it impossible to tell, when expiring or auditing the verification later,
-- which tier this specific verification granted.
--
-- This column is nullable: it stays NULL for rows that haven't been approved
-- yet, and for rows from before this migration. Application code falls back
-- to `requested_status` for the legacy NULL case.
-- ============================================================================

alter table public.organization_verifications
  add column if not exists granted_status text;

-- Restrict to the same set of "active badge" values the rest of the schema uses
-- so nothing accidentally writes a non-tier value here.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_verifications_granted_status_check'
  ) then
    alter table public.organization_verifications
      add constraint organization_verifications_granted_status_check
      check (
        granted_status is null
        or granted_status in ('basic_verified', 'trusted_partner')
      );
  end if;
end $$;

-- Helpful for queries like "which verification granted the org's current badge?"
create index if not exists idx_organization_verifications_granted_status
  on public.organization_verifications (granted_status);
