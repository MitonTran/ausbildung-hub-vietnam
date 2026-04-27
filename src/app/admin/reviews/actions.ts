"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole, STAFF_ROLES, type UserRole } from "@/lib/supabase/types";
import type { ReviewRow } from "@/lib/reviews";

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

async function loadReview(id: string): Promise<ReviewRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("reviews")
    .select(
      "id, reviewer_id, target_type, target_id, review_type, relationship_to_target, rating, title, content, proof_status, proof_file_paths, moderation_status, published_at, rejected_reason, right_to_reply, reply_by, reply_at, dispute_status, created_at, updated_at, deleted_at"
    )
    .eq("id", id)
    .maybeSingle();
  return (data as ReviewRow | null) ?? null;
}

async function loadOrgSlug(orgId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .maybeSingle();
  return ((data as { slug: string | null } | null)?.slug) ?? null;
}

function revalidateReviewViews(reviewId: string, orgSlug: string | null) {
  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/reviews/${reviewId}`);
  if (orgSlug) {
    revalidatePath(`/centers/${orgSlug}`);
    revalidatePath(`/companies/${orgSlug}`);
  }
}

/**
 * Approve & publish a pending review.
 *
 * Only `pending` / `approved` / `need_more_info` rows can be promoted
 * to published — re-publishing a previously rejected/hidden/removed
 * review must go through an explicit moderator decision (it would
 * resurrect content the moderation team had taken down).
 */
export async function approveReviewAction(formData: FormData) {
  const actor = await requireModeratorOrAdmin();
  const id = String(formData.get("review_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id) return;

  const review = await loadReview(id);
  if (!review) return;
  if (
    review.moderation_status !== "pending" &&
    review.moderation_status !== "approved" &&
    review.moderation_status !== "need_more_info"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const publishedAt = new Date().toISOString();
  const { data: updatedRows, error } = await supabase
    .from("reviews")
    .update({
      moderation_status: "published",
      published_at: publishedAt,
      rejected_reason: null,
    })
    .eq("id", id)
    .eq("moderation_status", review.moderation_status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[approveReview]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "review_published",
    targetType: "review",
    targetId: id,
    changedFields: ["moderation_status", "published_at"],
    beforeData: {
      moderation_status: review.moderation_status,
      published_at: review.published_at,
    },
    afterData: { moderation_status: "published", published_at: publishedAt },
    reason,
    humanApproved: true,
  });

  const slug = await loadOrgSlug(review.target_id);
  revalidateReviewViews(id, slug);
}

/**
 * Reject a review. The reason is mandatory and surfaced to the user.
 */
export async function rejectReviewAction(formData: FormData) {
  const actor = await requireModeratorOrAdmin();
  const id = String(formData.get("review_id") ?? "");
  const reason =
    String(formData.get("rejected_reason") ?? "").trim() || null;
  if (!id || !reason) return;

  const review = await loadReview(id);
  if (!review) return;
  if (
    review.moderation_status !== "pending" &&
    review.moderation_status !== "need_more_info" &&
    review.moderation_status !== "approved"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("reviews")
    .update({
      moderation_status: "rejected",
      rejected_reason: reason,
      published_at: null,
    })
    .eq("id", id)
    .eq("moderation_status", review.moderation_status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[rejectReview]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "review_rejected",
    targetType: "review",
    targetId: id,
    changedFields: ["moderation_status", "rejected_reason"],
    beforeData: {
      moderation_status: review.moderation_status,
      rejected_reason: review.rejected_reason,
    },
    afterData: { moderation_status: "rejected", rejected_reason: reason },
    reason,
    humanApproved: true,
  });

  const slug = await loadOrgSlug(review.target_id);
  revalidateReviewViews(id, slug);
}

/**
 * Move a review to `need_more_info` and surface the admin's request
 * to the user. The user can then upload extra proof and resubmit.
 */
export async function requestReviewProofAction(formData: FormData) {
  const actor = await requireModeratorOrAdmin();
  const id = String(formData.get("review_id") ?? "");
  const note = String(formData.get("admin_note") ?? "").trim() || null;
  if (!id || !note) return;

  const review = await loadReview(id);
  if (!review) return;
  if (
    review.moderation_status !== "pending" &&
    review.moderation_status !== "approved"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: updatedRows, error } = await supabase
    .from("reviews")
    .update({
      moderation_status: "need_more_info",
      rejected_reason: note,
    })
    .eq("id", id)
    .eq("moderation_status", review.moderation_status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[requestReviewProof]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "review_more_info_requested",
    targetType: "review",
    targetId: id,
    changedFields: ["moderation_status", "rejected_reason"],
    beforeData: {
      moderation_status: review.moderation_status,
      rejected_reason: review.rejected_reason,
    },
    afterData: {
      moderation_status: "need_more_info",
      rejected_reason: note,
    },
    reason: note,
    humanApproved: true,
  });

  const slug = await loadOrgSlug(review.target_id);
  revalidateReviewViews(id, slug);
}

/**
 * Redact-and-publish: rewrite the review content (e.g. to remove
 * doxxing or PII) and publish the redacted version. Records both
 * the previous and redacted content in the audit log so the change is
 * fully traceable.
 */
export async function redactAndPublishReviewAction(formData: FormData) {
  const actor = await requireModeratorOrAdmin();
  const id = String(formData.get("review_id") ?? "");
  const redacted = String(formData.get("redacted_content") ?? "")
    .trim()
    .slice(0, 5000);
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!id || redacted.length < 30) return;

  const review = await loadReview(id);
  if (!review) return;
  if (
    review.moderation_status !== "pending" &&
    review.moderation_status !== "approved" &&
    review.moderation_status !== "need_more_info" &&
    review.moderation_status !== "published"
  ) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const publishedAt =
    review.published_at ?? new Date().toISOString();
  const { data: updatedRows, error } = await supabase
    .from("reviews")
    .update({
      content: redacted,
      moderation_status: "published",
      published_at: publishedAt,
      rejected_reason: null,
    })
    .eq("id", id)
    .eq("moderation_status", review.moderation_status)
    .select("id");
  if (error || !updatedRows || updatedRows.length === 0) {
    if (error) console.error("[redactAndPublishReview]", error);
    return;
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "review_redacted",
    targetType: "review",
    targetId: id,
    changedFields: ["content", "moderation_status", "published_at"],
    beforeData: {
      content: review.content,
      moderation_status: review.moderation_status,
      published_at: review.published_at,
    },
    afterData: {
      content: redacted,
      moderation_status: "published",
      published_at: publishedAt,
    },
    reason,
    humanApproved: true,
  });

  const slug = await loadOrgSlug(review.target_id);
  revalidateReviewViews(id, slug);
}

/**
 * Escalate the review to a formal dispute case. Sets the review's
 * dispute_status='open' and moderation_status='under_dispute', and
 * opens a dispute_cases row pointing at the review. Admin only.
 */
export async function escalateReviewToDisputeAction(formData: FormData) {
  const actor = await requireAdmin();
  const id = String(formData.get("review_id") ?? "");
  const summary =
    String(formData.get("summary") ?? "").trim().slice(0, 5000) || "";
  if (!id || summary.length < 10) return;

  const review = await loadReview(id);
  if (!review) return;
  if (review.moderation_status === "removed") return;

  const supabase = createSupabaseAdminClient();
  const { data: updatedRows, error: updateError } = await supabase
    .from("reviews")
    .update({
      moderation_status: "under_dispute",
      dispute_status: "open",
    })
    .eq("id", id)
    .eq("moderation_status", review.moderation_status)
    .select("id");
  if (updateError || !updatedRows || updatedRows.length === 0) {
    if (updateError) console.error("[escalateReview] update", updateError);
    return;
  }

  const { data: disputeRow, error: disputeError } = await supabase
    .from("dispute_cases")
    .insert({
      opened_by: actor.id,
      target_type: "review",
      target_id: id,
      dispute_type: "review_escalation",
      summary,
      status: "open",
      assigned_to: actor.id,
    })
    .select("id")
    .maybeSingle();
  if (disputeError) {
    console.error("[escalateReview] dispute insert", disputeError);
  }

  await writeAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: "review_under_dispute",
    targetType: "review",
    targetId: id,
    changedFields: ["moderation_status", "dispute_status"],
    beforeData: {
      moderation_status: review.moderation_status,
      dispute_status: review.dispute_status,
    },
    afterData: {
      moderation_status: "under_dispute",
      dispute_status: "open",
      dispute_case_id: disputeRow?.id ?? null,
    },
    reason: summary,
    humanApproved: true,
  });

  const slug = await loadOrgSlug(review.target_id);
  revalidateReviewViews(id, slug);
}
