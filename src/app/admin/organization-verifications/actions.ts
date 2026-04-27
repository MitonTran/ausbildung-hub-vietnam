"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import {
  ORG_VERIFICATION_REQUESTABLE,
  defaultOrgExpiryFor,
  type OrganizationRow,
  type OrganizationVerificationRow,
  type OrgVerificationRequestable,
  type OrgVerificationStatus,
} from "@/lib/organization";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isAdminRole(profile.role)) throw new Error("forbidden");
  return profile;
}

async function loadVerification(
  id: string
): Promise<OrganizationVerificationRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("organization_verifications")
    .select(
      "id, organization_id, requested_status, granted_status, submitted_by, document_file_paths, document_summary, fee_disclosure, status, reviewed_by, reviewed_at, expires_at, rejection_reason, admin_note, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as OrganizationVerificationRow | null) ?? null;
}

async function loadOrganization(
  id: string
): Promise<OrganizationRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("organizations")
    .select(
      "id, org_type, legal_name, brand_name, slug, country, city, address, website_url, contact_email, contact_phone, description, services, verification_status, trust_badge, last_verified_at, verification_expires_at, last_updated_by_org_at, risk_score, is_published, is_suspended, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as OrganizationRow | null) ?? null;
}

function revalidateAdminViews(verificationId: string, orgSlug?: string | null) {
  revalidatePath("/admin/organization-verifications");
  revalidatePath(`/admin/organization-verifications/${verificationId}`);
  revalidatePath("/dashboard/organization");
  if (orgSlug) {
    revalidatePath(`/centers/${orgSlug}`);
    revalidatePath(`/companies/${orgSlug}`);
  }
}

// -------------------------------------------------------------------
// Approve (basic_verified | trusted_partner)
//
// Promotes the org to the granted badge level, sets last_verified_at
// + verification_expires_at, marks the verification request approved,
// and writes the audit logs required by /docs/audit-log-rules.md §5.4
// (organization_verification_approved + organization_badge_granted,
// plus organization_trusted_partner_granted when applicable).
// -------------------------------------------------------------------
export async function approveOrganizationVerificationAction(
  formData: FormData
) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const grantRaw = String(formData.get("grant") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;
  if (
    !(ORG_VERIFICATION_REQUESTABLE as ReadonlyArray<string>).includes(grantRaw)
  ) {
    return;
  }
  const grant = grantRaw as OrgVerificationRequestable;

  const verification = await loadVerification(id);
  if (!verification) return;
  // Only an open request can be approved. Re-approving rejected /
  // expired / revoked rows would resurrect a badge the admin team
  // intentionally took away.
  if (
    verification.status !== "pending" &&
    verification.status !== "need_more_info"
  ) {
    return;
  }

  const org = await loadOrganization(verification.organization_id);
  if (!org) return;

  const reviewedAt = new Date();
  const expiresAt = defaultOrgExpiryFor(grant, reviewedAt);
  const supabase = createSupabaseAdminClient();

  // 1. Approve the verification row with optimistic concurrency.
  const { data: updatedVerifRows, error: updateVerifError } = await supabase
    .from("organization_verifications")
    .update({
      status: "approved",
      // Persist the tier the admin actually granted, which can differ from
      // the org's requested_status. Reading this back lets expire/revoke
      // identify the correct badge to clear.
      granted_status: grant,
      reviewed_by: admin.id,
      reviewed_at: reviewedAt.toISOString(),
      expires_at: expiresAt,
      rejection_reason: null,
      admin_note: reason,
    })
    .eq("id", id)
    .eq("status", verification.status)
    .select("id");
  if (updateVerifError) {
    console.error("[approveOrgVerification]", updateVerifError);
    return;
  }
  if (!updatedVerifRows || updatedVerifRows.length === 0) {
    // Status changed under us — another admin acted first.
    return;
  }

  // 2. Promote the organization. Trust columns can only be changed
  //    via the service role (the privilege-escalation trigger
  //    short-circuits when auth.uid() is null).
  const { error: updateOrgError } = await supabase
    .from("organizations")
    .update({
      verification_status: grant,
      last_verified_at: reviewedAt.toISOString(),
      verification_expires_at: expiresAt,
      // is_suspended stays untouched — approval doesn't lift suspensions.
    })
    .eq("id", org.id);
  if (updateOrgError) {
    // Roll the verification row back so the queue isn't left
    // claiming the badge was granted while the org wasn't promoted.
    await supabase
      .from("organization_verifications")
      .update({
        status: verification.status,
        granted_status: verification.granted_status,
        reviewed_by: verification.reviewed_by,
        reviewed_at: verification.reviewed_at,
        expires_at: verification.expires_at,
        rejection_reason: verification.rejection_reason,
        admin_note: verification.admin_note,
      })
      .eq("id", id);
    console.error("[approveOrgVerification:org]", updateOrgError);
    return;
  }

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "organization_verification_approved",
    targetType: "organization_verification",
    targetId: id,
    changedFields: ["status", "reviewed_by", "reviewed_at", "expires_at"],
    beforeData: { status: verification.status },
    afterData: {
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: reviewedAt.toISOString(),
      expires_at: expiresAt,
      requested_status: verification.requested_status,
      granted_status: grant,
    },
    reason,
  });

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "organization_badge_granted",
    targetType: "organization",
    targetId: org.id,
    changedFields: [
      "verification_status",
      "last_verified_at",
      "verification_expires_at",
    ],
    beforeData: {
      verification_status: org.verification_status,
      last_verified_at: org.last_verified_at,
      verification_expires_at: org.verification_expires_at,
    },
    afterData: {
      verification_status: grant,
      last_verified_at: reviewedAt.toISOString(),
      verification_expires_at: expiresAt,
    },
    reason,
  });

  if (grant === "trusted_partner") {
    await writeAuditLog({
      actorId: admin.id,
      actorType: actorTypeForRole(admin.role),
      action: "organization_trusted_partner_granted",
      targetType: "organization",
      targetId: org.id,
      beforeData: { verification_status: org.verification_status },
      afterData: { verification_status: "trusted_partner" },
      reason,
    });
  }

  revalidateAdminViews(id, org.slug);
}

// -------------------------------------------------------------------
// Reject
// -------------------------------------------------------------------
export async function rejectOrganizationVerificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();
  if (!id || !rejectionReason) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  if (
    verification.status !== "pending" &&
    verification.status !== "need_more_info"
  ) {
    return;
  }

  const org = await loadOrganization(verification.organization_id);
  if (!org) return;

  const reviewedAt = new Date();
  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("organization_verifications")
    .update({
      status: "rejected",
      reviewed_by: admin.id,
      reviewed_at: reviewedAt.toISOString(),
      rejection_reason: rejectionReason.slice(0, 500),
      admin_note: null,
    })
    .eq("id", id)
    .eq("status", verification.status) // optimistic concurrency
    .select("id");
  if (error) {
    console.error("[rejectOrgVerification]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  // If org was sitting in pending_review purely because of this
  // request, drop it back to its previous state (approximated:
  // unverified) so the public profile is honest. We do NOT touch
  // active basic_verified / trusted_partner badges granted by other,
  // earlier requests.
  if (org.verification_status === "pending_review") {
    await supabase
      .from("organizations")
      .update({ verification_status: "unverified" })
      .eq("id", org.id)
      .eq("verification_status", "pending_review");
  }

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "organization_verification_rejected",
    targetType: "organization_verification",
    targetId: id,
    changedFields: ["status", "rejection_reason", "reviewed_by", "reviewed_at"],
    beforeData: { status: verification.status },
    afterData: {
      status: "rejected",
      reviewed_by: admin.id,
      reviewed_at: reviewedAt.toISOString(),
    },
    reason: rejectionReason,
  });

  revalidateAdminViews(id, org.slug);
}

// -------------------------------------------------------------------
// Request more info
// -------------------------------------------------------------------
export async function requestOrganizationMoreInfoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  if (!id || !adminNote) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  if (
    verification.status !== "pending" &&
    verification.status !== "need_more_info"
  ) {
    return;
  }

  const org = await loadOrganization(verification.organization_id);

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("organization_verifications")
    .update({
      status: "need_more_info",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote.slice(0, 1000),
    })
    .eq("id", id)
    .eq("status", verification.status) // optimistic concurrency
    .select("id");
  if (error) {
    console.error("[requestOrgMoreInfo]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "organization_verification_more_info_requested",
    targetType: "organization_verification",
    targetId: id,
    changedFields: ["status", "admin_note"],
    beforeData: { status: verification.status },
    afterData: { status: "need_more_info" },
    reason: adminNote,
  });

  revalidateAdminViews(id, org?.slug ?? null);
}

// -------------------------------------------------------------------
// Suspend organization
//
// Independent of the request workflow: an admin can suspend an org
// directly from the verification queue (e.g. while investigating
// fraud). This is reversible via unsuspend (not exposed yet — admins
// can revert via SQL or a future flow).
// -------------------------------------------------------------------
export async function suspendOrganizationAction(formData: FormData) {
  const admin = await requireAdmin();
  const verificationId = String(formData.get("verification_id") ?? "");
  const orgId = String(formData.get("organization_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orgId || !reason) return;

  const org = await loadOrganization(orgId);
  if (!org) return;
  if (org.is_suspended) return;

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("organizations")
    .update({
      is_suspended: true,
      verification_status: "suspended",
    })
    .eq("id", org.id)
    .eq("is_suspended", false) // optimistic concurrency
    .select("id");
  if (error) {
    console.error("[suspendOrganization]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "organization_suspended",
    targetType: "organization",
    targetId: org.id,
    changedFields: ["is_suspended", "verification_status"],
    beforeData: {
      is_suspended: org.is_suspended,
      verification_status: org.verification_status,
    },
    afterData: { is_suspended: true, verification_status: "suspended" },
    reason: reason.slice(0, 1000),
  });

  // If the org had a trusted_partner / basic_verified badge before,
  // also write a badge_revoked log so the audit history is complete.
  if (
    org.verification_status === "basic_verified" ||
    org.verification_status === "trusted_partner" ||
    org.verification_status === "recently_updated"
  ) {
    await writeAuditLog({
      actorId: admin.id,
      actorType: actorTypeForRole(admin.role),
      action: "organization_badge_revoked",
      targetType: "organization",
      targetId: org.id,
      changedFields: ["verification_status"],
      beforeData: { verification_status: org.verification_status },
      afterData: { verification_status: "suspended" },
      reason: reason.slice(0, 1000),
    });
    if (org.verification_status === "trusted_partner") {
      await writeAuditLog({
        actorId: admin.id,
        actorType: actorTypeForRole(admin.role),
        action: "organization_trusted_partner_revoked",
        targetType: "organization",
        targetId: org.id,
        beforeData: { verification_status: "trusted_partner" },
        afterData: { verification_status: "suspended" },
        reason: reason.slice(0, 1000),
      });
    }
  }

  revalidateAdminViews(verificationId, org.slug);
}

// -------------------------------------------------------------------
// Expire verification
//
// Used both for routine end-of-life (expires_at passed) and manual
// admin action. Clears the active badge (basic_verified /
// trusted_partner / recently_updated) on the org, sets the verification
// row's status to expired. Writes badge_expired + (when relevant)
// trusted_partner_revoked audit logs.
// -------------------------------------------------------------------
export async function expireOrganizationVerificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  // Only an approved verification can be expired. Mirrors
  // expireOrRevokeVerificationAction in the user flow.
  if (verification.status !== "approved") return;

  const org = await loadOrganization(verification.organization_id);
  if (!org) return;

  const supabase = createSupabaseAdminClient();

  // 1. Flip the verification row to expired (optimistic concurrency).
  const { data: rows, error } = await supabase
    .from("organization_verifications")
    .update({
      status: "expired",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_note: reason,
    })
    .eq("id", id)
    .eq("status", verification.status)
    .select("id");
  if (error) {
    console.error("[expireOrgVerification]", error);
    return;
  }
  if (!rows || rows.length === 0) return;

  // 2. If the org's CURRENT verification_status matches the level
  //    granted by THIS request, clear it. Don't touch the badge if
  //    the org has been re-verified at a different level since.
  //
  //    Source of truth is verification.granted_status (the tier the admin
  //    actually approved). Fall back to requested_status for legacy rows
  //    written before migration 0006 added the granted_status column.
  const grantedLevel = (verification.granted_status ??
    verification.requested_status) as OrgVerificationStatus;
  const orgIsAtSameLevel = org.verification_status === grantedLevel;
  if (orgIsAtSameLevel) {
    const { data: clearedRows, error: clearErr } = await supabase
      .from("organizations")
      .update({
        verification_status: "expired",
        last_verified_at: org.last_verified_at, // preserved
        // verification_expires_at preserved so the public UI can
        // still show "đã hết hạn" with the original expiry date.
      })
      .eq("id", org.id)
      .eq("verification_status", grantedLevel) // optimistic concurrency
      .select("id");
    if (clearErr) {
      // Roll the verification row back: we don't want a row claiming
      // the badge was expired while the org still shows it.
      await supabase
        .from("organization_verifications")
        .update({
          status: verification.status,
          reviewed_by: verification.reviewed_by,
          reviewed_at: verification.reviewed_at,
          admin_note: verification.admin_note,
        })
        .eq("id", id);
      console.error("[expireOrgVerification:org]", clearErr);
      return;
    }
    if (clearedRows && clearedRows.length > 0) {
      await writeAuditLog({
        actorId: admin.id,
        actorType: actorTypeForRole(admin.role),
        action: "organization_badge_expired",
        targetType: "organization",
        targetId: org.id,
        changedFields: ["verification_status"],
        beforeData: { verification_status: grantedLevel },
        afterData: { verification_status: "expired" },
        reason: reason ?? `auto-cleared because verification ${id} expired`,
      });
      if (grantedLevel === "trusted_partner") {
        await writeAuditLog({
          actorId: admin.id,
          actorType: actorTypeForRole(admin.role),
          action: "organization_trusted_partner_revoked",
          targetType: "organization",
          targetId: org.id,
          beforeData: { verification_status: "trusted_partner" },
          afterData: { verification_status: "expired" },
          reason: reason ?? null,
        });
      }
    }
  }

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "organization_verification_expired",
    targetType: "organization_verification",
    targetId: id,
    changedFields: ["status"],
    beforeData: { status: verification.status },
    afterData: { status: "expired" },
    reason,
  });

  revalidateAdminViews(id, org.slug);
}
