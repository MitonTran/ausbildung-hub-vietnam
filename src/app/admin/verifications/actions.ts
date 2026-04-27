"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import {
  USER_STAGES,
  defaultExpiryFor,
  type UserStage,
  type UserVerificationRow,
} from "@/lib/verification";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isAdminRole(profile.role)) throw new Error("forbidden");
  return profile;
}

async function loadVerification(
  id: string
): Promise<UserVerificationRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("user_verifications")
    .select(
      "id,user_id,requested_stage,verification_type,evidence_summary,evidence_file_paths,status,reviewed_by,reviewed_at,expires_at,rejection_reason,admin_note,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as UserVerificationRow | null) ?? null;
}

function revalidateAdminViews(verificationId: string) {
  revalidatePath("/admin/verifications");
  revalidatePath(`/admin/verifications/${verificationId}`);
  revalidatePath("/dashboard/verification");
}

/**
 * Approve a verification request:
 *   - flips user_verifications.status to 'approved'
 *   - sets reviewed_by / reviewed_at / expires_at (per stage default)
 *   - updates the target profile's verified_stage and verification_status
 *   - writes user_verification_approved + verified_stage_changed
 *     audit logs
 */
export async function approveVerificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  // Mirrors the other admin actions: only an open request (pending or
  // need_more_info) can be approved. Re-approving a previously
  // rejected / expired / revoked row would restore a badge that was
  // intentionally taken away — including for fraud — and bypass the
  // intended user-resubmission flow.
  if (
    verification.status !== "pending" &&
    verification.status !== "need_more_info"
  ) {
    return;
  }

  const requestedStage = verification.requested_stage as UserStage;
  if (!(USER_STAGES as ReadonlyArray<string>).includes(requestedStage)) return;

  const reviewedAt = new Date();
  const expiresAt = defaultExpiryFor(requestedStage, reviewedAt);

  const supabase = createSupabaseAdminClient();
  const { data: targetBefore } = await supabase
    .from("profiles")
    .select("verified_stage,verification_status")
    .eq("id", verification.user_id)
    .maybeSingle();

  // Optimistic concurrency: scope the UPDATE to the status we read
  // above. If a concurrent admin action moved the row to a different
  // status between our load and our write, this UPDATE matches zero
  // rows and we abort — we never silently overwrite another admin's
  // decision.
  const { data: updatedVerifRows, error: updateVerifError } = await supabase
    .from("user_verifications")
    .update({
      status: "approved",
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
    console.error("[approveVerification]", updateVerifError);
    return;
  }
  if (!updatedVerifRows || updatedVerifRows.length === 0) {
    // Status changed under us — another admin acted first.
    return;
  }

  // Profile updates: verified_stage, verification_status. Service role
  // bypasses RLS and the prevent-privilege-escalation trigger sees
  // auth.uid() = null and short-circuits.
  const { error: updateProfileError } = await supabase
    .from("profiles")
    .update({
      verified_stage: requestedStage,
      verification_status: "verified",
    })
    .eq("id", verification.user_id);
  if (updateProfileError) {
    // The user_verifications row was already flipped to 'approved'
    // above. Roll it back so we don't end up with an approved row
    // pointing at a profile that never received the badge — and so
    // we don't write a misleading verified_stage_changed audit log.
    await supabase
      .from("user_verifications")
      .update({
        status: verification.status,
        reviewed_by: verification.reviewed_by,
        reviewed_at: verification.reviewed_at,
        expires_at: verification.expires_at,
        rejection_reason: verification.rejection_reason,
        admin_note: verification.admin_note,
      })
      .eq("id", id);
    console.error("[approveVerification:profile]", updateProfileError);
    return;
  }

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "user_verification_approved",
    targetType: "user_verification",
    targetId: id,
    changedFields: [
      "status",
      "reviewed_by",
      "reviewed_at",
      "expires_at",
    ],
    beforeData: {
      status: verification.status,
      reviewed_by: verification.reviewed_by,
      expires_at: verification.expires_at,
    },
    afterData: {
      status: "approved",
      reviewed_by: admin.id,
      reviewed_at: reviewedAt.toISOString(),
      expires_at: expiresAt,
      requested_stage: requestedStage,
    },
    reason,
  });

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "verified_stage_changed",
    targetType: "profile",
    targetId: verification.user_id,
    changedFields: ["verified_stage", "verification_status"],
    beforeData: targetBefore ?? null,
    afterData: {
      verified_stage: requestedStage,
      verification_status: "verified",
    },
    reason,
  });

  revalidateAdminViews(id);
}

export async function rejectVerificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();
  if (!id || !rejectionReason) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  // Only an open request (pending or need_more_info) can be rejected.
  // Rejecting an already-approved row would leave the profile badge
  // intact while the verification row claims it was rejected, and
  // would block expireOrRevokeVerificationAction (which requires
  // status === 'approved') from ever clearing the badge.
  if (
    verification.status !== "pending" &&
    verification.status !== "need_more_info"
  ) {
    return;
  }

  const reviewedAt = new Date();
  const supabase = createSupabaseAdminClient();
  const { data: rejectedRows, error } = await supabase
    .from("user_verifications")
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
    console.error("[rejectVerification]", error);
    return;
  }
  if (!rejectedRows || rejectedRows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "user_verification_rejected",
    targetType: "user_verification",
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

  revalidateAdminViews(id);
}

export async function requestMoreInfoAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const adminNote = String(formData.get("admin_note") ?? "").trim();
  if (!id || !adminNote) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  // Mirrors rejectVerificationAction: only an open request can be
  // bumped back to need_more_info. Allowing this on approved /
  // expired / revoked rows would desync the verification row from
  // the profile badge and leave the badge un-revocable through
  // normal admin flows.
  if (
    verification.status !== "pending" &&
    verification.status !== "need_more_info"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: nmiRows, error } = await supabase
    .from("user_verifications")
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
    console.error("[requestMoreInfo]", error);
    return;
  }
  if (!nmiRows || nmiRows.length === 0) return;

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action: "user_verification_more_info_requested",
    targetType: "user_verification",
    targetId: id,
    changedFields: ["status", "admin_note"],
    beforeData: { status: verification.status },
    afterData: { status: "need_more_info" },
    reason: adminNote,
  });

  revalidateAdminViews(id);
}

/**
 * Mark an approved verification as expired or revoked. Both clear
 * the user's verified_stage and write a corresponding audit log.
 *
 * `mode='expire'` is intended for routine end-of-life (e.g. residence
 * proof past 12 months); `mode='revoke'` is intended for fraud /
 * disputed evidence and requires a reason.
 */
export async function expireOrRevokeVerificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("verification_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;
  if (mode !== "expire" && mode !== "revoke") return;
  if (mode === "revoke" && !reason) return;

  const verification = await loadVerification(id);
  if (!verification) return;
  // Only an `approved` verification can be expired or revoked. Any
  // other status (pending / rejected / need_more_info / already
  // expired / already revoked) is rejected here so a crafted form
  // submission cannot strip a user's badge by targeting an unrelated
  // pending request.
  if (verification.status !== "approved") {
    return;
  }

  const newStatus = mode === "expire" ? "expired" : "revoked";
  const supabase = createSupabaseAdminClient();

  const { data: targetBefore } = await supabase
    .from("profiles")
    .select("verified_stage,verification_status")
    .eq("id", verification.user_id)
    .maybeSingle();

  const { data: expRevRows, error } = await supabase
    .from("user_verifications")
    .update({
      status: newStatus,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_note: reason,
    })
    .eq("id", id)
    .eq("status", verification.status) // optimistic concurrency
    .select("id");
  if (error) {
    console.error("[expireOrRevoke]", error);
    return;
  }
  if (!expRevRows || expRevRows.length === 0) return;

  // If the target profile's currently-active verified_stage matches
  // this verification's requested stage, clear it. Don't touch the
  // profile if the user has been re-verified at a different stage
  // since.
  if (
    targetBefore?.verified_stage &&
    targetBefore.verified_stage === verification.requested_stage
  ) {
    // Optimistic concurrency on the profile too: only clear the badge
    // if it still matches the stage we read above. If a concurrent
    // approveVerificationAction granted the user a different
    // verified_stage in between, we leave the new badge alone.
    const { data: clearedProfileRows, error: clearProfileError } = await supabase
      .from("profiles")
      .update({
        verified_stage: null,
        verification_status: "unverified",
      })
      .eq("id", verification.user_id)
      .eq("verified_stage", verification.requested_stage)
      .select("id");
    if (clearProfileError) {
      // The verification row has already been flipped to expired /
      // revoked above. Roll it back to 'approved' so we don't end up
      // with a row claiming the badge was lifted while the profile
      // still shows it. Mirrors the rollback in approveVerificationAction.
      await supabase
        .from("user_verifications")
        .update({
          status: verification.status,
          reviewed_by: verification.reviewed_by,
          reviewed_at: verification.reviewed_at,
          admin_note: verification.admin_note,
        })
        .eq("id", id);
      console.error("[expireOrRevoke:clearProfile]", clearProfileError);
      return;
    } else if (clearedProfileRows && clearedProfileRows.length > 0) {
      // Only audit the profile change if the UPDATE actually changed
      // a row. If clearedProfileRows is empty, the user's
      // verified_stage was reassigned by a concurrent approval and we
      // intentionally left it alone.
      await writeAuditLog({
        actorId: admin.id,
        actorType: actorTypeForRole(admin.role),
        action: "verified_stage_changed",
        targetType: "profile",
        targetId: verification.user_id,
        changedFields: ["verified_stage", "verification_status"],
        beforeData: targetBefore,
        afterData: {
          verified_stage: null,
          verification_status: "unverified",
        },
        reason: `auto-cleared because verification ${id} was ${newStatus}`,
      });
    }
  }

  await writeAuditLog({
    actorId: admin.id,
    actorType: actorTypeForRole(admin.role),
    action:
      newStatus === "expired"
        ? "user_verification_expired"
        : "user_verification_revoked",
    targetType: "user_verification",
    targetId: id,
    changedFields: ["status"],
    beforeData: { status: verification.status },
    afterData: { status: newStatus },
    reason,
  });

  revalidateAdminViews(id);
}
