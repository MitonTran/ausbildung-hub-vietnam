/**
 * Verified-review constants, types, eligibility helpers, and
 * verification-label resolvers.
 *
 * Mirrors the schema's CHECK constraints from migration 0002 exactly
 * so the UI and the DB agree on which values are valid.
 *
 * See:
 *   - /docs/trust-engine.md §3.3 (relationship-gated reviews)
 *   - /docs/user-verification-flow.md §2 (allowed actions per stage)
 *   - /docs/admin-moderation-flow.md §6 (review moderation flow)
 *   - /docs/database-schema.md §2.7 (reviews table)
 *   - /docs/audit-log-rules.md §5.5 (review audit events)
 */

import type { UserStage } from "./verification";
import type { OrgType } from "./organization";

// -------------------------------------------------------------------
// review_type — must match reviews_review_type_check (0002)
// -------------------------------------------------------------------

export const REVIEW_TYPES = [
  "center_experience",
  "recruiter_experience",
  "employer_hiring_process",
  "ausbildung_experience",
  "germany_life_experience",
] as const;

export type ReviewType = (typeof REVIEW_TYPES)[number];

export const REVIEW_TYPE_LABEL_VI: Record<ReviewType, string> = {
  center_experience: "Trải nghiệm tại trung tâm đào tạo",
  recruiter_experience: "Trải nghiệm với đơn vị tuyển dụng",
  employer_hiring_process: "Quy trình tuyển dụng của doanh nghiệp",
  ausbildung_experience: "Trải nghiệm học nghề tại Đức",
  germany_life_experience: "Trải nghiệm cuộc sống tại Đức",
};

// -------------------------------------------------------------------
// relationship_to_target — must match
// reviews_relationship_to_target_check (0002)
// -------------------------------------------------------------------

export const REVIEW_RELATIONSHIPS = [
  "studied_at_center",
  "completed_course",
  "consulted_only",
  "interviewed",
  "signed_contract",
  "visa_process",
  "in_germany",
  "doing_ausbildung",
  "alumni",
] as const;

export type ReviewRelationship = (typeof REVIEW_RELATIONSHIPS)[number];

export const REVIEW_RELATIONSHIP_LABEL_VI: Record<
  ReviewRelationship,
  string
> = {
  studied_at_center: "Tôi đang học tại trung tâm này",
  completed_course: "Tôi đã hoàn thành khóa học tại trung tâm này",
  consulted_only: "Tôi chỉ được tư vấn",
  interviewed: "Tôi đã phỏng vấn với đơn vị này",
  signed_contract: "Tôi đã ký hợp đồng với đơn vị này",
  visa_process: "Tôi đang làm hồ sơ visa với đơn vị này",
  in_germany: "Tôi đã sang Đức",
  doing_ausbildung: "Tôi đang học nghề tại Đức",
  alumni: "Tôi đã hoàn thành Ausbildung",
};

// -------------------------------------------------------------------
// moderation_status — must match reviews_moderation_status_check (0002)
// -------------------------------------------------------------------

export const REVIEW_MODERATION_STATUSES = [
  "pending",
  "approved",
  "published",
  "rejected",
  "need_more_info",
  "hidden",
  "under_dispute",
  "removed",
] as const;

export type ReviewModerationStatus =
  (typeof REVIEW_MODERATION_STATUSES)[number];

export const REVIEW_MODERATION_STATUS_LABEL_VI: Record<
  ReviewModerationStatus,
  string
> = {
  pending: "Đang chờ duyệt",
  approved: "Đã duyệt (chưa hiển thị)",
  published: "Đã xuất bản",
  rejected: "Bị từ chối",
  need_more_info: "Cần bổ sung bằng chứng",
  hidden: "Đang tạm ẩn",
  under_dispute: "Đang tranh chấp",
  removed: "Đã gỡ bỏ",
};

export const REVIEW_PROOF_STATUSES = [
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
  "need_more_info",
] as const;

export type ReviewProofStatus = (typeof REVIEW_PROOF_STATUSES)[number];

// -------------------------------------------------------------------
// Eligibility map — review_type → allowed verified_stages.
//
// Sourced verbatim from the task spec / trust-engine §3.3:
//   * center_experience: studying_at_center, completed_center_course
//   * recruiter_experience / employer_hiring_process: interviewed,
//     contract_signed, visa_process, in_germany, doing_ausbildung,
//     alumni
//   * ausbildung_experience / germany_life_experience: in_germany,
//     doing_ausbildung, alumni
// -------------------------------------------------------------------

export const REVIEW_TYPE_ELIGIBLE_STAGES: Record<
  ReviewType,
  ReadonlyArray<UserStage>
> = {
  center_experience: ["studying_at_center", "completed_center_course"],
  recruiter_experience: [
    "interviewed",
    "contract_signed",
    "visa_process",
    "in_germany",
    "doing_ausbildung",
    "alumni",
  ],
  employer_hiring_process: [
    "interviewed",
    "contract_signed",
    "visa_process",
    "in_germany",
    "doing_ausbildung",
    "alumni",
  ],
  ausbildung_experience: ["in_germany", "doing_ausbildung", "alumni"],
  germany_life_experience: ["in_germany", "doing_ausbildung", "alumni"],
};

/**
 * Map verified_stage → relationship_to_target the user can legitimately
 * claim. Used both to populate the form's relationship dropdown and to
 * server-validate the submitted relationship.
 *
 * The relationships here are a subset of REVIEW_RELATIONSHIPS that the
 * verified stage actually proves. A user verified as `in_germany` can
 * claim `in_germany`, but cannot claim `doing_ausbildung` (they would
 * need that explicit verification).
 */
export const VERIFIED_STAGE_RELATIONSHIPS: Record<
  UserStage,
  ReadonlyArray<ReviewRelationship>
> = {
  exploring: [],
  studying_german: [],
  studying_at_center: ["studied_at_center"],
  completed_center_course: ["completed_course", "studied_at_center"],
  interviewed: ["interviewed"],
  contract_signed: ["signed_contract", "interviewed"],
  visa_process: ["visa_process", "signed_contract", "interviewed"],
  in_germany: [
    "in_germany",
    "visa_process",
    "signed_contract",
    "interviewed",
  ],
  doing_ausbildung: [
    "doing_ausbildung",
    "in_germany",
    "signed_contract",
    "interviewed",
  ],
  alumni: [
    "alumni",
    "doing_ausbildung",
    "in_germany",
    "signed_contract",
    "interviewed",
  ],
};

// -------------------------------------------------------------------
// Org-type → allowed review_types. Centers can only get center
// experience reviews. Employers / recruiters / agencies can get
// hiring-process and Ausbildung/Germany experience reviews.
// -------------------------------------------------------------------

export const ORG_TYPE_REVIEW_TYPES: Record<OrgType, ReadonlyArray<ReviewType>> =
  {
    training_center: ["center_experience"],
    consulting_center: ["center_experience"],
    school: ["center_experience"],
    employer: [
      "employer_hiring_process",
      "ausbildung_experience",
      "germany_life_experience",
    ],
    recruiter: [
      "recruiter_experience",
      "ausbildung_experience",
      "germany_life_experience",
    ],
    agency: [
      "recruiter_experience",
      "ausbildung_experience",
      "germany_life_experience",
    ],
    other: [
      "recruiter_experience",
      "employer_hiring_process",
      "ausbildung_experience",
      "germany_life_experience",
    ],
  };

/**
 * Returns the review_types the given user can submit for an
 * organization of the given type, given their verified_stage.
 *
 * This is the canonical server-side gate referenced from
 * `submitReviewAction` and from the page renderers that decide whether
 * to show the review form at all.
 */
export function eligibleReviewTypesFor(args: {
  orgType: OrgType;
  verifiedStage: UserStage | null;
}): ReviewType[] {
  if (!args.verifiedStage) return [];
  const orgAllowed = ORG_TYPE_REVIEW_TYPES[args.orgType] ?? [];
  return orgAllowed.filter((rt) =>
    (REVIEW_TYPE_ELIGIBLE_STAGES[rt] as ReadonlyArray<string>).includes(
      args.verifiedStage as string
    )
  );
}

/**
 * True when the given verified_stage is allowed to submit the given
 * review_type. Mirrors the eligibility table above.
 */
export function canSubmitReviewType(
  verifiedStage: UserStage | null,
  reviewType: ReviewType
): boolean {
  if (!verifiedStage) return false;
  return (
    REVIEW_TYPE_ELIGIBLE_STAGES[reviewType] as ReadonlyArray<string>
  ).includes(verifiedStage);
}

/**
 * True when the given verified_stage can legitimately claim the
 * relationship to the target.
 */
export function isRelationshipAllowedFor(
  verifiedStage: UserStage | null,
  relationship: ReviewRelationship
): boolean {
  if (!verifiedStage) return false;
  return (
    VERIFIED_STAGE_RELATIONSHIPS[verifiedStage] as ReadonlyArray<string>
  ).includes(relationship);
}

// -------------------------------------------------------------------
// Public-facing verification label for a published review.
//
// Per the task spec, every published review shows a generic
// "Review có kiểm chứng" chip plus a relationship-specific label.
// -------------------------------------------------------------------

export const REVIEW_VERIFIED_GENERIC_LABEL_VI = "Review có kiểm chứng";

export const REVIEW_RELATIONSHIP_VERIFIED_LABEL_VI: Record<
  ReviewRelationship,
  string
> = {
  studied_at_center: "Người dùng đã học tại trung tâm này",
  completed_course: "Người dùng đã học tại trung tâm này",
  consulted_only: "Người dùng đã được tư vấn",
  interviewed: "Người dùng đã phỏng vấn",
  signed_contract: "Người dùng đã ký hợp đồng",
  visa_process: "Người dùng đã ký hợp đồng",
  in_germany: "Người dùng đang ở Đức",
  doing_ausbildung: "Người dùng đang ở Đức",
  alumni: "Người dùng đang ở Đức",
};

export function reviewRelationshipVerifiedLabelVi(
  relationship: ReviewRelationship
): string {
  return (
    REVIEW_RELATIONSHIP_VERIFIED_LABEL_VI[relationship] ??
    REVIEW_VERIFIED_GENERIC_LABEL_VI
  );
}

// -------------------------------------------------------------------
// Storage bucket / file constants — mirrors migration 0007.
// -------------------------------------------------------------------

export const REVIEW_PROOF_BUCKET = "review-proof-private";
export const REVIEW_PROOF_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const REVIEW_PROOF_FILES_MAX_COUNT = 5;
export const REVIEW_PROOF_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export const REVIEW_PROOF_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
];

/**
 * Storage path for a review-proof file. Layout matches the
 * storage.objects RLS policies in 0007_review_proof_storage.sql:
 *   user/<userId>/review/<reviewId>/<filename>
 */
export function buildReviewProofPath(args: {
  userId: string;
  reviewId: string;
  filename: string;
}): string {
  return `user/${args.userId}/review/${args.reviewId}/${args.filename}`;
}

export function basenameFromPath(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

// -------------------------------------------------------------------
// Row shape returned by the review queries the UI uses. Kept narrow.
// -------------------------------------------------------------------

export type ReviewRow = {
  id: string;
  reviewer_id: string;
  target_type: "organization" | "job_order" | "course" | "article";
  target_id: string;
  review_type: ReviewType;
  relationship_to_target: ReviewRelationship;
  rating: number | null;
  title: string | null;
  content: string;
  proof_status: ReviewProofStatus;
  proof_file_paths: string[] | null;
  moderation_status: ReviewModerationStatus;
  published_at: string | null;
  rejected_reason: string | null;
  right_to_reply: string | null;
  reply_by: string | null;
  reply_at: string | null;
  dispute_status: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
