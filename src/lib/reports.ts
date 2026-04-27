/**
 * Report Flag system constants and helpers.
 *
 * Mirrors the schema's CHECK constraints (see
 * 0002_trust_engine_schema.sql + 0007_report_flags_extensions.sql) so
 * the form, server actions, and admin queue agree on the allowed
 * values.
 *
 * See:
 *   - /docs/admin-moderation-flow.md §7  (report flow, severity, actions)
 *   - /docs/audit-log-rules.md §5.6      (audit events for reports)
 *   - /docs/database-schema.md §2.8      (report_flags table)
 */

// -------------------------------------------------------------------
// Reportable target types (public-facing reportable surface)
// -------------------------------------------------------------------
export const REPORT_TARGET_TYPES = [
  "organization",
  "job_order",
  "review",
  "community_post",
  "comment",
  "article",
  "user",
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_TARGET_TYPE_LABEL_VI: Record<ReportTargetType, string> = {
  organization: "Tổ chức",
  job_order: "Đơn tuyển",
  review: "Đánh giá",
  community_post: "Bài cộng đồng",
  comment: "Bình luận",
  article: "Bài viết",
  user: "Người dùng",
};

export function isReportTargetType(v: unknown): v is ReportTargetType {
  return (
    typeof v === "string" &&
    (REPORT_TARGET_TYPES as ReadonlyArray<string>).includes(v)
  );
}

// -------------------------------------------------------------------
// Report reasons (the user-facing form exposes only this list).
// The DB CHECK accepts a superset (legacy reasons too), but the UI
// and submission validator are restricted to the product spec.
// -------------------------------------------------------------------
export const REPORT_REASONS = [
  "false_information",
  "scam_or_fraud",
  "unclear_fees",
  "fake_job_order",
  "impersonation",
  "expired_job_order",
  "privacy_violation",
  "harassment",
  "spam",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABEL_VI: Record<ReportReason, string> = {
  false_information: "Thông tin sai sự thật",
  scam_or_fraud: "Lừa đảo / gian lận",
  unclear_fees: "Phí dịch vụ không rõ ràng",
  fake_job_order: "Đơn tuyển giả mạo",
  impersonation: "Mạo danh tổ chức / cá nhân",
  expired_job_order: "Đơn tuyển đã hết hạn",
  privacy_violation: "Vi phạm quyền riêng tư",
  harassment: "Quấy rối / đe dọa",
  spam: "Spam / nội dung trùng lặp",
  other: "Khác",
};

export function isReportReason(v: unknown): v is ReportReason {
  return (
    typeof v === "string" &&
    (REPORT_REASONS as ReadonlyArray<string>).includes(v)
  );
}

// -------------------------------------------------------------------
// Severity (admin-facing only — never exposed to the reporter).
// Mapped from reason per /docs/admin-moderation-flow.md §7 triage.
// Admins can override severity via the admin queue.
// -------------------------------------------------------------------
export const REPORT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

export const REPORT_SEVERITY_LABEL_VI: Record<ReportSeverity, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
};

export function defaultSeverityForReason(reason: ReportReason): ReportSeverity {
  switch (reason) {
    case "scam_or_fraud":
    case "impersonation":
    case "privacy_violation":
    case "harassment":
      return "high";
    case "fake_job_order":
    case "false_information":
    case "unclear_fees":
      return "medium";
    case "expired_job_order":
    case "spam":
      return "low";
    case "other":
    default:
      return "medium";
  }
}

// -------------------------------------------------------------------
// Status (workflow state of a report).
// Mirrors report_flags_status_check.
// -------------------------------------------------------------------
export const REPORT_STATUSES = [
  "open",
  "triaged",
  "under_review",
  "resolved",
  "rejected",
  "escalated_to_dispute",
  "closed",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABEL_VI: Record<ReportStatus, string> = {
  open: "Mới",
  triaged: "Đã phân loại",
  under_review: "Đang xử lý",
  resolved: "Đã xử lý",
  rejected: "Bỏ qua",
  escalated_to_dispute: "Đã chuyển khiếu nại",
  closed: "Đã đóng",
};

export function isReportStatus(v: unknown): v is ReportStatus {
  return (
    typeof v === "string" &&
    (REPORT_STATUSES as ReadonlyArray<string>).includes(v)
  );
}

// -------------------------------------------------------------------
// Outcomes (admin-facing label for how a report was resolved).
// -------------------------------------------------------------------
export const REPORT_OUTCOMES = [
  "no_action",
  "content_hidden",
  "target_suspended",
  "escalated_to_dispute",
] as const;

export type ReportOutcome = (typeof REPORT_OUTCOMES)[number];

export const REPORT_OUTCOME_LABEL_VI: Record<ReportOutcome, string> = {
  no_action: "Không vi phạm",
  content_hidden: "Đã ẩn nội dung",
  target_suspended: "Đã tạm khóa đối tượng",
  escalated_to_dispute: "Đã chuyển khiếu nại",
};

// -------------------------------------------------------------------
// Risk indicator (admin-only). Computed from the count of distinct
// reports on the same target_type/target_id pair. Never exposed to
// public users — see /docs/admin-moderation-flow.md §13 + product
// requirements.
// -------------------------------------------------------------------
export type RiskIndicator = "none" | "low" | "medium" | "high";

export function riskIndicatorFromReportCount(count: number): RiskIndicator {
  if (count <= 0) return "none";
  if (count === 1) return "low";
  if (count <= 3) return "medium";
  return "high";
}

export const RISK_INDICATOR_LABEL_VI: Record<RiskIndicator, string> = {
  none: "Không",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

// -------------------------------------------------------------------
// Database row shape (kept in sync with /docs/database-schema.md §2.8).
// -------------------------------------------------------------------
export type ReportFlagRow = {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  evidence_file_paths: string[] | null;
  severity: string;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  outcome: string | null;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
};

// -------------------------------------------------------------------
// Submission limits.
// -------------------------------------------------------------------
export const REPORT_DESCRIPTION_MAX_LEN = 2000;
export const REPORT_EVIDENCE_URL_MAX_LEN = 500;
export const REPORT_EVIDENCE_MAX_COUNT = 5;
