/**
 * Dispute Case workflow constants and helpers.
 *
 * Mirrors the schema's CHECK constraints (see
 * 0002_trust_engine_schema.sql + 0009_dispute_cases_extensions_and_storage.sql)
 * so the form, server actions, and admin queue agree on the allowed
 * values.
 *
 * See:
 *   - /docs/admin-moderation-flow.md §10 (dispute flow + resolutions)
 *   - /docs/audit-log-rules.md §5.7      (audit events for disputes)
 *   - /docs/database-schema.md §2.9 §3.4 (dispute_cases + storage)
 */

// -------------------------------------------------------------------
// Dispute target types (the 6 surfaces that can be disputed).
// Mirrors dispute_cases_target_type_check.
// -------------------------------------------------------------------
export const DISPUTE_TARGET_TYPES = [
  "review",
  "organization",
  "job_order",
  "report_flag",
  "verification_decision",
  "content_removal",
] as const;

export type DisputeTargetType = (typeof DISPUTE_TARGET_TYPES)[number];

export const DISPUTE_TARGET_TYPE_LABEL_VI: Record<DisputeTargetType, string> = {
  review: "Đánh giá",
  organization: "Tổ chức",
  job_order: "Đơn tuyển",
  report_flag: "Báo cáo",
  verification_decision: "Quyết định xác minh",
  content_removal: "Việc gỡ nội dung",
};

export function isDisputeTargetType(v: unknown): v is DisputeTargetType {
  return (
    typeof v === "string" &&
    (DISPUTE_TARGET_TYPES as ReadonlyArray<string>).includes(v)
  );
}

// -------------------------------------------------------------------
// Dispute types (user-facing reason for the dispute).
// Mirrors dispute_cases_dispute_type_check.
// -------------------------------------------------------------------
export const DISPUTE_TYPES = [
  "review_unfair",
  "verification_unfair",
  "badge_revocation_unfair",
  "fee_dispute",
  "fake_job_order",
  "content_removal_unfair",
  "other",
] as const;

export type DisputeType = (typeof DISPUTE_TYPES)[number];

export const DISPUTE_TYPE_LABEL_VI: Record<DisputeType, string> = {
  review_unfair: "Đánh giá không công bằng",
  verification_unfair: "Quyết định xác minh không công bằng",
  badge_revocation_unfair: "Việc thu hồi huy hiệu không công bằng",
  fee_dispute: "Tranh chấp về phí",
  fake_job_order: "Đơn tuyển giả mạo",
  content_removal_unfair: "Nội dung bị gỡ không hợp lý",
  other: "Khác",
};

export function isDisputeType(v: unknown): v is DisputeType {
  return (
    typeof v === "string" &&
    (DISPUTE_TYPES as ReadonlyArray<string>).includes(v)
  );
}

// -------------------------------------------------------------------
// Dispute status (workflow state).
// Mirrors dispute_cases_status_check from 0002.
// -------------------------------------------------------------------
export const DISPUTE_STATUSES = [
  "open",
  "waiting_for_user",
  "waiting_for_organization",
  "under_review",
  "resolved",
  "rejected",
  "closed",
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_STATUS_LABEL_VI: Record<DisputeStatus, string> = {
  open: "Mới",
  waiting_for_user: "Chờ thông tin từ người dùng",
  waiting_for_organization: "Chờ thông tin từ tổ chức",
  under_review: "Đang xem xét",
  resolved: "Đã giải quyết",
  rejected: "Đã từ chối",
  closed: "Đã đóng",
};

export function isDisputeStatus(v: unknown): v is DisputeStatus {
  return (
    typeof v === "string" &&
    (DISPUTE_STATUSES as ReadonlyArray<string>).includes(v)
  );
}

/** A dispute is "open / actionable" when it has not yet been
 *  resolved/rejected/closed. Used by the admin queue default filter
 *  and by the user-side "active disputes" view. */
export const ACTIVE_DISPUTE_STATUSES: ReadonlyArray<DisputeStatus> = [
  "open",
  "waiting_for_user",
  "waiting_for_organization",
  "under_review",
];

// -------------------------------------------------------------------
// Resolution options (the 7 options the spec calls out).
// Mirrors dispute_cases_resolution_check.
// -------------------------------------------------------------------
export const DISPUTE_RESOLUTIONS = [
  "keep_content",
  "remove_content",
  "redact_content",
  "restore_content",
  "revoke_badge",
  "suspend_profile",
  "no_action",
] as const;

export type DisputeResolution = (typeof DISPUTE_RESOLUTIONS)[number];

export const DISPUTE_RESOLUTION_LABEL_VI: Record<DisputeResolution, string> = {
  keep_content: "Giữ nguyên nội dung",
  remove_content: "Gỡ nội dung",
  redact_content: "Biên tập / che thông tin",
  restore_content: "Khôi phục nội dung",
  revoke_badge: "Thu hồi huy hiệu",
  suspend_profile: "Tạm khóa hồ sơ",
  no_action: "Không xử lý",
};

export function isDisputeResolution(v: unknown): v is DisputeResolution {
  return (
    typeof v === "string" &&
    (DISPUTE_RESOLUTIONS as ReadonlyArray<string>).includes(v)
  );
}

// -------------------------------------------------------------------
// Evidence storage (private bucket created by 0009).
// -------------------------------------------------------------------
export const DISPUTE_EVIDENCE_BUCKET = "dispute-evidence-private";

export const DISPUTE_EVIDENCE_FILES_MAX_COUNT = 10;
export const DISPUTE_EVIDENCE_FILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const DISPUTE_DESCRIPTION_MAX_LEN = 5000;
export const DISPUTE_SUMMARY_MAX_LEN = 200;

export const DISPUTE_EVIDENCE_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DISPUTE_EVIDENCE_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/** Builds the private storage path the RLS policy in 0009 expects:
 *  `user/<userId>/dispute/<disputeId>/<filename>`. */
export function buildDisputeEvidencePath(args: {
  userId: string;
  disputeId: string;
  filename: string;
}): string {
  return `user/${args.userId}/dispute/${args.disputeId}/${args.filename}`;
}

// -------------------------------------------------------------------
// Row type (matches the public.dispute_cases columns + 0009 additions).
// -------------------------------------------------------------------
export type DisputeCaseRow = {
  id: string;
  opened_by: string;
  target_type: DisputeTargetType;
  target_id: string;
  dispute_type: DisputeType;
  summary: string;
  evidence_file_paths: string[] | null;
  status: DisputeStatus;
  assigned_to: string | null;
  resolution: DisputeResolution | null;
  resolved_by: string | null;
  resolved_at: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
};
