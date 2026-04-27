"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  USER_STAGES,
  VERIFICATION_TYPES,
  VERIFICATION_BUCKET,
  VERIFICATION_FILE_MAX_BYTES,
  VERIFICATION_FILES_MAX_COUNT,
  VERIFICATION_ALLOWED_MIME,
  VERIFICATION_ALLOWED_EXTENSIONS,
  buildEvidencePath,
  type UserStage,
  type VerificationType,
} from "@/lib/verification";

export type SubmitVerificationState = {
  error: string | null;
  message: string | null;
};

function sanitizeFilename(name: string): string {
  // Strip directory parts and unsafe characters, keep extension. The
  // bucket is private and per-user-scoped, but we still defensively
  // normalize so signed-URL / Content-Disposition behave predictably.
  const base = name.split("/").pop() ?? "evidence";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "evidence";
}

function fileExtensionAllowed(name: string): boolean {
  const lower = name.toLowerCase();
  return VERIFICATION_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Server action: submit a new verification request.
 *
 * Validates the request, uploads any attached evidence files into the
 * private storage bucket using the service-role client (so admins can
 * later issue server-side signed URLs without giving the user broader
 * storage permissions), inserts the user_verifications row through the
 * authenticated client (so the BEFORE INSERT privilege-escalation
 * trigger pins status to 'pending' / clears moderation columns), and
 * writes a `user_verification_submitted` audit log.
 */
export async function submitVerificationRequestAction(
  _prev: SubmitVerificationState,
  formData: FormData
): Promise<SubmitVerificationState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Bạn cần đăng nhập để gửi yêu cầu xác minh.", message: null };
  }

  const requestedStageRaw = String(formData.get("requested_stage") ?? "");
  const verificationTypeRaw = String(formData.get("verification_type") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);
  const ackRights = formData.get("ack_rights") === "on";
  const ackRedacted = formData.get("ack_redacted") === "on";
  const ackAuthentic = formData.get("ack_authentic") === "on";

  if (
    !(USER_STAGES as ReadonlyArray<string>).includes(requestedStageRaw)
  ) {
    return { error: "Giai đoạn yêu cầu không hợp lệ.", message: null };
  }
  if (
    !(VERIFICATION_TYPES as ReadonlyArray<string>).includes(verificationTypeRaw)
  ) {
    return { error: "Loại bằng chứng không hợp lệ.", message: null };
  }
  const requestedStage = requestedStageRaw as UserStage;
  const verificationType = verificationTypeRaw as VerificationType;

  if (!ackRights || !ackRedacted || !ackAuthentic) {
    return {
      error:
        "Vui lòng xác nhận cả ba điều kiện về quyền upload, che thông tin nhạy cảm và tính xác thực của tài liệu.",
      message: null,
    };
  }

  const files = formData.getAll("evidence_files").filter(
    (f): f is File => typeof f === "object" && f !== null && "size" in f
  );
  // Browsers append an empty File even when the field is left blank;
  // filter those out before counting / validating.
  const realFiles = files.filter((f) => f.size > 0);
  if (realFiles.length === 0) {
    return {
      error: "Vui lòng đính kèm ít nhất một tệp bằng chứng (PDF/JPG/PNG).",
      message: null,
    };
  }
  if (realFiles.length > VERIFICATION_FILES_MAX_COUNT) {
    return {
      error: `Tối đa ${VERIFICATION_FILES_MAX_COUNT} tệp cho mỗi yêu cầu.`,
      message: null,
    };
  }
  for (const f of realFiles) {
    if (f.size > VERIFICATION_FILE_MAX_BYTES) {
      return {
        error: `Mỗi tệp tối đa 5 MB. Tệp "${f.name}" vượt quá giới hạn.`,
        message: null,
      };
    }
    if (
      !(VERIFICATION_ALLOWED_MIME as ReadonlyArray<string>).includes(f.type) &&
      !fileExtensionAllowed(f.name)
    ) {
      return {
        error: `Chỉ chấp nhận PDF, JPG, PNG. Tệp "${f.name}" không hợp lệ.`,
        message: null,
      };
    }
  }

  const verificationId = randomUUID();
  const admin = createSupabaseAdminClient();

  // 1. Upload files into the private bucket. Service role bypasses
  //    storage RLS, but the path layout we write still matches the
  //    user-scoped `Users can upload own verification evidence` policy
  //    so the user can also overwrite/delete their own evidence
  //    through normal RLS later if needed.
  const evidenceFilePaths: string[] = [];
  for (let i = 0; i < realFiles.length; i++) {
    const f = realFiles[i];
    const filename = `${i + 1}-${randomUUID()}-${sanitizeFilename(f.name)}`;
    const path = buildEvidencePath({
      userId: profile.id,
      verificationId,
      filename,
    });
    const buf = Buffer.from(await f.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(VERIFICATION_BUCKET)
      .upload(path, buf, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      // Best-effort cleanup: remove anything we already uploaded so we
      // don't leave dangling objects when the row never lands.
      if (evidenceFilePaths.length) {
        await admin.storage.from(VERIFICATION_BUCKET).remove(evidenceFilePaths);
      }
      return {
        error: `Không thể upload tệp "${f.name}": ${uploadError.message}`,
        message: null,
      };
    }
    evidenceFilePaths.push(path);
  }

  // 2. Insert the user_verifications row. We use the admin client so
  //    we control the row id (binding it to the storage path) — the
  //    BEFORE INSERT trigger from 0003 still clamps moderation
  //    columns for non-admins regardless of which client inserts,
  //    BUT since we run with no JWT (auth.uid() is null) the trigger
  //    short-circuits. Therefore we explicitly pass the safe-default
  //    values ourselves.
  const { error: insertError } = await admin.from("user_verifications").insert({
    id: verificationId,
    user_id: profile.id,
    requested_stage: requestedStage,
    verification_type: verificationType,
    evidence_summary: notes || null,
    evidence_file_paths: evidenceFilePaths,
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    expires_at: null,
    rejection_reason: null,
    admin_note: null,
  });
  if (insertError) {
    await admin.storage.from(VERIFICATION_BUCKET).remove(evidenceFilePaths);
    return { error: insertError.message, message: null };
  }

  // 3. Audit log: user-initiated submission.
  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "user_verification_submitted",
    targetType: "user_verification",
    targetId: verificationId,
    afterData: {
      requested_stage: requestedStage,
      verification_type: verificationType,
      file_count: evidenceFilePaths.length,
    },
    reason: notes || null,
  });

  revalidatePath("/dashboard/verification");
  revalidatePath("/admin/verifications");

  return {
    error: null,
    message: "Yêu cầu xác minh đã được gửi. Bạn sẽ nhận được kết quả khi quản trị viên duyệt xong.",
  };
}

/**
 * Updates the user's `self_declared_stage` (NOT the verified stage).
 * Self-declared is freely editable; the dashboard exposes this so users
 * can correct themselves between verification attempts.
 */
export async function updateSelfDeclaredStageAction(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const stage = String(formData.get("self_declared_stage") ?? "");
  if (!(USER_STAGES as ReadonlyArray<string>).includes(stage)) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ self_declared_stage: stage as UserStage })
    .eq("id", profile.id);
  if (error) {
    console.error("[updateSelfDeclaredStage]", error);
    return;
  }

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "self_declared_stage_changed",
    targetType: "profile",
    targetId: profile.id,
    changedFields: ["self_declared_stage"],
    beforeData: { self_declared_stage: profile.self_declared_stage },
    afterData: { self_declared_stage: stage },
  });

  revalidatePath("/dashboard/verification");
  revalidatePath("/dashboard");
}
