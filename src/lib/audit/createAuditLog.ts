import "server-only";

import { headers } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Canonical audit-logging utility for Ausbildung Hub Vietnam.
 *
 * This module is the single entry point for writing rows into
 * `public.audit_logs`. Implements the rules in:
 *   - /docs/audit-log-rules.md
 *   - /docs/database-schema.md §2.10
 *   - /docs/rls-policy.md §12
 *
 * Hardening properties:
 *   - Always uses the service-role client. There is NO insert policy
 *     for normal users (RLS §12), and 0002_trust_engine_schema.sql
 *     installs BEFORE UPDATE / BEFORE DELETE triggers that raise on
 *     any non-INSERT mutation, so audit rows are append-only even
 *     for the service role.
 *   - Captures request IP / User-Agent automatically when called
 *     from inside a Server Action / Route Handler.
 *   - Caps free-form string fields and sanitises before/after data
 *     so that private documents (visa scans, contracts, residence
 *     proofs, invoices, evidence images) never get duplicated into
 *     the audit log payload (rules §6).
 *
 * Older code may still import `writeAuditLog` from
 * `@/lib/supabase/audit`; that module re-exports `createAuditLog`
 * under that name so existing call sites keep working unchanged.
 */

// -------------------------------------------------------------------
// Allowed actor / target types (kept in sync with the CHECK
// constraints `audit_logs_actor_type_check` and
// `audit_logs_target_type_check` in 0002_trust_engine_schema.sql).
// -------------------------------------------------------------------

export type AuditActorType =
  | "user"
  | "organization_member"
  | "moderator"
  | "admin"
  | "super_admin"
  | "system"
  | "ai"
  | "edge_function";

export type AuditTargetType =
  | "profile"
  | "user_verification"
  | "organization"
  | "organization_verification"
  | "organization_member"
  | "job_order"
  | "review"
  | "review_proof"
  | "report_flag"
  | "dispute_case"
  | "article"
  | "community_post"
  | "comment"
  | "application_lead"
  | "storage_file"
  | "badge"
  | "system_setting";

// -------------------------------------------------------------------
// Action constants for the sensitive actions called out in the
// hardening task. Using these constants instead of string literals at
// the call site catches typos at compile time. Other action names
// (e.g. report_triaged, dispute_assigned, review_under_dispute) are
// still allowed — `action` is typed as `AuditAction | (string & {})`.
// -------------------------------------------------------------------

export const AUDIT_ACTIONS = {
  USER_VERIFICATION_APPROVED: "user_verification_approved",
  USER_VERIFICATION_REJECTED: "user_verification_rejected",
  USER_VERIFICATION_EXPIRED: "user_verification_expired",

  ORGANIZATION_BADGE_GRANTED: "organization_badge_granted",
  ORGANIZATION_BADGE_REVOKED: "organization_badge_revoked",
  ORGANIZATION_SUSPENDED: "organization_suspended",

  REVIEW_APPROVED: "review_published",
  REVIEW_REJECTED: "review_rejected",
  REVIEW_REDACTED: "review_redacted",

  REPORT_RESOLVED_NO_ACTION: "report_resolved_no_action",
  REPORT_RESOLVED_CONTENT_CHANGED: "report_resolved_content_changed",

  DISPUTE_OPENED: "dispute_opened",
  DISPUTE_RESOLVED: "dispute_resolved",

  JOB_ORDER_APPROVED: "job_order_published",
  JOB_ORDER_EXPIRED: "job_order_expired",
  JOB_ORDER_SUSPENDED: "job_order_suspended",

  AI_SUGGESTION_APPLIED: "ai_suggestion_accepted",

  // Sponsored / editorial labeling (see
  // /docs/admin-moderation-flow.md §9 and /docs/audit-log-rules.md §5.9).
  // Every change to content_type / sponsorship / featured-listing
  // status on an article, organization, or job order MUST write one
  // of these actions so we can prove the platform decision trail.
  SPONSORED_CONTENT_SUBMITTED: "sponsored_content_submitted",
  SPONSORED_CONTENT_APPROVED: "sponsored_content_approved",
  SPONSORED_CONTENT_REJECTED: "sponsored_content_rejected",
  SPONSORED_CONTENT_LABEL_UPDATED: "sponsored_content_label_updated",
} as const;

export type AuditAction =
  (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// -------------------------------------------------------------------
// Sanitisation helpers
// -------------------------------------------------------------------

/**
 * Field names that almost certainly carry private document content
 * and must NEVER be persisted verbatim into audit_logs.before_data /
 * after_data. Per /docs/audit-log-rules.md §6 we replace such values
 * with a `[redacted: <reason>]` placeholder.
 */
const SENSITIVE_KEY_PATTERNS: ReadonlyArray<RegExp> = [
  // verification / dispute / review evidence buckets and direct file
  // URLs — keep the path reference but strip blob / data URLs.
  /^(evidence|document|documents|files?|attachment|attachments|proof)_?(content|body|blob|base64|data)$/i,
  /^(visa|contract|residence|invoice|passport|id_card|student_id)(_.*)?$/i,
  /^(ssn|tax_id|national_id|bank_account|iban|swift|cvv|otp|password|secret|api_key|access_token|refresh_token)$/i,
  /^email_verification_token$/i,
];

const PATH_LIST_KEY_PATTERNS: ReadonlyArray<RegExp> = [
  /^evidence_file_paths$/i,
  /^document_file_paths$/i,
  /^proof_file_paths$/i,
  /^attachment_file_paths$/i,
];

const MAX_STRING_LEN = 4_000;
const MAX_REASON_LEN = 1_000;
const MAX_PATH_LIST = 25;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function summarizePathList(paths: unknown): unknown {
  if (!Array.isArray(paths)) return paths;
  const truncated = paths.slice(0, MAX_PATH_LIST).map((p) =>
    typeof p === "string" ? p.slice(0, 500) : p
  );
  return paths.length > MAX_PATH_LIST
    ? { count: paths.length, paths_sample: truncated }
    : truncated;
}

/**
 * Recursively walks a JSON-serialisable value and:
 *   - replaces sensitive keys with a redaction marker,
 *   - truncates excessively long strings,
 *   - summarises long file-path arrays,
 *   - drops base64 / data: URLs.
 *
 * Returns a NEW value — does not mutate the input.
 */
export function sanitizeAuditPayload(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "string") {
    // Drop inline document content masquerading as a string.
    if (
      value.startsWith("data:") ||
      // base64-y blob — > 200 chars of [A-Za-z0-9+/=] only.
      (value.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(value))
    ) {
      return `[redacted: inline-blob length=${value.length}]`;
    }
    return value.length > MAX_STRING_LEN
      ? `${value.slice(0, MAX_STRING_LEN)}…[truncated ${value.length - MAX_STRING_LEN}]`
      : value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeAuditPayload(v));
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERNS.some((re) => re.test(key))) {
        out[key] = `[redacted: sensitive-field ${key}]`;
        continue;
      }
      if (PATH_LIST_KEY_PATTERNS.some((re) => re.test(key))) {
        out[key] = summarizePathList(raw);
        continue;
      }
      out[key] = sanitizeAuditPayload(raw);
    }
    return out;
  }

  // numbers, booleans, etc. pass through.
  return value;
}

/**
 * Strict file-list summary helper for explicit use at call sites that
 * touch verification / review / dispute evidence. Stores only the path
 * shape and count, never the file body.
 */
export function summarizeEvidenceFiles(
  paths: ReadonlyArray<string> | null | undefined,
  evidenceType?: string,
): { count: number; evidence_type?: string; paths_sample: string[] } {
  const list = paths ?? [];
  return {
    count: list.length,
    ...(evidenceType ? { evidence_type: evidenceType } : {}),
    paths_sample: list.slice(0, 5).map((p) => p.slice(0, 500)),
  };
}

// -------------------------------------------------------------------
// Actor mapping
// -------------------------------------------------------------------

/**
 * Maps a profile.role onto the audit_logs.actor_type allow-list.
 * Falls back to 'user' for student / center_admin / employer_admin —
 * audit log readers can still join on actor_id to recover the role if
 * they need to.
 */
export function actorTypeForRole(role: UserRole | null): AuditActorType {
  switch (role) {
    case "moderator":
      return "moderator";
    case "admin":
      return "admin";
    case "super_admin":
      return "super_admin";
    case "center_admin":
    case "employer_admin":
      return "organization_member";
    case "student":
    default:
      return "user";
  }
}

// -------------------------------------------------------------------
// Public input shape
// -------------------------------------------------------------------

export type CreateAuditLogInput = {
  actorId: string | null;
  actorType: AuditActorType;
  /** Use AUDIT_ACTIONS constants when possible. */
  action: AuditAction | (string & {});
  targetType: AuditTargetType;
  targetId?: string | null;
  changedFields?: string[];
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
  aiGenerated?: boolean;
  humanApproved?: boolean;
};

// -------------------------------------------------------------------
// Core writer
// -------------------------------------------------------------------

/**
 * Append-only audit log writer.
 *
 * Sanitises before/after payloads (no full evidence files), captures
 * request IP / User-Agent when called from a request scope, and
 * inserts via the service-role client (the only role allowed to write
 * audit_logs).
 *
 * Audit-log failures are intentionally NOT thrown — they are logged
 * to the server console so that the calling business action does not
 * roll back. Operators are expected to alert on `[audit_logs] insert
 * failed` log lines.
 */
export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<void> {
  const supabase = createSupabaseAdminClient();

  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    userAgent = h.get("user-agent");
  } catch {
    // headers() throws when called outside a request scope (e.g. from
    // a background job / cron). Log without the request context.
  }

  const reason =
    input.reason == null
      ? null
      : input.reason.length > MAX_REASON_LEN
        ? input.reason.slice(0, MAX_REASON_LEN)
        : input.reason;

  const before =
    input.beforeData == null
      ? null
      : (sanitizeAuditPayload(input.beforeData) as Record<string, unknown>);
  const after =
    input.afterData == null
      ? null
      : (sanitizeAuditPayload(input.afterData) as Record<string, unknown>);

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    actor_type: input.actorType,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    changed_fields: input.changedFields ?? null,
    before_data: before,
    after_data: after,
    reason,
    ai_generated: input.aiGenerated ?? false,
    human_approved: input.humanApproved ?? false,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    console.error("[audit_logs] insert failed", error);
  }
}

// -------------------------------------------------------------------
// AI-suggested edit applied helper
// -------------------------------------------------------------------

export type AiSuggestionAuditInput = {
  /** The admin / moderator who approved the AI-generated change. */
  approverId: string;
  approverRole: UserRole;
  targetType: AuditTargetType;
  targetId: string;
  /** Short summary of the original content (NOT full document body). */
  beforeSummary: string;
  /** Short summary of the AI-suggested / final content. */
  afterSummary: string;
  /** Optional list of changed fields. */
  changedFields?: string[];
  /** Optional reviewer note. */
  reason?: string | null;
  /** If true, log the AI suggestion as accepted (default true). */
  accepted?: boolean;
};

/**
 * Records an AI-generated edit that a human approved.
 *
 * Writes one log row with `ai_generated=true` and
 * `human_approved=true` (unless `accepted=false`, in which case it
 * records `ai_suggestion_rejected`). Only short content summaries are
 * stored — full article / review bodies must not be duplicated into
 * the audit log per /docs/audit-log-rules.md §13.
 */
export async function createAiSuggestionAuditLog(
  input: AiSuggestionAuditInput,
): Promise<void> {
  const accepted = input.accepted ?? true;
  await createAuditLog({
    actorId: input.approverId,
    actorType: actorTypeForRole(input.approverRole),
    action: accepted ? "ai_suggestion_accepted" : "ai_suggestion_rejected",
    targetType: input.targetType,
    targetId: input.targetId,
    changedFields: input.changedFields,
    beforeData: { content_summary: input.beforeSummary.slice(0, 500) },
    afterData: { content_summary: input.afterSummary.slice(0, 500) },
    reason: input.reason ?? null,
    aiGenerated: true,
    humanApproved: accepted,
  });
}

// -------------------------------------------------------------------
// Re-exports for clarity at call sites that prefer the new naming.
// -------------------------------------------------------------------

export { createAuditLog as writeAuditLog };
export type { CreateAuditLogInput as WriteAuditLogInput };
