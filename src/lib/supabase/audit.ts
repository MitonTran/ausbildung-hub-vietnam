import "server-only";

import { headers } from "next/headers";

import { createSupabaseAdminClient } from "./admin";
import type { UserRole } from "./types";

/**
 * Allowed actor_type values per /docs/audit-log-rules.md §3
 * (also enforced by audit_logs_actor_type_check in 0002).
 */
export type AuditActorType =
  | "user"
  | "organization_member"
  | "moderator"
  | "admin"
  | "super_admin"
  | "system"
  | "ai"
  | "edge_function";

/**
 * Allowed target_type values per /docs/audit-log-rules.md §4
 * (also enforced by audit_logs_target_type_check in 0002).
 */
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

export type WriteAuditLogInput = {
  actorId: string | null;
  actorType: AuditActorType;
  action: string;
  targetType: AuditTargetType;
  targetId?: string | null;
  changedFields?: string[];
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
  aiGenerated?: boolean;
  humanApproved?: boolean;
};

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

/**
 * Append-only audit log writer. Always uses the service-role client
 * because:
 *   - audit_logs has no INSERT policy for normal users (per
 *     /docs/rls-policy.md §12), and
 *   - 0002 installed BEFORE UPDATE / BEFORE DELETE triggers that raise
 *     on any non-INSERT mutation.
 *
 * Captures request IP / User-Agent from Next.js headers when called
 * from a Server Action / Route Handler.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
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
    // headers() throws when called outside a request scope (e.g. from a
    // background job). Log without the request context.
  }

  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    actor_type: input.actorType,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    changed_fields: input.changedFields ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    reason: input.reason ?? null,
    ai_generated: input.aiGenerated ?? false,
    human_approved: input.humanApproved ?? false,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    // Audit-log failures should not silently disappear, but they also
    // should not roll back the calling action — surface to server logs.
    console.error("[audit_logs] insert failed", error);
  }
}
