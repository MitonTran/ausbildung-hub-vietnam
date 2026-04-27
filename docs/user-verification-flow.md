# User Verification Flow

## 1. Purpose

User verification allows Ausbildung Hub Vietnam to classify users by their real relationship to the Ausbildung journey. This powers verified reviews, trusted community answers, and safer lead matching.

The platform should separate:

- What the user claims: `self_declared_stage`
- What the platform has verified: `verified_stage`

## 2. Supported User Stages

### 2.1 exploring

Vietnamese label:

> Đang tìm hiểu

Description:

User is researching Ausbildung in Germany but has not submitted proof of study, interview, contract, visa, or Germany status.

Default stage after registration.

Allowed actions:

- Read content
- Save centers/jobs
- Submit leads
- Ask community questions
- Report suspicious content

Not allowed:

- Official review of centers/companies
- Germany experience review
- Contract/employer review

### 2.2 studying_german

Vietnamese label:

> Đang học tiếng Đức

Possible evidence:

- Course invoice
- Class schedule
- Enrollment confirmation
- Email confirmation
- Student ID
- Center confirmation

Allowed actions after verification:

- Limited review of learning experience if target is related
- Community answers with learner badge

### 2.3 studying_at_center

Vietnamese label:

> Đang học tại trung tâm

Possible evidence:

- Invoice
- Student ID
- Class schedule with name
- Center confirmation
- Email/SMS confirmation

Allowed actions after verification:

- Review the verified center
- Rate class quality, schedule, teacher, support, transparency

### 2.4 completed_center_course

Vietnamese label:

> Đã hoàn thành khóa học tại trung tâm

Possible evidence:

- Completion certificate
- Exam result if user wants to share
- Center confirmation
- Course history

Allowed actions after verification:

- Review center with higher weight
- Share learning pathway experience

### 2.5 interviewed

Vietnamese label:

> Đã phỏng vấn

Possible evidence:

- Interview invitation
- Calendar invite
- Email from recruiter/employer
- Screenshot of interview schedule with sensitive information hidden
- Application record on platform

Allowed actions after verification:

- Review recruiter/employer hiring process
- Review response speed, clarity, interview experience

Not allowed:

- Review actual working/living conditions unless later verified as in Germany or doing Ausbildung

### 2.6 contract_signed

Vietnamese label:

> Đã ký hợp đồng

Possible evidence:

- Offer letter
- Ausbildung contract
- Email confirming offer
- Recruiter/employer confirmation

Allowed actions after verification:

- Review contract transparency
- Review recruiter/employer process
- Review fee/service clarity

### 2.7 visa_process

Vietnamese label:

> Đang làm hồ sơ visa

Possible evidence:

- Visa appointment confirmation
- Checklist confirmation
- Agency/center confirmation
- Submission-related documents with sensitive data redacted

Allowed actions after verification:

- Review visa support process
- Share timeline experience

### 2.8 in_germany

Vietnamese label:

> Đã sang Đức

Possible evidence:

- Residence proof with sensitive information redacted
- German address registration proof with address hidden if needed
- Employer/school email
- Entry/visa proof
- Contract confirmation

Allowed actions after verification:

- Review Germany arrival process
- Review support after arrival
- Review practical city/state experience

### 2.9 doing_ausbildung

Vietnamese label:

> Đang học nghề tại Đức

Possible evidence:

- Ausbildung contract
- Berufsschule confirmation
- Employer email
- Student card
- Payroll/allowance evidence with sensitive data redacted

Allowed actions after verification:

- Review employer/company
- Review training reality
- Review occupation experience
- Review city/living conditions

### 2.10 alumni

Vietnamese label:

> Đã hoàn thành Ausbildung

Possible evidence:

- Completion certificate
- Employment contract after Ausbildung
- Employer confirmation
- School confirmation

Allowed actions after verification:

- Highest review weight
- Mentor badge eligibility
- Expert Q&A eligibility

## 3. Registration Flow

During signup, ask:

> Bạn đang ở giai đoạn nào trong hành trình du học nghề Đức?

Options:

- Tôi mới tìm hiểu
- Tôi đang học tiếng Đức
- Tôi đang học tại một trung tâm
- Tôi đã hoàn thành khóa học tại trung tâm
- Tôi đã phỏng vấn
- Tôi đã ký hợp đồng
- Tôi đang làm hồ sơ visa
- Tôi đã sang Đức
- Tôi đang học nghề tại Đức
- Tôi đã hoàn thành Ausbildung

System action:

- Save selected value to `profiles.self_declared_stage`.
- Keep `profiles.verified_stage = null` until proof is approved.
- Show user a clear message: self-declared status is not a verified badge.

## 4. Verification Request Flow

### Step 1: User starts verification

User clicks:

> Xác minh trạng thái của tôi

System shows:

- Current self-declared stage
- Available verification stage options
- Evidence requirements
- Privacy warning
- Redaction guidance

### Step 2: User selects stage to verify

Example:

> Tôi muốn xác minh: Đã phỏng vấn

System checks:

- User is authenticated
- User has not submitted too many pending requests
- Requested stage is valid

### Step 3: User uploads evidence

Supported evidence:

- PDF
- JPG
- PNG

MVP limits:

- Maximum 2-5 MB per file
- Maximum 3 files per request
- No video upload
- Private bucket only

User must confirm:

- They have the right to upload the document.
- They have redacted sensitive information where possible.
- The document is authentic.

### Step 4: Create verification request

Create row in `user_verifications`:

- `user_id`
- `requested_stage`
- `verification_type`
- `evidence_file_paths`
- `status = pending`
- `created_at`

Write audit log:

- `action = user_verification_submitted`
- `actor_id = user_id`
- `target_type = user_verification`
- `target_id = verification_id`

### Step 5: Admin/moderator review

Admin sees queue with:

- User
- Requested stage
- Evidence type
- Submitted date
- Risk indicators
- Previous verification history
- Related organization/job if provided

Admin actions:

- Approve
- Reject
- Need more info
- Escalate
- Mark suspicious

### Step 6A: Approval

System updates `user_verifications`:

- `status = approved`
- `reviewed_by`
- `reviewed_at`
- `expires_at` if applicable

System updates `profiles`:

- `verified_stage = requested_stage`
- `verification_status = verified`

Write audit log:

- `action = user_verification_approved`
- Before/after profile verification fields
- Admin reason/note

Notify user:

> Trạng thái của bạn đã được xác minh.

### Step 6B: Rejection

System updates:

- `status = rejected`
- `rejection_reason`
- `reviewed_by`
- `reviewed_at`

Write audit log:

- `action = user_verification_rejected`

Notify user with safe reason:

- Document unreadable
- Wrong document type
- Insufficient proof
- Cannot match identity
- Duplicate/suspicious evidence

### Step 6C: Need more info

System updates:

- `status = need_more_info`
- `admin_note`

User may upload additional evidence.

## 5. Progressive Verification

Users should not be forced to fully verify at signup. Verification should be progressive:

- Basic account: email verified
- Stage self-declared: user-selected status
- Stage verified: proof approved
- Cross-verified: confirmed by center/employer/platform record

## 6. Cross-Verification

Cross-verification sources:

- Center confirms the user studied there
- Employer/recruiter confirms interview or contract
- Application lead record matches review target
- Email domain confirmation from school/employer
- Verified alumni/mentor confirms relationship

Cross-verification should set a stronger proof state:

- `proof_status = cross_verified`

## 7. Review Unlock Rules

### Center reviews

Allowed if verified stage is:

- `studying_at_center`
- `completed_center_course`
- `contract_signed`, if center relationship exists
- `visa_process`, if center relationship exists
- `in_germany`, if center relationship exists
- `doing_ausbildung`, if center relationship exists
- `alumni`, if center relationship exists

### Recruiter/employer hiring process reviews

Allowed if verified stage is:

- `interviewed`
- `contract_signed`
- `visa_process`
- `in_germany`
- `doing_ausbildung`
- `alumni`

### Germany/Ausbildung experience reviews

Allowed if verified stage is:

- `in_germany`
- `doing_ausbildung`
- `alumni`

## 8. Privacy Rules

The verification UI must warn users:

- Do not upload unnecessary sensitive information.
- Redact document numbers where possible.
- Redact full address where possible.
- Redact financial numbers not needed for verification.
- Do not upload other people's private data without permission.

Admin UI should show evidence only through signed URLs.

Signed URL expiry:

- 5-15 minutes recommended.

Evidence retention:

- MVP: keep until verification expires or dispute window closes.
- Later: auto-delete rejected evidence after 30-90 days.

## 9. Verification Expiry

Recommended expiry:

- `studying_at_center`: 6-12 months
- `completed_center_course`: no expiry or 24 months
- `interviewed`: 6-12 months
- `contract_signed`: 12-24 months
- `visa_process`: 6-12 months
- `in_germany`: 12 months
- `doing_ausbildung`: 12 months
- `alumni`: no expiry or 36 months

Expired verification should not delete history but may remove active badge.

## 10. Abuse Prevention

Add checks for:

- Multiple accounts uploading same file
- Same file hash across many users
- Many verification attempts in short time
- Suspicious IP/device patterns
- Review immediately after account creation
- User reviewing many unrelated organizations

## 11. MVP UI Pages

### User Dashboard

- Current self-declared stage
- Current verified stage
- Verification status
- Submit verification button
- Verification history

### Verification Submit Page

- Choose stage
- Choose evidence type
- Upload files
- Privacy notice
- Submit

### Admin Verification Queue

- Pending requests
- Filters by requested stage/status
- Evidence viewer
- Approve/reject/need more info
- Audit history

## 12. Acceptance Criteria

- User can register and select stage.
- User can submit verification request with private evidence files.
- User can see own verification status.
- Admin can approve/reject request.
- Approval updates user verified stage.
- Rejection provides a reason.
- Every decision writes audit log.
- Users cannot access other users' evidence.
- Review eligibility uses verified stage, not self-declared stage.
