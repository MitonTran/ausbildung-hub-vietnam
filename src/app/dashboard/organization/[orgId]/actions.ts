"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  ORG_EVIDENCE_ALLOWED_EXTENSIONS,
  ORG_EVIDENCE_ALLOWED_MIME,
  ORG_EVIDENCE_BUCKET,
  ORG_EVIDENCE_FILE_MAX_BYTES,
  ORG_EVIDENCE_FILES_MAX_COUNT,
  ORG_VERIFICATION_REQUESTABLE,
  buildOrgEvidencePath,
  type OrgVerificationRequestable,
  type OrganizationRow,
} from "@/lib/organization";

// -------------------------------------------------------------------
// Shared helpers
// -------------------------------------------------------------------

/**
 * Loads the organization the caller is allowed to manage. Returns null
 * if the user is not signed in, not an active member, or the org does
 * not exist. Owners + managers + editors can edit profile fields and
 * submit verification requests; viewers can read but cannot mutate.
 */
async function loadManagedOrg(
  orgId: string
): Promise<{
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;
  organization: OrganizationRow;
  memberRole: "owner" | "manager" | "editor" | "viewer";
} | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const admin = createSupabaseAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("member_role, status")
    .eq("organization_id", orgId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (
    !membership ||
    membership.status !== "active" ||
    !["owner", "manager", "editor"].includes(membership.member_role as string)
  ) {
    return null;
  }

  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, org_type, legal_name, brand_name, slug, country, city, address, website_url, contact_email, contact_phone, description, services, verification_status, trust_badge, last_verified_at, verification_expires_at, last_updated_by_org_at, risk_score, is_published, is_suspended, created_at, updated_at"
    )
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return null;

  return {
    profile,
    organization: org as OrganizationRow,
    memberRole: membership.member_role as
      | "owner"
      | "manager"
      | "editor"
      | "viewer",
  };
}

function sanitizeFilename(name: string): string {
  const base = name.split("/").pop() ?? "evidence";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "evidence";
}

function fileExtensionAllowed(name: string): boolean {
  const lower = name.toLowerCase();
  return ORG_EVIDENCE_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// -------------------------------------------------------------------
// Update standardized profile fields
// -------------------------------------------------------------------

const PROFILE_TEXT_FIELDS = [
  "legal_name",
  "brand_name",
  "country",
  "city",
  "address",
  "website_url",
  "contact_email",
  "contact_phone",
  "description",
] as const;

type ProfileTextField = (typeof PROFILE_TEXT_FIELDS)[number];

const FIELD_MAX_LEN: Record<ProfileTextField, number> = {
  legal_name: 200,
  brand_name: 120,
  country: 80,
  city: 80,
  address: 300,
  website_url: 300,
  contact_email: 200,
  contact_phone: 50,
  description: 4000,
};

/**
 * Update the editable, public-facing profile fields of an organization.
 *
 * Trust columns (verification_status, trust_badge, risk_score,
 * is_suspended, last_verified_at, verification_expires_at) are NEVER
 * updated by this action — those are admin-only per
 * /docs/rls-policy.md §4 and the trigger
 * `organizations_prevent_privilege_escalation` (0003) clamps them
 * regardless. We additionally bump `last_updated_by_org_at` so the
 * "Recently updated" badge logic has a timestamp to read.
 */
export async function updateOrganizationProfileAction(formData: FormData) {
  const orgId = String(formData.get("organization_id") ?? "");
  if (!orgId) return;

  const ctx = await loadManagedOrg(orgId);
  if (!ctx) return;
  const { profile, organization } = ctx;

  // Build the patch from the allowed fields only.
  const patch: Record<string, string | string[] | null> = {};
  const before: Record<string, string | string[] | null> = {};
  const changed: string[] = [];
  for (const field of PROFILE_TEXT_FIELDS) {
    if (!formData.has(field)) continue;
    const raw = String(formData.get(field) ?? "")
      .trim()
      .slice(0, FIELD_MAX_LEN[field]);
    const next = raw === "" ? null : raw;
    const prev = (organization as Record<string, unknown>)[field] as
      | string
      | null;
    if ((prev ?? null) !== next) {
      patch[field] = next;
      before[field] = prev ?? null;
      changed.push(field);
    }
  }

  // services is an optional comma-separated input.
  if (formData.has("services")) {
    const raw = String(formData.get("services") ?? "");
    const next = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    const prevNorm = (organization.services ?? []).slice().sort().join(",");
    const nextNorm = next.slice().sort().join(",");
    if (prevNorm !== nextNorm) {
      patch.services = next.length ? next : null;
      before.services = organization.services;
      changed.push("services");
    }
  }

  if (changed.length === 0) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      ...patch,
      last_updated_by_org_at: new Date().toISOString(),
    })
    .eq("id", organization.id);
  if (error) {
    console.error("[updateOrganizationProfile]", error);
    return;
  }

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "organization_profile_updated",
    targetType: "organization",
    targetId: organization.id,
    changedFields: changed,
    beforeData: before,
    afterData: patch,
  });

  revalidatePath(`/dashboard/organization/${organization.id}`);
  revalidatePath("/dashboard/organization");
  if (organization.slug) {
    revalidatePath(`/centers/${organization.slug}`);
    revalidatePath(`/companies/${organization.slug}`);
  }
}

// -------------------------------------------------------------------
// Submit a verification request
// -------------------------------------------------------------------

export type SubmitOrgVerificationState = {
  error: string | null;
  message: string | null;
};

export async function submitOrganizationVerificationRequestAction(
  _prev: SubmitOrgVerificationState,
  formData: FormData
): Promise<SubmitOrgVerificationState> {
  const orgId = String(formData.get("organization_id") ?? "");
  if (!orgId) {
    return { error: "Tổ chức không hợp lệ.", message: null };
  }

  const ctx = await loadManagedOrg(orgId);
  if (!ctx) {
    return {
      error: "Bạn không có quyền gửi yêu cầu xác minh cho tổ chức này.",
      message: null,
    };
  }
  const { profile, organization } = ctx;

  const requestedRaw = String(formData.get("requested_status") ?? "");
  if (
    !(ORG_VERIFICATION_REQUESTABLE as ReadonlyArray<string>).includes(
      requestedRaw
    )
  ) {
    return { error: "Cấp xác minh yêu cầu không hợp lệ.", message: null };
  }
  const requestedStatus = requestedRaw as OrgVerificationRequestable;

  const documentSummary = String(formData.get("document_summary") ?? "")
    .trim()
    .slice(0, 4000);
  const feeDisclosure = String(formData.get("fee_disclosure") ?? "")
    .trim()
    .slice(0, 4000);

  const ackRights = formData.get("ack_rights") === "on";
  const ackAuthentic = formData.get("ack_authentic") === "on";
  const ackNoFee = formData.get("ack_no_self_grant") === "on";
  if (!ackRights || !ackAuthentic || !ackNoFee) {
    return {
      error:
        "Vui lòng xác nhận cả ba điều kiện: quyền upload, tính xác thực, và việc xác minh không thể tự cấp / không kèm thanh toán.",
      message: null,
    };
  }

  const files = formData.getAll("evidence_files").filter(
    (f): f is File => typeof f === "object" && f !== null && "size" in f
  );
  const realFiles = files.filter((f) => f.size > 0);
  if (realFiles.length === 0) {
    return {
      error:
        "Vui lòng đính kèm ít nhất một tài liệu (PDF/JPG/PNG) để chứng minh tổ chức.",
      message: null,
    };
  }
  if (realFiles.length > ORG_EVIDENCE_FILES_MAX_COUNT) {
    return {
      error: `Tối đa ${ORG_EVIDENCE_FILES_MAX_COUNT} tệp cho mỗi yêu cầu.`,
      message: null,
    };
  }
  for (const f of realFiles) {
    if (f.size > ORG_EVIDENCE_FILE_MAX_BYTES) {
      return {
        error: `Mỗi tệp tối đa 5 MB. Tệp "${f.name}" vượt quá giới hạn.`,
        message: null,
      };
    }
    if (
      !(ORG_EVIDENCE_ALLOWED_MIME as ReadonlyArray<string>).includes(f.type) &&
      !fileExtensionAllowed(f.name)
    ) {
      return {
        error: `Chỉ chấp nhận PDF, JPG, PNG. Tệp "${f.name}" không hợp lệ.`,
        message: null,
      };
    }
  }

  // Block submitting a new request while a previous one is still
  // pending or awaiting more info — admins can re-open by asking for
  // more info, the org can edit, but they shouldn't fork the queue.
  const admin = createSupabaseAdminClient();
  const { data: openRequests } = await admin
    .from("organization_verifications")
    .select("id")
    .eq("organization_id", organization.id)
    .in("status", ["pending", "need_more_info"])
    .limit(1);
  if (openRequests && openRequests.length > 0) {
    return {
      error:
        "Bạn đã có một yêu cầu xác minh đang được xử lý. Vui lòng đợi kết quả trước khi gửi yêu cầu mới.",
      message: null,
    };
  }

  const verificationId = randomUUID();

  const evidenceFilePaths: string[] = [];
  for (let i = 0; i < realFiles.length; i++) {
    const f = realFiles[i];
    const filename = `${i + 1}-${randomUUID()}-${sanitizeFilename(f.name)}`;
    const path = buildOrgEvidencePath({
      organizationId: organization.id,
      verificationId,
      filename,
    });
    const buf = Buffer.from(await f.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(ORG_EVIDENCE_BUCKET)
      .upload(path, buf, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      if (evidenceFilePaths.length) {
        await admin.storage
          .from(ORG_EVIDENCE_BUCKET)
          .remove(evidenceFilePaths);
      }
      return {
        error: `Không thể upload tệp "${f.name}": ${uploadError.message}`,
        message: null,
      };
    }
    evidenceFilePaths.push(path);
  }

  // Service-role insert. Trigger
  // `organization_verifications_prevent_privilege_escalation` from
  // 0003 sees auth.uid()=null and short-circuits, so we explicitly
  // pin all moderation columns to safe defaults ourselves.
  const { error: insertError } = await admin
    .from("organization_verifications")
    .insert({
      id: verificationId,
      organization_id: organization.id,
      requested_status: requestedStatus,
      submitted_by: profile.id,
      document_file_paths: evidenceFilePaths,
      document_summary: documentSummary || null,
      fee_disclosure: feeDisclosure || null,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      expires_at: null,
      rejection_reason: null,
      admin_note: null,
    });
  if (insertError) {
    await admin.storage.from(ORG_EVIDENCE_BUCKET).remove(evidenceFilePaths);
    return { error: insertError.message, message: null };
  }

  // Move the org's verification_status to pending_review so the
  // public profile reflects the in-progress state. Admin trigger on
  // service-role bypasses the privilege-escalation revert (auth.uid()
  // is null), so this update is intentional.
  await admin
    .from("organizations")
    .update({ verification_status: "pending_review" })
    .eq("id", organization.id)
    // Only flip from unverified / expired / rejected — never overwrite
    // an active basic_verified or trusted_partner badge.
    .in("verification_status", [
      "unverified",
      "expired",
      "rejected",
      "revoked",
    ]);

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "organization_verification_submitted",
    targetType: "organization_verification",
    targetId: verificationId,
    afterData: {
      organization_id: organization.id,
      requested_status: requestedStatus,
      file_count: evidenceFilePaths.length,
    },
    reason: documentSummary || null,
  });

  revalidatePath(`/dashboard/organization/${organization.id}`);
  revalidatePath("/admin/organization-verifications");
  if (organization.slug) {
    revalidatePath(`/centers/${organization.slug}`);
    revalidatePath(`/companies/${organization.slug}`);
  }

  return {
    error: null,
    message:
      "Yêu cầu xác minh đã được gửi. Quản trị viên sẽ phản hồi sau khi xem xét hồ sơ.",
  };
}
