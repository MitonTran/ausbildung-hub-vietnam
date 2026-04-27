/**
 * Organization verification flow constants and helpers.
 *
 * Mirrors the schema's CHECK constraints from migration 0002 exactly so
 * the UI and the DB agree on which values are valid.
 *
 * See:
 *   - /docs/trust-engine.md §6 (Organization types) and §7
 *     (Organization verification levels)
 *   - /docs/database-schema.md §2.2 (organizations) and §2.5
 *     (organization_verifications)
 *   - /docs/audit-log-rules.md §5.3, §5.4
 */

// -------------------------------------------------------------------
// Org types — must match organizations_org_type_check (0002)
// -------------------------------------------------------------------

export const ORG_TYPES = [
  "training_center",
  "consulting_center",
  "employer",
  "recruiter",
  "agency",
  "school",
  "other",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_TYPE_LABEL_VI: Record<OrgType, string> = {
  training_center: "Trung tâm đào tạo",
  consulting_center: "Trung tâm tư vấn",
  employer: "Nhà tuyển dụng",
  recruiter: "Đơn vị tuyển dụng",
  agency: "Đại lý / công ty môi giới",
  school: "Trường học",
  other: "Khác",
};

// -------------------------------------------------------------------
// Verification status — must match organizations_verification_status_check (0002)
// -------------------------------------------------------------------

export const ORG_VERIFICATION_STATUSES = [
  "unverified",
  "pending_review",
  "basic_verified",
  "trusted_partner",
  "recently_updated",
  "expired",
  "rejected",
  "suspended",
  "revoked",
] as const;

export type OrgVerificationStatus = (typeof ORG_VERIFICATION_STATUSES)[number];

export const ORG_VERIFICATION_STATUS_LABEL_VI: Record<
  OrgVerificationStatus,
  string
> = {
  unverified: "Chưa xác minh",
  pending_review: "Đang chờ xét duyệt",
  basic_verified: "Đã xác minh giấy tờ cơ bản",
  trusted_partner: "Đối tác uy tín",
  recently_updated: "Đã cập nhật gần đây",
  expired: "Đã hết hạn xác minh",
  rejected: "Đã bị từ chối",
  suspended: "Đang bị tạm ẩn / xem xét",
  revoked: "Đã thu hồi",
};

/**
 * Public-facing badge label, per /docs/trust-engine.md §7 (Vietnamese
 * required). Some statuses (rejected, revoked) are intentionally
 * never shown publicly — they fall back to "Chưa xác minh".
 */
export const ORG_VERIFICATION_PUBLIC_LABEL_VI: Record<
  OrgVerificationStatus,
  string
> = {
  unverified: "Chưa xác minh",
  pending_review: "Chưa xác minh",
  basic_verified: "Đã xác minh giấy tờ cơ bản",
  trusted_partner: "Đối tác uy tín",
  recently_updated: "Đã cập nhật gần đây",
  expired: "Đã hết hạn xác minh",
  rejected: "Chưa xác minh",
  suspended: "Đang bị tạm ẩn / xem xét",
  revoked: "Chưa xác minh",
};

// -------------------------------------------------------------------
// organization_verifications request status — separate enum from
// organizations.verification_status. Tracks the moderation workflow
// of the request itself.
//   pending          submitted, awaiting admin
//   approved         admin granted requested badge
//   rejected         admin rejected, badge unchanged
//   need_more_info   admin asked for more documents
//   expired          request was approved but the badge has expired
//   revoked          request was approved but the badge was revoked
// -------------------------------------------------------------------

export const ORG_VERIFICATION_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "need_more_info",
  "expired",
  "revoked",
] as const;

export type OrgVerificationRequestStatus =
  (typeof ORG_VERIFICATION_REQUEST_STATUSES)[number];

export const ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI: Record<
  OrgVerificationRequestStatus,
  string
> = {
  pending: "Đang chờ duyệt",
  approved: "Đã được phê duyệt",
  rejected: "Đã bị từ chối",
  need_more_info: "Cần bổ sung",
  expired: "Đã hết hạn",
  revoked: "Đã thu hồi",
};

// -------------------------------------------------------------------
// What an org can request via the dashboard. Per
// /docs/trust-engine.md §7, "trusted_partner" is admin-granted only
// — orgs may request it but it requires manual review. "recently_updated"
// is computed automatically (configured period of profile updates) and
// not directly requestable through this form.
// -------------------------------------------------------------------

export const ORG_VERIFICATION_REQUESTABLE = [
  "basic_verified",
  "trusted_partner",
] as const;

export type OrgVerificationRequestable =
  (typeof ORG_VERIFICATION_REQUESTABLE)[number];

export const ORG_VERIFICATION_REQUESTABLE_LABEL_VI: Record<
  OrgVerificationRequestable,
  string
> = {
  basic_verified: "Xác minh giấy tờ cơ bản",
  trusted_partner: "Trở thành Đối tác uy tín",
};

// -------------------------------------------------------------------
// File upload limits for organization verification documents
// -------------------------------------------------------------------

export const ORG_EVIDENCE_BUCKET = "verification-evidence-private";
export const ORG_EVIDENCE_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const ORG_EVIDENCE_FILES_MAX_COUNT = 5;
export const ORG_EVIDENCE_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export const ORG_EVIDENCE_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
];

/**
 * Storage path for an organization-verification evidence file.
 * Layout matches the storage.objects RLS policies in
 * 0005_organization_verification_storage.sql:
 *   org/<organizationId>/verification/<verificationId>/<filename>
 */
export function buildOrgEvidencePath(args: {
  organizationId: string;
  verificationId: string;
  filename: string;
}): string {
  return `org/${args.organizationId}/verification/${args.verificationId}/${args.filename}`;
}

/**
 * Default verification expiry per badge level. Values mirror
 * /docs/trust-engine.md §7:
 *   - basic documents: re-verify yearly
 *   - trusted partner: 12 months, manual re-review
 * Returns an ISO timestamp string or null for "no auto-expiry".
 */
export function defaultOrgExpiryFor(
  requestedStatus: OrgVerificationRequestable,
  reviewedAt: Date = new Date()
): string | null {
  const months: Record<OrgVerificationRequestable, number> = {
    basic_verified: 12,
    trusted_partner: 12,
  };
  const monthsForward = months[requestedStatus];
  if (!monthsForward) return null;
  const d = new Date(reviewedAt);
  d.setMonth(d.getMonth() + monthsForward);
  return d.toISOString();
}

// -------------------------------------------------------------------
// Row shapes (kept small — only what UI consumers use)
// -------------------------------------------------------------------

export type OrganizationRow = {
  id: string;
  org_type: OrgType;
  legal_name: string | null;
  brand_name: string;
  slug: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  services: string[] | null;
  verification_status: OrgVerificationStatus;
  trust_badge: string | null;
  last_verified_at: string | null;
  verification_expires_at: string | null;
  last_updated_by_org_at: string | null;
  risk_score: number;
  is_published: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
};

export type OrganizationVerificationRow = {
  id: string;
  organization_id: string;
  requested_status: OrgVerificationRequestable;
  submitted_by: string;
  document_file_paths: string[] | null;
  document_summary: string | null;
  fee_disclosure: string | null;
  status: OrgVerificationRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

/** Parses a basename out of a Supabase storage path. */
export function basenameFromPath(path: string): string {
  return path.split("/").pop() ?? path;
}

/**
 * Public-display rules per /docs/trust-engine.md §3.4:
 * payment status (sponsored / featured) MUST NOT be conflated with
 * verified status. Callers that want to render a sponsored chip must
 * use a separate visual element from the verified badge.
 *
 * Returns whether the org has an active verified-tier badge.
 */
export function hasActiveVerifiedBadge(org: Pick<
  OrganizationRow,
  "verification_status" | "verification_expires_at" | "is_suspended"
>): boolean {
  if (org.is_suspended) return false;
  if (
    org.verification_status === "basic_verified" ||
    org.verification_status === "trusted_partner" ||
    org.verification_status === "recently_updated"
  ) {
    if (
      org.verification_expires_at &&
      new Date(org.verification_expires_at).getTime() < Date.now()
    ) {
      return false;
    }
    return true;
  }
  return false;
}
