"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole, STAFF_ROLES, type UserRole } from "@/lib/supabase/types";
import type { JobOrderRow, JobOrderStatus } from "@/lib/job-orders";

function isModeratorOrAdmin(role: UserRole | null | undefined): boolean {
  return !!role && (STAFF_ROLES as ReadonlyArray<string>).includes(role);
}

async function requireModeratorOrAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isModeratorOrAdmin(profile.role)) throw new Error("forbidden");
  return profile;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isAdminRole(profile.role)) throw new Error("forbidden");
  return profile;
}

async function loadJobOrder(id: string): Promise<JobOrderRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("job_orders")
    .select(
      "id, organization_id, created_by, slug, title, occupation, germany_city, germany_state, training_type, german_level_required, education_required, start_date, interview_date, monthly_training_allowance, accommodation_support, fee_disclosure, application_deadline, expires_at, verification_status, status, last_verified_at, last_updated_by_org_at, is_sponsored, created_at, updated_at, deleted_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as JobOrderRow | null) ?? null;
}

function revalidateJobOrderViews(jo: JobOrderRow) {
  revalidatePath("/admin/job-orders");
  revalidatePath(`/admin/job-orders/${jo.id}`);
  revalidatePath(`/dashboard/organization/${jo.organization_id}/jobs`);
  revalidatePath("/jobs");
  if (jo.slug) {
    revalidatePath(`/jobs/${jo.slug}`);
  }
}

/**
 * Approve a pending job order: flip status='published' and
 * verification_status='basic_verified', stamp last_verified_at,
 * write a `job_order_published` audit log.
 */
export async function approveJobOrderAction(formData: FormData) {
  const actor = await requireModeratorOrAdmin();
  const id = String(formData.get("job_order_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;

  const jo = await loadJobOrder(id);
  if (!jo) return;
  if (
    jo.status !== "pending_verification" &&
    jo.status !== "under_review" &&
    jo.status !== "rejected"
  ) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const { data: updatedRows, error } = await admin
    .from("job_orders")
    .update({
      status: "published" as JobOrderStatus,
      verification_status: "basic_verified",
      last_verified_at: nowIso,
    })
    .eq("id", id)
    .eq("status", jo.status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[approveJobOrder]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "job_order_published",
    targetType: "job_order",
    targetId: id,
    changedFields: ["status", "verification_status", "last_verified_at"],
    beforeData: {
      status: jo.status,
      verification_status: jo.verification_status,
      last_verified_at: jo.last_verified_at,
    },
    afterData: {
      status: "published",
      verification_status: "basic_verified",
      last_verified_at: nowIso,
    },
    reason,
    humanApproved: true,
  });

  revalidateJobOrderViews(jo);
}

/**
 * Reject a job order. The reason is mandatory and surfaced to the
 * submitter so they know what to fix.
 */
export async function rejectJobOrderAction(formData: FormData) {
  const actor = await requireModeratorOrAdmin();
  const id = String(formData.get("job_order_id") ?? "");
  const reason =
    String(formData.get("rejected_reason") ?? "").trim() || null;
  if (!id || !reason) return;

  const jo = await loadJobOrder(id);
  if (!jo) return;
  if (
    jo.status !== "pending_verification" &&
    jo.status !== "under_review"
  ) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { data: updatedRows, error } = await admin
    .from("job_orders")
    .update({
      status: "rejected" as JobOrderStatus,
      verification_status: "rejected",
    })
    .eq("id", id)
    .eq("status", jo.status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[rejectJobOrder]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "job_order_rejected",
    targetType: "job_order",
    targetId: id,
    changedFields: ["status", "verification_status"],
    beforeData: {
      status: jo.status,
      verification_status: jo.verification_status,
    },
    afterData: { status: "rejected", verification_status: "rejected" },
    reason,
    humanApproved: true,
  });

  revalidateJobOrderViews(jo);
}

/**
 * Suspend a job order (admin-only). Used when a reported issue
 * warrants taking it off public listings while moderation runs.
 */
export async function suspendJobOrderAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("job_order_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id || !reason) return;

  const jo = await loadJobOrder(id);
  if (!jo) return;
  if (jo.status === "suspended" || jo.status === "rejected") return;

  const admin = createSupabaseAdminClient();
  const { data: updatedRows, error } = await admin
    .from("job_orders")
    .update({
      status: "suspended" as JobOrderStatus,
      verification_status: "suspended",
    })
    .eq("id", id)
    .eq("status", jo.status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[suspendJobOrder]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "job_order_suspended",
    targetType: "job_order",
    targetId: id,
    changedFields: ["status", "verification_status"],
    beforeData: {
      status: jo.status,
      verification_status: jo.verification_status,
    },
    afterData: { status: "suspended", verification_status: "suspended" },
    reason,
    humanApproved: true,
  });

  revalidateJobOrderViews(jo);
}

/**
 * Lift a suspension and put the job order back into review. Admin only.
 */
export async function unsuspendJobOrderAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("job_order_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;

  const jo = await loadJobOrder(id);
  if (!jo) return;
  if (jo.status !== "suspended") return;

  const admin = createSupabaseAdminClient();
  const { data: updatedRows, error } = await admin
    .from("job_orders")
    .update({
      status: "under_review" as JobOrderStatus,
      verification_status: "pending_verification",
    })
    .eq("id", id)
    .eq("status", "suspended")
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[unsuspendJobOrder]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "job_order_unsuspended",
    targetType: "job_order",
    targetId: id,
    changedFields: ["status", "verification_status"],
    beforeData: {
      status: jo.status,
      verification_status: jo.verification_status,
    },
    afterData: {
      status: "under_review",
      verification_status: "pending_verification",
    },
    reason,
    humanApproved: true,
  });

  revalidateJobOrderViews(jo);
}
