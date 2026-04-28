# AGENTS.md — Ausbildung Hub Vietnam

## Project Overview
Ausbildung Hub Vietnam is a Vietnamese-first SaaS marketplace, information platform, verified directory, and trust layer for vocational training in Germany. The product is not just a news website. The core product is a Trust Engine that standardizes information, verifies users and organizations, moderates reviews, handles reports/disputes, and maintains audit logs.

## Primary Product Goal
Build a trustworthy platform where Vietnamese students can compare training centers, employers, recruiters, job orders, reviews, and community information with clear verification status and transparent sponsored/editorial labeling.

## Current Stack
- Frontend: Next.js + TypeScript
- Styling: Tailwind CSS
- Backend: Supabase Postgres
- Auth: Supabase Auth
- Storage: Supabase Storage
- Deployment: Vercel
- Source control: GitHub
- Project docs: `/docs`

## Required Project Docs
Before changing product logic, read the relevant docs:
- `/docs/trust-engine.md`
- `/docs/database-schema.md`
- `/docs/rls-policy.md`
- `/docs/user-verification-flow.md`
- `/docs/admin-moderation-flow.md`
- `/docs/audit-log-rules.md`

If a requested change conflicts with these docs, stop and ask for clarification before implementing.

## Non-Negotiable Trust Engine Rules
1. Paid/sponsored status must never equal trusted/verified status.
2. Organizations must never be able to grant verification badges to themselves.
3. Users must never be able to self-upgrade verified stages without admin approval or trusted verification flow.
4. Reviews must not become public until moderation approves them.
5. Official reviews require eligibility based on verified user stage and relationship to the target.
6. Job orders require structured fields, deadline, expiry date, verification status, and last updated date.
7. Every sensitive admin/moderator action must create an audit log.
8. AI-generated edits must be marked as AI-generated and human-approved before publishing.
9. Private evidence files must never be publicly accessible.
10. Do not rely on frontend-only permission checks. Enforce access at the database/RLS/server level.

## Security Rules
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code.
- Only use service role in server-only files, API routes, server actions, or secure admin utilities.
- Enable and maintain Row Level Security on all sensitive Supabase tables.
- Use private buckets for verification evidence, dispute evidence, review proof, contracts, invoices, visas, and personal documents.
- Generate signed URLs server-side only, with short expiration.
- Never put secrets into source code, logs, screenshots, markdown docs, or comments.
- Do not create public policies for private buckets.
- Do not store full sensitive document contents in audit logs.

## Data Privacy Rules
- Store the minimum necessary private data.
- For verification, prefer storing verification result metadata over keeping sensitive files forever.
- Redact personal data when displaying admin previews.
- Public pages must not expose internal notes, risk scores, evidence files, reporter identity, private email addresses, or admin-only comments.

## Coding Standards
- Use TypeScript strictly.
- Prefer explicit types over `any`.
- Use server-side validation for all mutations.
- Use Zod or equivalent schema validation where applicable.
- Keep permission checks centralized in `src/lib/permissions` when possible.
- Keep audit logging centralized in `src/lib/audit` when possible.
- Keep Supabase client utilities centralized in `src/lib/supabase`.
- Avoid duplicating business rules across components.
- Paginate list queries by default.
- Add database indexes for admin queues and public listing filters.

## Supabase Rules
- Database schema changes must be implemented through migration files under `supabase/migrations`.
- Do not manually alter production schema without a migration.
- Add comments for complex RLS policies.
- Use helper functions for common authorization checks, such as:
  - `is_admin()`
  - `is_moderator()`
  - `is_super_admin()`
  - `is_org_member(org_id)`
  - `has_org_role(org_id, role)`
- Test RLS from the perspective of normal users, organization admins, moderators, admins, and anonymous users.

## UI/UX Rules
- Vietnamese is the primary language for user-facing UI.
- Use clear trust labels such as:
  - `Chưa xác minh`
  - `Đã xác minh giấy tờ cơ bản`
  - `Đối tác uy tín`
  - `Đã cập nhật gần đây`
  - `Xác minh đã hết hạn`
  - `Review có kiểm chứng`
  - `Nội dung tài trợ`
  - `Nội dung biên tập`
- Never make sponsored content visually indistinguishable from editorial or verified content.
- Admin dashboards should prioritize clarity, filters, status, and auditability over decoration.

## Implementation Workflow
For every feature:
1. Read the relevant `/docs` file.
2. Create or update migration files if data model changes are needed.
3. Add server-side permission checks.
4. Add/update RLS policies when applicable.
5. Add UI only after data access rules are safe.
6. Add audit logging for sensitive actions.
7. Add tests or manual testing notes.
8. Summarize security implications in the final response or PR description.

## Branch and PR Rules
- Keep each module in a focused branch/PR.
- Do not implement the entire Trust Engine in one change.
- Do not mix unrelated UI polish with database/security changes.
- Include testing notes in every PR.
- Include known limitations and follow-up tasks.

## Safe Module Order
Build in this order unless explicitly instructed otherwise:
1. App foundation
2. Database schema
3. RLS policies
4. User verification
5. Organization verification
6. Verified reviews
7. Report system
8. Job order expiry
9. Dispute cases
10. Audit log hardening
11. Sponsored/editorial labeling
12. Security review
13. UI polish
14. Production deploy

## Do Not Do
- Do not build realtime chat in MVP unless explicitly requested.
- Do not add payment logic before verification/trust basics are stable.
- Do not store evidence files in public buckets.
- Do not allow direct client-side updates to moderation status, verification status, user roles, or organization badges.
- Do not create hidden admin bypasses.
- Do not suppress TypeScript or lint errors without explanation.
