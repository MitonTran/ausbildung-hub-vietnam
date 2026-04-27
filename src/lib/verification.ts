/**
 * User verification flow constants and helpers.
 *
 * Mirrors the schema's CHECK constraints exactly so the UI and the DB
 * agree on which values are valid.
 *
 * See:
 *   - /docs/user-verification-flow.md  (stages, evidence types, expiry)
 *   - /docs/database-schema.md §2.4    (user_verifications table)
 */

export const USER_STAGES = [
  "exploring",
  "studying_german",
  "studying_at_center",
  "completed_center_course",
  "interviewed",
  "contract_signed",
  "visa_process",
  "in_germany",
  "doing_ausbildung",
  "alumni",
] as const;

export type UserStage = (typeof USER_STAGES)[number];

export const USER_STAGE_LABEL_VI: Record<UserStage, string> = {
  exploring: "Đang tìm hiểu",
  studying_german: "Đang học tiếng Đức",
  studying_at_center: "Đang học tại trung tâm",
  completed_center_course: "Đã hoàn thành khóa học tại trung tâm",
  interviewed: "Đã phỏng vấn",
  contract_signed: "Đã ký hợp đồng",
  visa_process: "Đang làm hồ sơ visa",
  in_germany: "Đã sang Đức",
  doing_ausbildung: "Đang học nghề tại Đức",
  alumni: "Đã hoàn thành Ausbildung",
};

/** Allow-list mirroring user_verifications_verification_type_check. */
export const VERIFICATION_TYPES = [
  "invoice",
  "course_schedule",
  "student_id",
  "email_confirmation",
  "interview_invitation",
  "offer_letter",
  "ausbildung_contract",
  "visa_appointment",
  "residence_proof",
  "employer_school_email",
  "manual_confirmation",
  "other",
] as const;

export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const VERIFICATION_TYPE_LABEL_VI: Record<VerificationType, string> = {
  invoice: "Hóa đơn / biên lai",
  course_schedule: "Lịch học / lịch lớp",
  student_id: "Thẻ học viên",
  email_confirmation: "Xác nhận qua email",
  interview_invitation: "Thư mời phỏng vấn",
  offer_letter: "Thư mời nhận việc",
  ausbildung_contract: "Hợp đồng Ausbildung",
  visa_appointment: "Lịch hẹn visa",
  residence_proof: "Giấy tờ cư trú",
  employer_school_email: "Email từ công ty / trường",
  manual_confirmation: "Xác nhận thủ công",
  other: "Tài liệu khác",
};

/** Allow-list mirroring user_verifications_status_check. */
export const VERIFICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "need_more_info",
  "expired",
  "revoked",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_STATUS_LABEL_VI: Record<VerificationStatus, string> = {
  pending: "Đang chờ duyệt",
  approved: "Đã được xác minh",
  rejected: "Bị từ chối",
  need_more_info: "Cần bổ sung",
  expired: "Đã hết hạn",
  revoked: "Đã thu hồi",
};

/** Returned by /admin/verifications row queries. */
export type UserVerificationRow = {
  id: string;
  user_id: string;
  requested_stage: UserStage;
  verification_type: VerificationType;
  evidence_summary: string | null;
  evidence_file_paths: string[] | null;
  status: VerificationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

// -------------------------------------------------------------------
// File upload limits — kept in sync with /docs/user-verification-flow.md §3.3
// -------------------------------------------------------------------

export const VERIFICATION_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const VERIFICATION_FILES_MAX_COUNT = 3;
export const VERIFICATION_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export const VERIFICATION_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

export const VERIFICATION_BUCKET = "verification-evidence-private";

/**
 * Storage path for an evidence file. Layout matches the storage.objects
 * RLS policies in 0004_user_verification_storage.sql:
 *   user/<userId>/verification/<verificationId>/<filename>
 */
export function buildEvidencePath(args: {
  userId: string;
  verificationId: string;
  filename: string;
}): string {
  return `user/${args.userId}/verification/${args.verificationId}/${args.filename}`;
}

/**
 * Default verification expiry per stage, per /docs/user-verification-flow.md §9.
 * Returns an ISO timestamp string or null for "no expiry".
 */
export function defaultExpiryFor(
  stage: UserStage,
  reviewedAt: Date = new Date()
): string | null {
  const months: Partial<Record<UserStage, number>> = {
    studying_at_center: 12,
    interviewed: 12,
    contract_signed: 24,
    visa_process: 12,
    in_germany: 12,
    doing_ausbildung: 12,
    // exploring / studying_german / completed_center_course / alumni:
    // no auto-expiry by default; admins can still revoke.
  };
  const monthsForward = months[stage];
  if (!monthsForward) return null;
  const d = new Date(reviewedAt);
  d.setMonth(d.getMonth() + monthsForward);
  return d.toISOString();
}

/** Parses a basename out of a Supabase storage path. */
export function basenameFromPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}
