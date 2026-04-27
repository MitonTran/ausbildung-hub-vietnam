-- ===================================================================
-- 0008_job_orders_slug_and_expiry.sql
--
-- Application-layer support for the structured Job Orders feature.
--
-- 1. Adds a unique `slug` column to public.job_orders so the public
--    /jobs/[slug] page can resolve a job order by URL.
-- 2. Adds a `mark_expired_job_orders()` SECURITY DEFINER function
--    that the server cron endpoint calls to flip published rows
--    whose `expires_at` has passed into status='expired'. Returns
--    the array of affected ids so the caller can write per-row
--    audit_logs entries.
-- 3. Adds a `mark_closing_soon_job_orders(days int)` companion fn
--    that flags published rows whose application_deadline is within
--    `days` (defaults to 7). Returns ids for audit logging.
--
-- Idempotent — safe to re-apply.
-- ===================================================================


-- 1. slug column for public URLs ------------------------------------
alter table public.job_orders
  add column if not exists slug text;

create unique index if not exists job_orders_slug_unique_idx
  on public.job_orders(slug)
  where slug is not null;


-- 2. expiry sweep ---------------------------------------------------
create or replace function public.mark_expired_job_orders()
returns table(id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.job_orders jo
     set status = 'expired',
         updated_at = now()
   where jo.status in ('published', 'closing_soon')
     and jo.expires_at is not null
     and jo.expires_at < now()
     and jo.deleted_at is null
  returning jo.id;
end;
$$;

revoke all on function public.mark_expired_job_orders() from public, anon, authenticated;
grant execute on function public.mark_expired_job_orders() to service_role;


-- 3. closing_soon sweep --------------------------------------------
create or replace function public.mark_closing_soon_job_orders(days_window int default 7)
returns table(id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.job_orders jo
     set status = 'closing_soon',
         updated_at = now()
   where jo.status = 'published'
     and jo.application_deadline is not null
     and jo.application_deadline >= current_date
     and jo.application_deadline <= (current_date + (days_window || ' days')::interval)
     and (jo.expires_at is null or jo.expires_at > now())
     and jo.deleted_at is null
  returning jo.id;
end;
$$;

revoke all on function public.mark_closing_soon_job_orders(int) from public, anon, authenticated;
grant execute on function public.mark_closing_soon_job_orders(int) to service_role;
