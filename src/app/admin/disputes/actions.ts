"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import {
  isDisputeResolution,
  type DisputeCaseRow,
  type DisputeResolution,
  type DisputeStatus,
} from "@/lib/disputes";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isAdminRole(profile.role)) throw new Error("forbidden");
  return profile;
}

async function loadDispute(id: string): Promise<DisputeCaseRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("dispute_cases")
    .select(
      "id,opened_by,target_type,target_id,dispute_type,summary,evidence_file_paths,status,assigned_to,resolution,resolved_by,resolved_at,internal_note,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as DisputeCaseRow | null) ?? null;
}

function revalidateAdminViews(disputeId: string) {
  revalidatePath("/admin/disputes");
  revalidatePath(`/admin/disputes/${disputeId}`);
  revalidatePath("/disputes/mine");
}

/**
 * Assign a dispute to the acting admin. Moves status to `under_review`
 * if the case is still `open`. Audit: `dispute_assigned`.
 */
export async function assignDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  if (!UUID_RE.test(id)) return;

  const before = await loadDispute(id);
  if (!before) return;
  if (
    before.status !== "open" &&
    before.status !== "waiting_for_user" &&
    before.status !== "waiting_for_organization" &&
    before.status !== "under_review"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const newStatus: DisputeStatus =
    before.status === "open" ? "under_review" : before.status;
  const { data: rows, error } = await supabase
    .from("dispute_cases")
    .update({ assigned_to: admin.id, status: newStatus })
    .eq("id", id)
    .eq("status", before.status)
    .select("id");
  if (error) {
    console.error("[assignDispute]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_assigned",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["assigned_to", "status"],
    beforeData: { assigned_to: before.assigned_to, status: before.status },
    afterData: { assigned_to: admin.id, status: newStatus },
    reason: null,
  });

  revalidateAdminViews(id);
}

/**
 * Move dispute into a "waiting_for_user" or "waiting_for_organization"
 * state to request more information from one of the parties.
 * Audit: `dispute_more_info_requested`.
 */
export async function requestMoreInfoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  const fromRaw = String(formData.get("from") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const newStatus: DisputeStatus | null =
    fromRaw === "user"
      ? "waiting_for_user"
      : fromRaw === "organization"
      ? "waiting_for_organization"
      : null;
  if (!newStatus) return;

  const before = await loadDispute(id);
  if (!before) return;
  if (
    before.status === "resolved" ||
    before.status === "rejected" ||
    before.status === "closed"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("dispute_cases")
    .update({
      status: newStatus,
      assigned_to: before.assigned_to ?? admin.id,
      internal_note: internalNote ?? before.internal_note,
    })
    .eq("id", id)
    .eq("status", before.status)
    .select("id");
  if (error) {
    console.error("[requestMoreInfo]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_more_info_requested",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["status"],
    beforeData: { status: before.status },
    afterData: { status: newStatus, requested_from: fromRaw },
    reason: internalNote,
  });

  revalidateAdminViews(id);
}

/**
 * Update the internal note (admin-only, never exposed to the opener).
 * Status is unchanged. Audit: `dispute_status_changed` with
 * changed_fields=['internal_note'] so the audit trail records the
 * note edit without a state transition.
 */
export async function updateInternalNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  const note = String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const before = await loadDispute(id);
  if (!before) return;
  if (before.internal_note === note) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("dispute_cases")
    .update({ internal_note: note })
    .eq("id", id);
  if (error) {
    console.error("[updateInternalNote]", error);
    return;
  }

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_status_changed",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["internal_note"],
    beforeData: { internal_note: before.internal_note },
    afterData: { internal_note: note },
    reason: null,
    humanApproved: true,
  });

  revalidateAdminViews(id);
}

/**
 * Resolve the dispute with one of the seven resolution options.
 * Side-effects on the underlying target (e.g. revoke_badge,
 * suspend_profile) are NOT auto-applied here — those are separate
 * admin actions on the target. The dispute itself records the
 * decision and the audit trail. Audit: `dispute_resolved`.
 */
export async function resolveDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  const resolutionRaw = String(formData.get("resolution") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;
  if (!isDisputeResolution(resolutionRaw)) return;
  const resolution = resolutionRaw as DisputeResolution;

  const before = await loadDispute(id);
  if (!before) return;
  if (
    before.status === "resolved" ||
    before.status === "rejected" ||
    before.status === "closed"
  ) {
    return;
  }

  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("dispute_cases")
    .update({
      status: "resolved",
      resolution,
      resolved_by: admin.id,
      resolved_at: now,
      internal_note: internalNote ?? before.internal_note,
    })
    .eq("id", id)
    .eq("status", before.status)
    .select("id");
  if (error) {
    console.error("[resolveDispute]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_resolved",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["status", "resolution", "resolved_by", "resolved_at"],
    beforeData: {
      status: before.status,
      resolution: before.resolution,
      resolved_by: before.resolved_by,
    },
    afterData: {
      status: "resolved",
      resolution,
      resolved_by: admin.id,
      resolved_at: now,
    },
    reason: internalNote,
    humanApproved: true,
  });

  revalidateAdminViews(id);
}

/**
 * Reject the dispute (admin determined the complaint is not valid).
 * Audit: `dispute_rejected`.
 */
export async function rejectDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const before = await loadDispute(id);
  if (!before) return;
  if (
    before.status === "resolved" ||
    before.status === "rejected" ||
    before.status === "closed"
  ) {
    return;
  }

  const now = new Date().toISOString();
  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("dispute_cases")
    .update({
      status: "rejected",
      resolved_by: admin.id,
      resolved_at: now,
      internal_note: internalNote ?? before.internal_note,
    })
    .eq("id", id)
    .eq("status", before.status)
    .select("id");
  if (error) {
    console.error("[rejectDispute]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_rejected",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["status", "resolved_by", "resolved_at"],
    beforeData: { status: before.status },
    afterData: {
      status: "rejected",
      resolved_by: admin.id,
      resolved_at: now,
    },
    reason: internalNote,
    humanApproved: true,
  });

  revalidateAdminViews(id);
}

/**
 * Reopen a previously resolved/rejected/closed dispute. Clears
 * `resolved_at` so the case re-enters the active queue.
 * Audit: `dispute_status_changed`.
 */
export async function reopenDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  const internalNote =
    String(formData.get("internal_note") ?? "").trim() || null;
  if (!UUID_RE.test(id)) return;

  const before = await loadDispute(id);
  if (!before) return;
  if (
    before.status !== "resolved" &&
    before.status !== "rejected" &&
    before.status !== "closed"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("dispute_cases")
    .update({
      status: "open",
      resolution: null,
      resolved_by: null,
      resolved_at: null,
      internal_note: internalNote ?? before.internal_note,
    })
    .eq("id", id)
    .eq("status", before.status)
    .select("id");
  if (error) {
    console.error("[reopenDispute]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_status_changed",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["status", "resolution", "resolved_by", "resolved_at"],
    beforeData: {
      status: before.status,
      resolution: before.resolution,
      resolved_by: before.resolved_by,
    },
    afterData: {
      status: "open",
      resolution: null,
      resolved_by: null,
      resolved_at: null,
    },
    reason: internalNote,
    humanApproved: true,
  });

  revalidateAdminViews(id);
}

/**
 * Close a dispute that was previously resolved/rejected (terminal).
 * Audit: `dispute_closed`.
 */
export async function closeDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("dispute_id") ?? "");
  if (!UUID_RE.test(id)) return;

  const before = await loadDispute(id);
  if (!before) return;
  if (before.status === "closed") return;

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("dispute_cases")
    .update({ status: "closed" })
    .eq("id", id)
    .eq("status", before.status)
    .select("id");
  if (error) {
    console.error("[closeDispute]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "dispute_closed",
    targetType: "dispute_case",
    targetId: id,
    changedFields: ["status"],
    beforeData: { status: before.status },
    afterData: { status: "closed" },
    reason: null,
    humanApproved: true,
  });

  revalidateAdminViews(id);
}
