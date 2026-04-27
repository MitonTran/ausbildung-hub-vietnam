# Trust Engine Specification

## 1. Purpose

The Trust Engine is the core credibility layer of Ausbildung Hub Vietnam. Its purpose is to make profiles, reviews, job orders, sponsored content, and community interactions more transparent and safer for Vietnamese users researching vocational training in Germany.

The platform should not treat every user, center, company, recruiter, review, and job order as equally trustworthy. Every public object should have a clear trust state, verification state, moderation state, and audit history.

## 2. Product Positioning

Ausbildung Hub Vietnam is not just a news website about Ausbildung in Germany. It is a trust-first SaaS marketplace and information platform where:

- Training centers have standardized verified profiles.
- Employers/recruiters have structured profiles and job orders.
- Reviews are permission-gated and proof-based.
- Users can report suspicious or misleading content.
- Job orders expire automatically if not updated.
- Sponsored content is clearly separated from editorial content.
- Admins can moderate, verify, audit, suspend, and resolve disputes.

## 3. Core Principles

### 3.1 Standardized, not free-form

Profiles and job orders must follow structured forms. Centers and recruiters should not be able to publish pure PR content without required fields.

### 3.2 Verification has levels

A single “verified” badge is not enough. The platform should support multiple states:

- Unverified
- Basic documents verified
- Trusted partner
- Recently updated
- Verification expired
- Suspended
- Revoked

### 3.3 Reviews require relationship proof

Users cannot review anything freely. Official reviews require a relationship to the reviewed entity:

- Studied at center
- Completed center course
- Interviewed with recruiter/employer
- Signed contract
- Visa process
- In Germany
- Currently doing Ausbildung
- Alumni

### 3.4 Trust is separate from payment

Paid plans may unlock featured listing, analytics, lead dashboard, or sponsored placements. Payment must not automatically grant trusted status.

### 3.5 Every sensitive action must be auditable

Admin actions, AI edits, verification decisions, review moderation, badge changes, suspensions, job order status changes, and dispute outcomes must be recorded in `audit_logs`.

## 4. User Types

### 4.1 Visitor

Can:

- Read public articles
- Browse public profiles
- Browse public job orders
- Read published reviews
- Read community posts

Cannot:

- Write reviews
- Submit reports
- Upload verification documents
- Access dashboards

### 4.2 Student

Can:

- Create profile
- Select self-declared stage
- Save centers/jobs
- Submit leads
- Join community
- Submit reports
- Request verification
- Write reviews only if eligible

### 4.3 Center Admin

Can:

- Claim/create center profile
- Update owned center profile
- Submit verification request
- Create class intakes
- Respond to reviews
- View leads related to owned center

Cannot:

- Self-approve verification
- Edit reviews
- Delete reports
- Access user verification evidence unless explicitly allowed

### 4.4 Employer/Recruiter Admin

Can:

- Claim/create company/recruiter profile
- Create job orders
- Update owned job orders
- Submit organization verification request
- Respond to reviews
- View leads related to owned company/job orders

Cannot:

- Self-approve badge
- Publish job orders without required fields
- Access private user evidence unless explicitly allowed

### 4.5 Moderator

Can:

- Review reports
- Review community content
- Approve/reject non-sensitive reviews
- Hide content temporarily
- Escalate to admin

Cannot:

- Grant trusted partner badge
- Delete audit logs
- Access highly sensitive verification evidence unless assigned

### 4.6 Admin

Can:

- Approve/reject verification requests
- Grant/revoke badges
- Moderate reviews
- Resolve reports
- Resolve disputes
- Suspend profiles/content
- View audit logs

### 4.7 Super Admin

Can:

- Manage admins/moderators
- Manage system-wide settings
- Override decisions
- Rotate security settings
- Access full audit system

## 5. User Stages

User stages should be split into two fields:

- `self_declared_stage`: what the user selected.
- `verified_stage`: what the platform has verified.

Supported stages:

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

## 6. Organization Types

Supported organization types:

- `training_center`
- `consulting_center`
- `employer`
- `recruiter`
- `agency`
- `school`
- `other`

## 7. Organization Verification Levels

### 7.1 Unverified

Default state. The organization may be created by admin, user submission, or claimed by a business account.

Public label:

> Chưa xác minh

### 7.2 Basic Documents Verified

Requirements:

- Legal name provided
- Business identifier or equivalent proof provided when applicable
- Address or operating location provided
- Official website, email, or social page verified
- Representative identity or management right verified
- Required profile fields completed

Public label:

> Đã xác minh giấy tờ cơ bản

### 7.3 Trusted Partner

Requirements:

- Basic documents verified
- Good verified review history
- Low valid report rate
- No unresolved serious disputes
- Transparent fee/service disclosure
- Regular profile updates
- Manual admin approval

Public label:

> Đối tác uy tín

Important: this badge must not be purchasable.

### 7.4 Recently Updated

Requirements:

- Important profile information confirmed within configured period, usually 30 or 60 days.

Public label:

> Đã cập nhật gần đây

### 7.5 Verification Expired

Applied when verification validity has passed and no re-verification has been completed.

Public label:

> Đã hết hạn xác minh

### 7.6 Suspended

Applied when profile is under serious investigation, fraud suspicion, repeated reports, or policy violation.

Public label:

> Đang bị tạm ẩn/xem xét

## 8. Review Eligibility Matrix

| Verified User Stage | Center Review | Recruiter Review | Employer Hiring Review | Germany/Ausbildung Experience Review |
|---|---:|---:|---:|---:|
| exploring | No | No | No | No |
| studying_german | Limited | No | No | No |
| studying_at_center | Yes | No | No | No |
| completed_center_course | Yes | Limited | No | No |
| interviewed | Limited | Yes | Yes, hiring process only | No |
| contract_signed | Yes, if related | Yes | Yes, contract/hiring only | Limited |
| visa_process | Yes, if related | Yes | Yes, process only | Limited |
| in_germany | Yes | Yes | Yes | Yes |
| doing_ausbildung | Yes | Yes | Yes | Yes |
| alumni | Yes | Yes | Yes | Yes |

## 9. Content Types

Supported content types:

- `editorial`
- `sponsored`
- `partner_content`
- `user_generated`

Rules:

- Sponsored content must always be labeled.
- Partner content must be labeled as partner-provided and moderated.
- User-generated content must not appear as editorial.
- Paid placement must not influence trust badges.

## 10. Job Order Trust Rules

Every job order must have:

- Occupation
- City/state in Germany
- Training type
- German level required
- Education required
- Start date
- Interview date if known
- Application deadline
- Expiry date
- Monthly training allowance if known
- Accommodation support field
- Fee disclosure
- Verification status
- Last updated date

Supported job order statuses:

- `draft`
- `pending_verification`
- `published`
- `closing_soon`
- `expired`
- `filled`
- `under_review`
- `suspended`
- `rejected`

Automatic rules:

- If `deadline_at` has passed, mark as `expired`.
- If `last_updated_at` is older than configured threshold, show stale data warning.
- If serious reports are submitted, mark as `under_review` or `suspended`.

## 11. Report System

Every public object should be reportable:

- Organization profile
- Job order
- Review
- Article
- Community post
- Comment
- User profile

Report reasons:

- False information
- Scam/fraud suspicion
- Hidden or unclear fees
- Guaranteed visa claim
- Impersonation
- Expired job order
- Harassment/abuse
- Spam
- Privacy violation
- Other

Report outcomes:

- No action
- Content edited/redacted
- Content hidden
- Content removed
- Request more information
- Warning issued
- Badge revoked
- Profile suspended
- Escalated to dispute

## 12. Dispute System

Dispute cases allow users and organizations to appeal or challenge decisions/content.

Common dispute cases:

- Organization disputes a review
- User disputes review removal
- Employer disputes impersonated job order
- User reports fee abuse
- Organization disputes badge revocation
- User disputes verification rejection

Dispute statuses:

- `open`
- `waiting_for_user`
- `waiting_for_organization`
- `under_review`
- `resolved`
- `rejected`
- `closed`

Resolution actions:

- Keep content
- Edit/redact content
- Remove content
- Restore content
- Suspend profile
- Revoke badge
- Approve verification
- Reject verification
- Add warning label

## 13. AI Use Rules

AI may assist with:

- Spam detection
- Toxicity detection
- Private information detection
- Suspicious pattern detection
- Suggested redaction
- Suggested rewrite for policy-compliant wording
- Moderation queue prioritization

AI must not independently:

- Grant trusted partner badge
- Permanently delete evidence
- Resolve serious disputes
- Accuse an organization of fraud publicly
- Approve high-risk verification without human review

Every AI-assisted sensitive action must be logged:

- `ai_generated = true`
- `human_approved = true/false`
- Suggested content
- Final content
- Actor who approved

## 14. MVP Scope

MVP must include:

- User roles
- Self-declared user stage
- Evidence-based user verification
- Organization verification
- Verified profile badges
- Review eligibility gate
- Review moderation queue
- Report flags
- Job order expiry
- Sponsored/editorial label
- Dispute case creation
- Audit logs
- Admin dashboard

Not required in MVP:

- Full eKYC
- OCR automation
- Government registry API integration
- Real-time chat
- Public trust score
- Complex fraud ML system
- Native mobile app

## 15. Non-negotiable Security Requirements

- RLS must be enabled on all sensitive tables.
- Service role key must never be exposed to frontend.
- Evidence files must be stored in private buckets.
- Signed URLs must be short-lived.
- Admin actions must write audit logs.
- Users must not read other users' verification evidence.
- Organization admins must not self-approve verification or badges.
- Audit logs must not be editable by normal users.
