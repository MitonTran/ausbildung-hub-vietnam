-- ===================================================================
-- 0007_report_flags_extensions.sql
-- Report Flag system extensions.
--
-- Aligns the public.report_flags table with /docs/admin-moderation-flow.md §7
-- and the report-flag UI requirements:
--
--   * Adds an explicit `target_type` CHECK so the moderation queue only
--     receives reports on supported objects (organization, job_order,
--     review, community_post, comment, article, user). Without this
--     check, a malicious client could file reports against arbitrary
--     target_type strings and pollute the queue.
--
--   * Extends the existing `reason` CHECK with the user-facing reason
--     codes called out in the product spec (`scam_or_fraud`,
--     `unclear_fees`, `fake_job_order`). The legacy reasons from
--     0002 (`scam_suspicion`, `hidden_fees`, `guaranteed_visa_claim`)
--     are kept so existing rows and any other consumers continue to
--     validate.
--
-- Idempotent — safe to re-run.
-- ===================================================================

-- ---- target_type allow-list -----------------------------------------
alter table public.report_flags
  drop constraint if exists report_flags_target_type_check;
alter table public.report_flags
  add constraint report_flags_target_type_check
  check (target_type in (
    'organization',
    'job_order',
    'review',
    'community_post',
    'comment',
    'article',
    'user'
  ));

-- ---- extended reason allow-list -------------------------------------
-- Keep legacy reasons (so existing rows still validate) and add the
-- new product-spec reasons.
alter table public.report_flags
  drop constraint if exists report_flags_reason_check;
alter table public.report_flags
  add constraint report_flags_reason_check
  check (reason in (
    -- legacy (0002):
    'false_information',
    'scam_suspicion',
    'hidden_fees',
    'guaranteed_visa_claim',
    'impersonation',
    'expired_job_order',
    'harassment',
    'spam',
    'privacy_violation',
    'other',
    -- new product-spec reasons:
    'scam_or_fraud',
    'unclear_fees',
    'fake_job_order'
  ));
