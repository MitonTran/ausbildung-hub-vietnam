# Audit Log Rules

## 1. Purpose

Audit logs provide an immutable history of sensitive actions in Ausbildung Hub Vietnam. They are critical for trust, dispute handling, security review, AI transparency, and internal accountability.

The platform must be able to answer:

- Who changed this?
- What changed?
- When did it change?
- Why did it change?
- Was AI involved?
- Did a human approve it?
- What was the previous state?
- What was the new state?

## 2. Table

Primary table: `audit_logs`

Recommended columns:

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

## 3. Actor Types

Allowed `actor_type` values:

- `user`
- `organization_member`
- `moderator`
- `admin`
- `super_admin`
- `system`
- `ai`
- `edge_function`

## 4. Target Types

Allowed `target_type` values:

- `profile`
- `user_verification`
- `organization`
- `organization_verification`
- `organization_member`
- `job_order`
- `review`
- `report_flag`
- `dispute_case`
- `article`
- `community_post`
- `comment`
- `application_lead`
- `storage_file`
- `badge`
- `system_setting`

## 5. Required Audit Events

## 5.1 Authentication and profile

Log:

- `profile_created`
- `profile_updated`
- `user_role_changed`
- `self_declared_stage_changed`
- `verified_stage_changed`
- `profile_suspended`
- `profile_deleted`

Do not log:

- Normal page views
- Every login event in MVP unless security requirement exists

## 5.2 User verification

Log:

- `user_verification_submitted`
- `user_verification_file_uploaded`
- `user_verification_approved`
- `user_verification_rejected`
- `user_verification_more_info_requested`
- `user_verification_expired`
- `user_verification_revoked`
- `user_verification_escalated`

Required metadata:

- requested stage
- verification type
- previous verified stage
- new verified stage
- reviewer/admin
- reason

## 5.3 Organization profile

Log:

- `organization_created`
- `organization_claim_requested`
- `organization_claim_approved`
- `organization_claim_rejected`
- `organization_profile_updated`
- `organization_published`
- `organization_unpublished`
- `organization_suspended`
- `organization_unsuspended`
- `organization_deleted`

Required metadata:

- changed fields
- previous value summary
- new value summary
- actor organization role

## 5.4 Organization verification and badge

Log:

- `organization_verification_submitted`
- `organization_verification_approved`
- `organization_verification_rejected`
- `organization_verification_more_info_requested`
- `organization_verification_expired`
- `organization_badge_granted`
- `organization_badge_revoked`
- `organization_badge_expired`
- `organization_trusted_partner_granted`
- `organization_trusted_partner_revoked`

Required metadata:

- old verification status
- new verification status
- old badge
- new badge
- expiry date
- admin reason

## 5.5 Reviews

Log:

- `review_submitted`
- `review_proof_uploaded`
- `review_published`
- `review_rejected`
- `review_more_info_requested`
- `review_hidden`
- `review_redacted`
- `review_removed`
- `review_restored`
- `review_under_dispute`
- `organization_reply_submitted`
- `organization_reply_published`
- `organization_reply_rejected`

Required metadata:

- reviewer id
- target type/id
- review type
- relationship to target
- moderation status change
- moderator/admin reason

## 5.6 Reports

Log:

- `report_created`
- `report_triaged`
- `report_assigned`
- `report_more_info_requested`
- `report_resolved_no_action`
- `report_resolved_content_changed`
- `report_escalated_to_dispute`
- `report_target_suspended`
- `report_closed`

Required metadata:

- report reason
- severity
- target
- outcome

## 5.7 Disputes

Log:

- `dispute_opened`
- `dispute_evidence_uploaded`
- `dispute_assigned`
- `dispute_more_info_requested`
- `dispute_status_changed`
- `dispute_resolved`
- `dispute_rejected`
- `dispute_closed`

Required metadata:

- dispute type
- target
- previous status
- new status
- resolution
- resolver

## 5.8 Job orders

Log:

- `job_order_created`
- `job_order_submitted`
- `job_order_updated`
- `job_order_published`
- `job_order_rejected`
- `job_order_expired`
- `job_order_marked_closing_soon`
- `job_order_marked_filled`
- `job_order_suspended`
- `job_order_unsuspended`
- `job_order_deleted`

Required metadata:

- previous status
- new status
- deadline
- expiry date
- changed fields

## 5.9 Sponsored/editorial content

Log:

- `article_created`
- `article_updated`
- `article_published`
- `article_unpublished`
- `content_type_changed`
- `sponsored_content_submitted`
- `sponsored_content_approved`
- `sponsored_content_rejected`
- `sponsored_label_updated`

Required metadata:

- previous content type
- new content type
- sponsor organization if any
- label visibility check

## 5.10 AI-assisted edits

Log:

- `ai_suggestion_generated`
- `ai_suggestion_accepted`
- `ai_suggestion_rejected`
- `ai_redaction_suggested`
- `ai_moderation_flag_created`
- `ai_rewrite_approved`

Required fields:

- `ai_generated = true`
- `human_approved = true` if accepted
- before/after content summary
- human approver id

## 6. Before/After Data Rules

### Store full before/after data when:

- Badge is changed
- Verification status is changed
- Review is redacted
- Job order status is changed
- Dispute is resolved
- Role is changed
- Organization is suspended

### Store summary only when:

- Profile text is updated frequently
- Article content is long
- Community post is edited
- Non-sensitive cosmetic field changes

### Avoid storing excessive sensitive data

Do not store full copies of:

- Visa documents
- Contracts
- Residence documents
- Invoices
- Private evidence images

Instead store:

- file path reference
- evidence type
- action result
- reviewer/admin
- timestamp

## 7. Immutability Rules

- Normal users cannot insert/update/delete audit logs directly.
- Organization admins cannot edit audit logs.
- Moderators cannot delete audit logs.
- Admins should not update/delete audit logs through UI.
- Super admin export is allowed.
- If correction is needed, write a new audit event: `audit_log_correction_added`.

## 8. Audit Log Access Rules

### User

May see limited history of their own verification/review status changes if needed.

Example:

- Request submitted
- Approved/rejected
- Need more info

Do not expose internal notes, risk score, or admin names if not appropriate.

### Organization admin

May see limited public-facing history for owned organization:

- Profile submitted
- Verification approved/rejected
- Badge status
- Job order status

Do not expose reporter identity or internal risk notes.

### Moderator

Can see logs related to assigned moderation queues.

### Admin

Can read all audit logs.

### Super admin

Can read/export all audit logs.

## 9. Audit Log UI

Admin audit log viewer should support:

- Search by target type/id
- Search by actor
- Filter by action
- Filter by date range
- Filter by AI-generated actions
- View before/after summary
- Link to target object

## 10. Event Creation Pattern

Recommended application-level function:

```ts
await writeAuditLog({
  actorId,
  actorType,
  action,
  targetType,
  targetId,
  changedFields,
  beforeData,
  afterData,
  reason,
  aiGenerated: false,
  humanApproved: false,
  requestContext,
});
```

All admin actions should call this function.

## 11. Database Trigger Pattern

Use triggers for automatic low-level changes only when useful.

Good candidates:

- `updated_at` updates
- job order auto-expiry events
- status changes performed by scheduled functions

For complex moderation decisions, prefer explicit server-side audit write so reason and actor are clear.

## 12. Scheduled/System Audit Events

For automated jobs:

- `actor_type = system`
- `actor_id = null`

Examples:

- `job_order_expired`
- `verification_expired`
- `badge_expired`

## 13. AI Audit Requirements

If AI modifies or suggests changes to user-visible content:

- Store original content summary.
- Store AI suggestion summary.
- Store final approved content summary.
- Store approver id.
- Set `ai_generated = true`.
- Set `human_approved = true` only if a human approved.

If AI only flags content for review:

- Log `ai_moderation_flag_created`.
- Do not change public content without moderation.

## 14. Acceptance Criteria

- All verification decisions write audit logs.
- All badge changes write audit logs.
- All review moderation decisions write audit logs.
- All report resolutions write audit logs.
- All dispute resolutions write audit logs.
- All job order status changes write audit logs.
- AI edits/suggestions are identifiable.
- Normal users cannot edit/delete audit logs.
- Admin can search audit logs.
- Evidence file contents are not duplicated unnecessarily in audit logs.
