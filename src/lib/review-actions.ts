"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "./supabase/admin";
import { writeAuditLog, actorTypeForRole } from "./supabase/audit";
import { getCurrentProfile } from "./supabase/server";
import { USER_STAGES, type UserStage } from "./verification";
import {
  REVIEW_PROOF_ALLOWED_EXTENSIONS,
  REVIEW_PROOF_ALLOWED_MIME,
  REVIEW_PROOF_BUCKET,
  REVIEW_PROOF_FILES_MAX_COUNT,
  REVIEW_PROOF_FILE_MAX_BYTES,
  REVIEW_RELATIONSHIPS,
  REVIEW_TYPES,
  buildReviewProofPath,
  canSubmitReviewType,
  isRelationshipAllowedFor,
  type ReviewRelationship,
  type ReviewType,
} from "./reviews";

export type SubmitReviewState = {
  error: string | null;
  message: string | null;
};

function sanitizeFilename(name: string): string {
  const base = name.split("/").pop() ?? "proof";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "proof";
}

function fileExtensionAllowed(name: string): boolean {
  const lower = name.toLowerCase();
  return REVIEW_PROOF_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Server action: submit a verified review.
 *
 * Always re-checks eligibility on the server before inserting:
 *   1. User must be authenticated.
 *   2. User must have a non-null `verified_stage` whose value
 *      satisfies REVIEW_TYPE_ELIGIBLE_STAGES[review_type].
 *   3. Submitted relationship_to_target must be one the user's
 *      verified_stage can legitimately claim.
 *   4. Target organization must exist, be published, and not suspended.
 *
 * The review is inserted via the service-role admin client so we
 * control the row id (used to bind storage paths). Per the
 * `reviews_prevent_privilege_escalation` trigger in 0003, when no JWT
 * is attached (auth.uid() is null) the trigger short-circuits, so we
 * explicitly pass the safe defaults — moderation_status='pending',
 * published_at/rejected_reason/dispute_status null — ourselves.
 */
export async function submitReviewAction(
  _prev: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Bạn cần đăng nhập để gửi đánh giá.", message: null };
  }

  const organizationId = String(formData.get("organization_id") ?? "").trim();
  const reviewTypeRaw = String(formData.get("review_type") ?? "");
  const relationshipRaw = String(
    formData.get("relationship_to_target") ?? ""
  );
  const ratingRaw = String(formData.get("rating") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);

  if (!organizationId) {
    return { error: "Thiếu tổ chức được đánh giá.", message: null };
  }
  if (!(REVIEW_TYPES as ReadonlyArray<string>).includes(reviewTypeRaw)) {
    return { error: "Loại đánh giá không hợp lệ.", message: null };
  }
  if (
    !(REVIEW_RELATIONSHIPS as ReadonlyArray<string>).includes(relationshipRaw)
  ) {
    return { error: "Mối quan hệ với đối tượng không hợp lệ.", message: null };
  }
  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { error: "Số sao phải từ 1 đến 5.", message: null };
  }
  if (content.length < 30) {
    return {
      error: "Nội dung đánh giá phải có ít nhất 30 ký tự.",
      message: null,
    };
  }

  const reviewType = reviewTypeRaw as ReviewType;
  const relationship = relationshipRaw as ReviewRelationship;

  // ---- Eligibility gate (server-authoritative) ----
  const verifiedStage = profile.verified_stage as UserStage | null;
  if (
    !verifiedStage ||
    !(USER_STAGES as ReadonlyArray<string>).includes(verifiedStage)
  ) {
    return {
      error:
        "Bạn cần được xác minh trạng thái trước khi đánh giá. Vào Dashboard → Xác minh trạng thái.",
      message: null,
    };
  }
  if (!canSubmitReviewType(verifiedStage, reviewType)) {
    return {
      error:
        "Trạng thái đã xác minh của bạn không đủ điều kiện cho loại đánh giá này.",
      message: null,
    };
  }
  if (!isRelationshipAllowedFor(verifiedStage, relationship)) {
    return {
      error:
        "Mối quan hệ bạn khai báo không khớp với trạng thái đã xác minh.",
      message: null,
    };
  }

  // ---- Target organization must exist, be published, not suspended ----
  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, org_type, slug, is_published, is_suspended")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) {
    return { error: "Tổ chức không tồn tại.", message: null };
  }
  if (org.is_suspended) {
    return {
      error: "Tổ chức này đang bị tạm ẩn — không thể nhận đánh giá mới.",
      message: null,
    };
  }

  // ---- Validate optional proof files ----
  const files = formData
    .getAll("proof_files")
    .filter(
      (f): f is File => typeof f === "object" && f !== null && "size" in f
    );
  const realFiles = files.filter((f) => f.size > 0);
  if (realFiles.length > REVIEW_PROOF_FILES_MAX_COUNT) {
    return {
      error: `Tối đa ${REVIEW_PROOF_FILES_MAX_COUNT} tệp bằng chứng cho mỗi đánh giá.`,
      message: null,
    };
  }
  for (const f of realFiles) {
    if (f.size > REVIEW_PROOF_FILE_MAX_BYTES) {
      return {
        error: `Mỗi tệp tối đa 5 MB. Tệp "${f.name}" vượt quá giới hạn.`,
        message: null,
      };
    }
    if (
      !(REVIEW_PROOF_ALLOWED_MIME as ReadonlyArray<string>).includes(f.type) &&
      !fileExtensionAllowed(f.name)
    ) {
      return {
        error: `Chỉ chấp nhận PDF, JPG, PNG. Tệp "${f.name}" không hợp lệ.`,
        message: null,
      };
    }
  }

  const reviewId = randomUUID();

  // ---- Upload proof files (best-effort cleanup on failure) ----
  const proofPaths: string[] = [];
  for (let i = 0; i < realFiles.length; i++) {
    const f = realFiles[i];
    const filename = `${i + 1}-${randomUUID()}-${sanitizeFilename(f.name)}`;
    const path = buildReviewProofPath({
      userId: profile.id,
      reviewId,
      filename,
    });
    const buf = Buffer.from(await f.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(REVIEW_PROOF_BUCKET)
      .upload(path, buf, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      if (proofPaths.length) {
        await admin.storage.from(REVIEW_PROOF_BUCKET).remove(proofPaths);
      }
      return {
        error: `Không thể upload tệp "${f.name}": ${uploadError.message}`,
        message: null,
      };
    }
    proofPaths.push(path);
  }

  // ---- Insert the review row in `pending` state ----
  const { error: insertError } = await admin.from("reviews").insert({
    id: reviewId,
    reviewer_id: profile.id,
    target_type: "organization",
    target_id: organizationId,
    review_type: reviewType,
    relationship_to_target: relationship,
    rating,
    title: title || null,
    content,
    proof_status: proofPaths.length > 0 ? "submitted" : "not_submitted",
    proof_file_paths: proofPaths.length > 0 ? proofPaths : null,
    moderation_status: "pending",
    published_at: null,
    rejected_reason: null,
    dispute_status: null,
  });
  if (insertError) {
    if (proofPaths.length) {
      await admin.storage.from(REVIEW_PROOF_BUCKET).remove(proofPaths);
    }
    console.error("[submitReview] insert", insertError);
    return { error: "Không thể lưu đánh giá. Vui lòng thử lại.", message: null };
  }

  // ---- Mirror per-file proof rows for granular moderation ----
  if (proofPaths.length > 0) {
    const proofRows = proofPaths.map((path) => ({
      review_id: reviewId,
      uploaded_by: profile.id,
      proof_type: "other" as const,
      file_path: path,
      status: "pending" as const,
    }));
    const { error: proofInsertError } = await admin
      .from("review_proofs")
      .insert(proofRows);
    if (proofInsertError) {
      console.error("[submitReview] review_proofs insert", proofInsertError);
      // Non-fatal: the file paths are already on reviews.proof_file_paths.
    }
  }

  // ---- Audit log: user-initiated submission ----
  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "review_submitted",
    targetType: "review",
    targetId: reviewId,
    afterData: {
      target_type: "organization",
      target_id: organizationId,
      review_type: reviewType,
      relationship_to_target: relationship,
      rating,
      proof_count: proofPaths.length,
    },
  });

  if (proofPaths.length > 0) {
    await writeAuditLog({
      actorId: profile.id,
      actorType: actorTypeForRole(profile.role),
      action: "review_proof_uploaded",
      targetType: "review_proof",
      targetId: reviewId,
      afterData: { count: proofPaths.length },
    });
  }

  if (org.slug) {
    revalidatePath(`/centers/${org.slug}`);
    revalidatePath(`/companies/${org.slug}`);
  }
  revalidatePath("/admin/reviews");

  return {
    error: null,
    message:
      "Đánh giá đã được gửi và đang chờ duyệt. Đánh giá chỉ hiển thị công khai sau khi quản trị viên phê duyệt.",
  };
}
