"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "./supabase/admin";
import { writeAuditLog, actorTypeForRole } from "./supabase/audit";
import { getCurrentProfile } from "./supabase/server";
import {
  DISPUTE_DESCRIPTION_MAX_LEN,
  DISPUTE_EVIDENCE_ALLOWED_EXTENSIONS,
  DISPUTE_EVIDENCE_ALLOWED_MIME,
  DISPUTE_EVIDENCE_BUCKET,
  DISPUTE_EVIDENCE_FILES_MAX_COUNT,
  DISPUTE_EVIDENCE_FILE_MAX_BYTES,
  buildDisputeEvidencePath,
  isDisputeTargetType,
  isDisputeType,
  type DisputeTargetType,
  type DisputeType,
} from "./disputes";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export type SubmitDisputeState = {
  error: string | null;
  message: string | null;
  disputeId?: string | null;
};

function sanitizeFilename(name: string): string {
  const base = name.split("/").pop() ?? "evidence";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "evidence";
}

function fileExtensionAllowed(name: string): boolean {
  const lower = name.toLowerCase();
  return DISPUTE_EVIDENCE_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Server action: open a new dispute case.
 *
 * Always re-checks on the server before inserting:
 *   1. User must be authenticated.
 *   2. target_type must be one of the 6 supported surfaces.
 *   3. target_id must be a UUID.
 *   4. dispute_type (reason) must match the spec allow-list.
 *   5. description (summary) must be present and within length limits.
 *   6. Evidence files must not exceed count/size/mime limits and are
 *      uploaded to the private `dispute-evidence-private` bucket
 *      under `user/<auth.uid()>/dispute/<dispute_id>/<filename>` so
 *      the RLS policies from 0009 enforce per-user isolation.
 *
 * The dispute_cases row is inserted via the service-role admin client
 * so we control the row id (used as the storage prefix) and the
 * status/assigned_to/resolution/resolved_by/resolved_at fields. Per
 * the `dispute_cases_prevent_privilege_escalation` trigger in 0003,
 * when no JWT is attached (auth.uid() is null) the trigger
 * short-circuits, so we explicitly pass safe defaults — status='open',
 * everything else null — ourselves.
 */
export async function submitDisputeAction(
  _prev: SubmitDisputeState,
  formData: FormData
): Promise<SubmitDisputeState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      error: "Bạn cần đăng nhập để mở khiếu nại.",
      message: null,
    };
  }

  // ---- Parse + validate inputs ----
  const targetType = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!isDisputeTargetType(targetType)) {
    return { error: "Loại đối tượng khiếu nại không hợp lệ.", message: null };
  }
  if (!UUID_RE.test(targetId)) {
    return { error: "ID đối tượng khiếu nại không hợp lệ.", message: null };
  }
  if (!isDisputeType(reason)) {
    return { error: "Lý do khiếu nại không hợp lệ.", message: null };
  }
  if (description.length === 0) {
    return { error: "Vui lòng mô tả khiếu nại của bạn.", message: null };
  }
  if (description.length > DISPUTE_DESCRIPTION_MAX_LEN) {
    return {
      error: `Mô tả tối đa ${DISPUTE_DESCRIPTION_MAX_LEN} ký tự.`,
      message: null,
    };
  }

  // ---- Validate optional evidence files ----
  const files = formData
    .getAll("evidence_files")
    .filter(
      (f): f is File => typeof f === "object" && f !== null && "size" in f
    );
  const realFiles = files.filter((f) => f.size > 0);
  if (realFiles.length > DISPUTE_EVIDENCE_FILES_MAX_COUNT) {
    return {
      error: `Tối đa ${DISPUTE_EVIDENCE_FILES_MAX_COUNT} tệp bằng chứng cho mỗi khiếu nại.`,
      message: null,
    };
  }
  for (const f of realFiles) {
    if (f.size > DISPUTE_EVIDENCE_FILE_MAX_BYTES) {
      return {
        error: `Mỗi tệp tối đa 10 MB. Tệp "${f.name}" vượt quá giới hạn.`,
        message: null,
      };
    }
    if (
      !(DISPUTE_EVIDENCE_ALLOWED_MIME as ReadonlyArray<string>).includes(
        f.type
      ) &&
      !fileExtensionAllowed(f.name)
    ) {
      return {
        error: `Chỉ chấp nhận PDF, JPG, PNG, WEBP. Tệp "${f.name}" không hợp lệ.`,
        message: null,
      };
    }
  }

  const admin = createSupabaseAdminClient();
  const disputeId = randomUUID();

  // ---- Upload evidence files (best-effort cleanup on failure) ----
  const evidencePaths: string[] = [];
  for (let i = 0; i < realFiles.length; i++) {
    const f = realFiles[i];
    const filename = `${i + 1}-${randomUUID()}-${sanitizeFilename(f.name)}`;
    const path = buildDisputeEvidencePath({
      userId: profile.id,
      disputeId,
      filename,
    });
    const buf = Buffer.from(await f.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(DISPUTE_EVIDENCE_BUCKET)
      .upload(path, buf, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      if (evidencePaths.length) {
        await admin.storage
          .from(DISPUTE_EVIDENCE_BUCKET)
          .remove(evidencePaths);
      }
      return {
        error: `Không thể upload tệp "${f.name}": ${uploadError.message}`,
        message: null,
      };
    }
    evidencePaths.push(path);
  }

  // ---- Insert the dispute_cases row ----
  // Pin all admin-only fields to safe defaults — the privilege-
  // escalation trigger in 0003 cannot help here because we are using
  // the service-role client (auth.uid() is null inside the trigger).
  const summaryShort = description.slice(0, 200);
  const { error: insertError } = await admin.from("dispute_cases").insert({
    id: disputeId,
    opened_by: profile.id,
    target_type: targetType as DisputeTargetType,
    target_id: targetId,
    dispute_type: reason as DisputeType,
    summary: summaryShort, // NOT NULL constraint
    evidence_file_paths: evidencePaths.length > 0 ? evidencePaths : null,
    status: "open",
    assigned_to: null,
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    internal_note: null,
  });

  if (insertError) {
    if (evidencePaths.length) {
      await admin.storage
        .from(DISPUTE_EVIDENCE_BUCKET)
        .remove(evidencePaths);
    }
    console.error("[submitDispute] insert", insertError);
    return {
      error: "Không thể lưu khiếu nại. Vui lòng thử lại.",
      message: null,
    };
  }

  // ---- Audit log: dispute opened ----
  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "dispute_opened",
    targetType: "dispute_case",
    targetId: disputeId,
    changedFields: ["status"],
    afterData: {
      target_type: targetType,
      target_id: targetId,
      dispute_type: reason,
      status: "open",
      evidence_count: evidencePaths.length,
    },
    reason: description,
  });

  // ---- Audit log: evidence uploaded (one event per upload batch) ----
  if (evidencePaths.length > 0) {
    await writeAuditLog({
      actorId: profile.id,
      actorType: actorTypeForRole(profile.role),
      action: "dispute_evidence_uploaded",
      targetType: "dispute_case",
      targetId: disputeId,
      changedFields: ["evidence_file_paths"],
      afterData: { count: evidencePaths.length },
      reason: null,
    });
  }

  revalidatePath("/disputes/mine");
  revalidatePath("/admin/disputes");

  return {
    error: null,
    message: "Khiếu nại của bạn đã được ghi nhận và sẽ được xem xét.",
    disputeId,
  };
}
