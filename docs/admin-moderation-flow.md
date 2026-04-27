# Admin Moderation Flow

## 1. Purpose

Admin moderation protects the platform from false claims, fake reviews, scams, hidden fees, outdated job orders, abusive content, and misleading sponsored content.

Moderation applies to:

- Organization profiles
- Organization verification requests
- User verification requests
- Reviews
- Job orders
- Reports
- Disputes
- Community posts
- Comments
- Sponsored/partner content

## 2. Moderation Roles

### Moderator

Can handle routine moderation:

- Review community reports
- Hide spam
- Approve/reject low-risk reviews
- Request more information
- Escalate high-risk cases

### Admin

Can handle sensitive moderation:

- Approve/reject user verification
- Approve/reject organization verification
- Grant/revoke badges
- Suspend profiles/job orders
- Resolve disputes
- View sensitive evidence

### Super Admin

Can:

- Manage admins
- Override decisions
- Export logs
- Change trust rules
- Handle legal/compliance escalations

## 3. Moderation Queues

Admin dashboard should include these queues:

1. User verification queue
2. Organization verification queue
3. Review moderation queue
4. Report queue
5. Dispute queue
6. Job order verification/expiry queue
7. Community moderation queue
8. Sponsored content review queue

Each queue should support:

- Filters
- Search
- Priority/severity
- Status
- Assigned moderator/admin
- Created date
- Last updated date
- Audit history

## 4. User Verification Moderation

### Input

- Verification request
- Requested stage
- Evidence files
- User profile history
- Previous rejected/approved attempts

### Checks

- Evidence matches requested stage
- Document is readable
- User identity or relationship is plausible
- File does not appear manipulated
- File does not expose unnecessary third-party data
- Same evidence is not reused by many accounts

### Actions

- Approve
- Reject
- Need more info
- Escalate
- Mark suspicious

### Audit actions

- `user_verification_approved`
- `user_verification_rejected`
- `user_verification_more_info_requested`
- `user_verification_revoked`
- `user_verification_escalated`

## 5. Organization Verification Moderation

### Input

- Organization profile
- Submitted documents
- Website/social links
- Representative account
- Fee disclosure
- Service disclosure
- Related job orders
- Report history

### Checks

- Legal/brand identity is consistent
- Contact information is valid
- Website/fanpage appears official
- Representative has right to manage profile
- Fees are not misleading
- Claims are not risky or impossible
- No false official/government affiliation claim
- No guaranteed visa claim
- No unresolved serious disputes

### Actions

- Approve basic verification
- Reject verification
- Request more documents
- Grant trusted partner badge
- Revoke badge
- Suspend organization
- Publish/unpublish profile

### Audit actions

- `organization_verification_approved`
- `organization_verification_rejected`
- `organization_badge_granted`
- `organization_badge_revoked`
- `organization_suspended`
- `organization_unsuspended`

## 6. Review Moderation

### Review submission flow

1. User attempts to write review.
2. System checks review eligibility.
3. User may need to submit proof.
4. Review enters moderation queue.
5. AI may pre-screen for risk.
6. Moderator/admin reviews.
7. Review is published, rejected, or sent back for more information.

### Checks

- User verified stage supports review type
- User relationship to target is plausible
- Review does not contain doxxing
- Review does not contain unsupported serious accusations
- Review does not contain hate/abuse/threats
- Review does not reveal private contract/document data
- Review is not duplicate/spam
- Review is not obvious fake 5-star or attack 1-star review

### Actions

- Publish
- Reject
- Request more proof
- Edit/redact with user/admin approval where needed
- Hide temporarily
- Escalate to dispute

### Right to reply

Organizations may reply to reviews.

Rules:

- Reply must be moderated.
- Reply must not threaten or reveal private user data.
- Reply should address facts and context.
- Reply cannot remove the review by itself.

### Audit actions

- `review_submitted`
- `review_published`
- `review_rejected`
- `review_hidden`
- `review_redacted`
- `review_under_dispute`
- `organization_reply_published`

## 7. Report Moderation

### Report creation

Users can report:

- Profile
- Job order
- Review
- Post/comment
- Article
- User

### Triage severity

Low:

- Spam
- Duplicate
- Minor outdated info

Medium:

- Misleading claims
- Expired job order
- Aggressive language
- Suspicious review

High:

- Scam allegation
- Hidden fees
- Impersonation
- Privacy violation
- Guaranteed visa claim
- Threat/harassment

### Actions

- No action
- Ask reporter for more info
- Hide content temporarily
- Edit/redact content
- Remove content
- Suspend profile/job order
- Escalate to dispute
- Revoke badge

### Audit actions

- `report_created`
- `report_triaged`
- `report_resolved_no_action`
- `report_resolved_content_changed`
- `report_escalated_to_dispute`
- `report_target_suspended`

## 8. Job Order Moderation

### Required checks before publish

- Occupation exists
- Germany city/state provided if known
- Training type provided
- German level required
- Education required
- Start date or expected intake date
- Application deadline
- Expiry date
- Monthly allowance if known
- Fee disclosure
- Recruiter/employer identity
- Verification status

### Risk checks

- Unrealistic salary/allowance claim
- Guaranteed visa claim
- Hidden fees
- Unclear employer identity
- Old deadline
- Duplicate job order
- Mismatched company/recruiter relationship

### Status actions

- Approve publish
- Reject
- Request correction
- Mark closing soon
- Mark expired
- Mark filled
- Suspend

### Automation

A scheduled job should:

- Mark job orders expired after deadline/expires_at
- Mark stale job orders if not updated within configured days
- Notify organization admin before expiry

### Audit actions

- `job_order_submitted`
- `job_order_published`
- `job_order_rejected`
- `job_order_expired`
- `job_order_marked_filled`
- `job_order_suspended`

## 9. Sponsored Content Moderation

### Rules

- Sponsored content must be labeled as sponsored.
- Partner content must be labeled as partner content.
- Sponsored content cannot look identical to editorial content without disclosure.
- Sponsored payment must not affect review score or trust badge.

### Checks

- Label visible on listing cards and detail page
- Sponsor organization stored in database
- Claims are not misleading
- No false official/government implication
- No guaranteed visa claim
- No hidden fee claims

### Audit actions

- `sponsored_content_submitted`
- `sponsored_content_approved`
- `sponsored_content_rejected`
- `sponsored_content_label_updated`

## 10. Dispute Moderation

### Common dispute types

- Organization disputes review
- User disputes rejected verification
- User disputes removed review
- Employer disputes fake job order
- User reports fee abuse
- Organization disputes badge revocation

### Flow

1. Case opened
2. Evidence submitted
3. Admin assigns case
4. Both sides may be asked for information
5. Admin reviews evidence and audit history
6. Admin resolves case
7. Decision is logged
8. Parties are notified

### Resolution options

- Keep content
- Redact content
- Remove content
- Restore content
- Approve verification
- Reject verification
- Revoke badge
- Suspend profile
- Add warning label

### Audit actions

- `dispute_opened`
- `dispute_assigned`
- `dispute_more_info_requested`
- `dispute_resolved`
- `dispute_rejected`
- `dispute_closed`

## 11. AI Pre-Moderation

AI may flag:

- Spam
- Toxic language
- Doxxing
- Personal data exposure
- Unsupported fraud claims
- Review manipulation
- Copy-paste content
- Overly promotional content
- Hidden sponsored language

AI output should be advisory:

- Risk level
- Suggested reason
- Suggested redaction
- Suggested queue priority

AI must not automatically:

- Grant trusted badge
- Delete evidence
- Publicly label fraud
- Resolve high-risk dispute
- Permanently ban organization

## 12. Admin Decision Notes

Every sensitive moderation action requires:

- Decision
- Reason
- Optional internal note
- Optional user-facing note
- Audit log

Internal notes must not be visible to normal users.

## 13. SLA Recommendations

MVP internal targets:

- Routine report: 3-5 business days
- Review moderation: 1-3 business days
- User verification: 1-5 business days
- Organization verification: 3-7 business days
- Serious scam/impersonation report: 24-48 hours
- Privacy violation: as soon as possible

## 14. Admin Dashboard MVP

Required pages:

- `/admin/verifications/users`
- `/admin/verifications/organizations`
- `/admin/reviews`
- `/admin/reports`
- `/admin/disputes`
- `/admin/job-orders`
- `/admin/audit-logs`

Each page should include:

- Table view
- Detail drawer/page
- Status filter
- Action buttons
- Notes
- Audit trail

## 15. Acceptance Criteria

- Admin can approve/reject verification requests.
- Admin can publish/reject reviews.
- Users can report content.
- Admin can resolve reports.
- Admin can open/resolve disputes.
- Job orders can be expired/suspended.
- Sponsored content is clearly labeled.
- Every sensitive action writes to `audit_logs`.
- Users cannot moderate their own organization/profile.
