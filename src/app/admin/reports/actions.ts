"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import {
  REPORT_SEVERITIES,
  type ReportFlagRow,
  type ReportSeverity,
} from "@/lib/reports";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isAdminRole(profile.role)) throw new Error("forbidden");
  return profile;
}

async function loadReport(id: string): Promise<ReportFlagRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("report_flags")
    .select(
      "id,reporter_id,target_type,target_id,reason,description,evidence_file_paths,severity,status,handled_by,handled_at,outcome,internal_note,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as ReportFlagRow | null) ?? null;
}

function revalidateAdminViews(reportId: string) {
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/reports/${reportId}`);
}

/**
 * Move a report to `under_review` and assign it to the acting admin.
 * Per /docs/admin-moderation-flow.md §7 + /docs/audit-log-rules.md §5.6:
 * writes a `report_triaged` audit event.
 */
export async function markReviewingAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("report_id") ?? "");
  const severityRaw = String(formData.get("severity") ?? "");
  const internalNote = String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const report = await loadReport(id);
  if (!report) return;
  if (report.status === "closed" || report.status === "resolved") return;

  const newSeverity: ReportSeverity =
    (REPORT_SEVERITIES as ReadonlyArray<string>).includes(severityRaw)
      ? (severityRaw as ReportSeverity)
      : (report.severity as ReportSeverity);

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("report_flags")
    .update({
      status: "under_review",
      severity: newSeverity,
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
      internal_note: internalNote,
    })
    .eq("id", id)
    .eq("status", report.status)
    .select("id");
  if (error) {
    console.error("[markReviewing]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "report_triaged",
    targetType: "report_flag",
    targetId: id,
    changedFields: ["status", "severity", "handled_by"],
    beforeData: {
      status: report.status,
      severity: report.severity,
      handled_by: report.handled_by,
    },
    afterData: {
      status: "under_review",
      severity: newSeverity,
      handled_by: admin.id,
    },
    reason: internalNote,
  });

  revalidateAdminViews(id);
}

/**
 * Resolve the report with outcome `no_action`. Marks status `resolved`.
 * Audit: `report_resolved_no_action`.
 */
export async function resolveNoActionAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("report_id") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const report = await loadReport(id);
  if (!report) return;
  if (report.status === "resolved" || report.status === "closed") return;

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("report_flags")
    .update({
      status: "resolved",
      outcome: "no_action",
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
      internal_note: internalNote,
    })
    .eq("id", id)
    .eq("status", report.status)
    .select("id");
  if (error) {
    console.error("[resolveNoAction]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "report_resolved_no_action",
    targetType: "report_flag",
    targetId: id,
    changedFields: ["status", "outcome", "handled_by"],
    beforeData: { status: report.status, outcome: report.outcome },
    afterData: {
      status: "resolved",
      outcome: "no_action",
      handled_by: admin.id,
    },
    reason: internalNote,
  });

  revalidateAdminViews(id);
}

type HideHandler = {
  table: string;
  setUnpublished: Record<string, unknown>;
  beforeFields: string[];
  auditAction: string;
  auditTargetType:
    | "review"
    | "community_post"
    | "comment"
    | "article"
    | "job_order";
};

const HIDE_HANDLERS: Partial<Record<string, HideHandler>> = {
  review: {
    table: "reviews",
    setUnpublished: { moderation_status: "hidden" },
    beforeFields: ["moderation_status"],
    auditAction: "review_hidden",
    auditTargetType: "review",
  },
  community_post: {
    table: "community_posts",
    setUnpublished: { moderation_status: "hidden", status: "hidden" },
    beforeFields: ["moderation_status", "status"],
    auditAction: "community_post_hidden",
    auditTargetType: "community_post",
  },
  comment: {
    table: "comments",
    setUnpublished: { moderation_status: "hidden", status: "hidden" },
    beforeFields: ["moderation_status", "status"],
    auditAction: "comment_hidden",
    auditTargetType: "comment",
  },
  article: {
    table: "articles",
    setUnpublished: { status: "draft" },
    beforeFields: ["status"],
    auditAction: "article_unpublished",
    auditTargetType: "article",
  },
  job_order: {
    table: "job_orders",
    setUnpublished: { status: "suspended" },
    beforeFields: ["status"],
    auditAction: "job_order_suspended",
    auditTargetType: "job_order",
  },
};

/**
 * Hide the reported target (where supported) and resolve the report
 * with outcome `content_hidden`. Writes:
 *   - the target's hide audit event (e.g. `review_hidden`)
 *   - `report_resolved_content_changed` on the report itself
 *
 * Targets without a "hide" path (organization, user) should be
 * suspended via `suspendTargetAction` instead.
 */
export async function hideTargetAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("report_id") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const report = await loadReport(id);
  if (!report) return;
  if (report.status === "resolved" || report.status === "closed") return;

  const handler = HIDE_HANDLERS[report.target_type];
  if (!handler) return; // unsupported target_type for hide

  const supabase = createSupabaseAdminClient();

  // Read the target's previous state for the audit log.
  const { data: targetBefore } = await supabase
    .from(handler.table)
    .select(handler.beforeFields.join(","))
    .eq("id", report.target_id)
    .maybeSingle();

  const { error: targetUpdateErr } = await supabase
    .from(handler.table)
    .update(handler.setUnpublished)
    .eq("id", report.target_id);
  if (targetUpdateErr) {
    console.error("[hideTarget:target]", targetUpdateErr);
    return;
  }

  const { data: rows, error } = await supabase
    .from("report_flags")
    .update({
      status: "resolved",
      outcome: "content_hidden",
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
      internal_note: internalNote,
    })
    .eq("id", id)
    .eq("status", report.status)
    .select("id");
  if (error) {
    console.error("[hideTarget:report]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: handler.auditAction,
    targetType: handler.auditTargetType,
    targetId: report.target_id,
    changedFields: handler.beforeFields,
    beforeData: (targetBefore as Record<string, unknown> | null) ?? null,
    afterData: handler.setUnpublished,
    reason: internalNote,
  });

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "report_resolved_content_changed",
    targetType: "report_flag",
    targetId: id,
    changedFields: ["status", "outcome"],
    beforeData: { status: report.status, outcome: report.outcome },
    afterData: { status: "resolved", outcome: "content_hidden" },
    reason: internalNote,
  });

  revalidateAdminViews(id);
}

type SuspendHandler = {
  table: string;
  setSuspended: Record<string, unknown>;
  beforeFields: string[];
  auditAction: string;
  auditTargetType: "organization" | "profile" | "job_order";
};

const SUSPEND_HANDLERS: Partial<Record<string, SuspendHandler>> = {
  organization: {
    table: "organizations",
    setSuspended: { is_suspended: true, is_published: false },
    beforeFields: ["is_suspended", "is_published"],
    auditAction: "organization_suspended",
    auditTargetType: "organization",
  },
  user: {
    table: "profiles",
    setSuspended: { verification_status: "suspended" },
    beforeFields: ["verification_status"],
    auditAction: "profile_suspended",
    auditTargetType: "profile",
  },
  job_order: {
    table: "job_orders",
    setSuspended: { status: "suspended" },
    beforeFields: ["status"],
    auditAction: "job_order_suspended",
    auditTargetType: "job_order",
  },
};

/**
 * Suspend the reported target and resolve the report with outcome
 * `target_suspended`. Writes:
 *   - the target's suspension audit event (e.g. `organization_suspended`)
 *   - `report_target_suspended` on the report itself
 */
export async function suspendTargetAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("report_id") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const report = await loadReport(id);
  if (!report) return;
  if (report.status === "resolved" || report.status === "closed") return;

  const handler = SUSPEND_HANDLERS[report.target_type];
  if (!handler) return;

  const supabase = createSupabaseAdminClient();
  const { data: targetBefore } = await supabase
    .from(handler.table)
    .select(handler.beforeFields.join(","))
    .eq("id", report.target_id)
    .maybeSingle();

  const { error: targetUpdateErr } = await supabase
    .from(handler.table)
    .update(handler.setSuspended)
    .eq("id", report.target_id);
  if (targetUpdateErr) {
    console.error("[suspendTarget:target]", targetUpdateErr);
    return;
  }

  const { data: rows, error } = await supabase
    .from("report_flags")
    .update({
      status: "resolved",
      outcome: "target_suspended",
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
      internal_note: internalNote,
    })
    .eq("id", id)
    .eq("status", report.status)
    .select("id");
  if (error) {
    console.error("[suspendTarget:report]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: handler.auditAction,
    targetType: handler.auditTargetType,
    targetId: report.target_id,
    changedFields: handler.beforeFields,
    beforeData: (targetBefore as Record<string, unknown> | null) ?? null,
    afterData: handler.setSuspended,
    reason: internalNote,
  });

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "report_target_suspended",
    targetType: "report_flag",
    targetId: id,
    changedFields: ["status", "outcome"],
    beforeData: { status: report.status, outcome: report.outcome },
    afterData: { status: "resolved", outcome: "target_suspended" },
    reason: internalNote,
  });

  revalidateAdminViews(id);
}

/**
 * Open a `dispute_cases` row tied to this report's target and move
 * the report to `escalated_to_dispute`. Writes:
 *   - `dispute_opened` on the new dispute case
 *   - `report_escalated_to_dispute` on the report itself
 */
export async function escalateToDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("report_id") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;
  if (!summary) return;

  const report = await loadReport(id);
  if (!report) return;
  if (report.status === "resolved" || report.status === "closed") return;
  if (report.status === "escalated_to_dispute") return;

  const supabase = createSupabaseAdminClient();
  const { data: dispute, error: disputeErr } = await supabase
    .from("dispute_cases")
    .insert({
      opened_by: admin.id,
      target_type: report.target_type,
      target_id: report.target_id,
      dispute_type: "report_escalation",
      summary: summary.slice(0, 2000),
      assigned_to: admin.id,
      status: "open",
    })
    .select("id")
    .single();
  if (disputeErr || !dispute) {
    console.error("[escalateToDispute:dispute]", disputeErr);
    return;
  }

  const { data: rows, error } = await supabase
    .from("report_flags")
    .update({
      status: "escalated_to_dispute",
      outcome: "escalated_to_dispute",
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
      internal_note: internalNote,
    })
    .eq("id", id)
    .eq("status", report.status)
    .select("id");
  if (error) {
    console.error("[escalateToDispute:report]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_opened",
    targetType: "dispute_case",
    targetId: dispute.id,
    changedFields: ["status"],
    afterData: {
      target_type: report.target_type,
      target_id: report.target_id,
      dispute_type: "report_escalation",
      status: "open",
      from_report_id: id,
    },
    reason: internalNote ?? summary,
  });

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "report_escalated_to_dispute",
    targetType: "report_flag",
    targetId: id,
    changedFields: ["status", "outcome"],
    beforeData: { status: report.status, outcome: report.outcome },
    afterData: {
      status: "escalated_to_dispute",
      outcome: "escalated_to_dispute",
      dispute_id: dispute.id,
    },
    reason: internalNote ?? summary,
  });

  revalidateAdminViews(id);
}
