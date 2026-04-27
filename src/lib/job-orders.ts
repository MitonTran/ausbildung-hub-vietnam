/**
 * Job order constants, types, and helpers.
 *
 * Mirrors migration 0002's CHECK constraints and the canonical state
 * machine in /docs/database-schema.md §2.6 + /docs/admin-moderation-flow.md §7.
 */

export const JOB_ORDER_STATUSES = [
  "draft",
  "pending_verification",
  "published",
  "closing_soon",
  "expired",
  "filled",
  "under_review",
  "suspended",
  "rejected",
] as const;

export type JobOrderStatus = (typeof JOB_ORDER_STATUSES)[number];

export const JOB_ORDER_STATUS_LABEL_VI: Record<JobOrderStatus, string> = {
  draft: "Bản nháp",
  pending_verification: "Đang chờ xét duyệt",
  published: "Đã đăng",
  closing_soon: "Sắp hết hạn",
  expired: "Đã hết hạn",
  filled: "Đã tuyển đủ",
  under_review: "Đang điều tra",
  suspended: "Tạm ẩn",
  rejected: "Bị từ chối",
};

/**
 * Statuses that count as a public, applicant-facing listing.
 *
 * `closing_soon` stays on the active list with a warning chip, but
 * `expired`, `filled`, `suspended`, `rejected`, `pending_verification`,
 * `draft`, `under_review` are NOT shown as active.
 */
export const ACTIVE_JOB_ORDER_STATUSES: ReadonlyArray<JobOrderStatus> = [
  "published",
  "closing_soon",
];

// -------------------------------------------------------------------
// verification_status — mirrors job_orders_verification_status_check
// -------------------------------------------------------------------

export const JOB_ORDER_VERIFICATION_STATUSES = [
  "unverified",
  "pending_verification",
  "basic_verified",
  "trusted_partner",
  "recently_updated",
  "expired",
  "rejected",
  "suspended",
  "revoked",
] as const;

export type JobOrderVerificationStatus =
  (typeof JOB_ORDER_VERIFICATION_STATUSES)[number];

export const JOB_ORDER_VERIFICATION_STATUS_LABEL_VI: Record<
  JobOrderVerificationStatus,
  string
> = {
  unverified: "Chưa xác minh",
  pending_verification: "Đang chờ xét duyệt",
  basic_verified: "Đã xác minh giấy tờ cơ bản",
  trusted_partner: "Đối tác uy tín",
  recently_updated: "Đã cập nhật gần đây",
  expired: "Đã hết hạn xác minh",
  rejected: "Đã bị từ chối",
  suspended: "Đang bị tạm ẩn",
  revoked: "Đã thu hồi",
};

// -------------------------------------------------------------------
// training_type — mirrors job_orders_training_type_check
// -------------------------------------------------------------------

export const TRAINING_TYPES = ["dual", "school_based", "other"] as const;
export type TrainingType = (typeof TRAINING_TYPES)[number];

export const TRAINING_TYPE_LABEL_VI: Record<TrainingType, string> = {
  dual: "Đào tạo kép (Dual Ausbildung)",
  school_based: "Đào tạo tại trường",
  other: "Khác",
};

// -------------------------------------------------------------------
// German level (CEFR). Free-form text in DB; constrain in UI.
// -------------------------------------------------------------------

export const GERMAN_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type GermanLevel = (typeof GERMAN_LEVELS)[number];

// -------------------------------------------------------------------
// Education — free-form text in DB; constrain in UI.
// -------------------------------------------------------------------

export const EDUCATION_LEVELS = [
  "thpt",
  "trung_cap",
  "cao_dang",
  "dai_hoc",
  "khac",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LEVEL_LABEL_VI: Record<EducationLevel, string> = {
  thpt: "Tốt nghiệp THPT",
  trung_cap: "Trung cấp",
  cao_dang: "Cao đẳng",
  dai_hoc: "Đại học",
  khac: "Khác",
};

// -------------------------------------------------------------------
// Occupations — short curated list. Free-form in DB; UI uses these
// for the create form, but other values still validate.
// -------------------------------------------------------------------

export const OCCUPATIONS_VI: Array<{ value: string; label: string }> = [
  { value: "altenpfleger", label: "Điều dưỡng người cao tuổi (Altenpfleger)" },
  {
    value: "krankenpfleger",
    label: "Điều dưỡng bệnh viện (Gesundheits- und Krankenpfleger)",
  },
  { value: "mechatroniker", label: "Cơ điện tử (Mechatroniker)" },
  { value: "elektroniker", label: "Kỹ thuật điện (Elektroniker)" },
  {
    value: "industriemechaniker",
    label: "Cơ khí công nghiệp (Industriemechaniker)",
  },
  { value: "koch", label: "Đầu bếp (Koch / Köchin)" },
  { value: "hotelfachmann", label: "Nhà hàng - khách sạn (Hotelfachmann)" },
  { value: "fachinformatiker", label: "Công nghệ thông tin (Fachinformatiker)" },
  { value: "kaufmann", label: "Kinh doanh - thương mại (Kaufmann)" },
  { value: "logistik", label: "Logistic (Fachkraft für Lagerlogistik)" },
  { value: "other", label: "Khác" },
];

// -------------------------------------------------------------------
// Row shape returned by job-order queries the UI uses. Kept narrow.
// -------------------------------------------------------------------

export type JobOrderRow = {
  id: string;
  organization_id: string;
  created_by: string;
  slug: string | null;
  title: string;
  occupation: string;
  germany_city: string | null;
  germany_state: string | null;
  training_type: TrainingType;
  german_level_required: string | null;
  education_required: string | null;
  start_date: string | null;
  interview_date: string | null;
  monthly_training_allowance: number | null;
  accommodation_support: string | null;
  fee_disclosure: string | null;
  application_deadline: string | null;
  expires_at: string | null;
  verification_status: JobOrderVerificationStatus;
  status: JobOrderStatus;
  last_verified_at: string | null;
  last_updated_by_org_at: string | null;
  is_sponsored: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

export function isActiveJobOrder(jo: Pick<JobOrderRow, "status">): boolean {
  return (
    ACTIVE_JOB_ORDER_STATUSES as ReadonlyArray<string>
  ).includes(jo.status);
}

export function isJobOrderExpired(
  jo: Pick<JobOrderRow, "status" | "expires_at">
): boolean {
  if (jo.status === "expired") return true;
  if (!jo.expires_at) return false;
  return new Date(jo.expires_at).getTime() < Date.now();
}

/**
 * Days until expiry (negative if past, null if no expires_at).
 */
export function jobOrderDaysUntilExpiry(
  jo: Pick<JobOrderRow, "expires_at">
): number | null {
  if (!jo.expires_at) return null;
  const ms = new Date(jo.expires_at).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// -------------------------------------------------------------------
// Report-flag constants (mirrors report_flags_reason_check, 0002)
// -------------------------------------------------------------------

export const REPORT_REASONS = [
  "false_information",
  "expired",
  "suspicious_fees",
  "duplicate",
  "spam",
  "scam",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABEL_VI: Record<ReportReason, string> = {
  false_information: "Thông tin sai sự thật",
  expired: "Đơn đã hết hạn nhưng vẫn hiển thị",
  suspicious_fees: "Phí dịch vụ đáng ngờ",
  duplicate: "Đăng trùng lặp",
  spam: "Spam",
  scam: "Có dấu hiệu lừa đảo",
  other: "Khác",
};

// -------------------------------------------------------------------
// Server-action state shapes (used by both the action implementation
// and its client form). Kept here so the action module — which is
// "use server" — only exports async functions.
// -------------------------------------------------------------------

export type JobOrderFormState = {
  error: string | null;
  message: string | null;
  jobOrderId: string | null;
  slug: string | null;
};

export type ReportFlagState = {
  error: string | null;
  message: string | null;
};

/**
 * Slug helper — turns a free-form title into a URL-friendly slug.
 * The action ensures uniqueness by appending a random suffix.
 */
export function slugifyJobTitle(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return ascii || "job";
}
