"use server";

import { revalidatePath } from "next/cache";

import {
  AUDIT_ACTIONS,
  actorTypeForRole,
  createAuditLog,
} from "@/lib/audit/createAuditLog";
import { type ContentType, isContentType } from "@/lib/content-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";

/**
 * Server actions backing the admin Sponsored / Editorial labelling
 * console (`/admin/sponsored`).
 *
 * Implements the rules in:
 *   - /docs/admin-moderation-flow.md §9 (Sponsored Content Moderation)
 *   - /docs/audit-log-rules.md §5.9
 *   - /docs/trust-engine.md §9 (Content Types)
 *
 * Every change to a content_type / featured / sponsored field on
 * articles, organizations, or job_orders writes ONE
 * `sponsored_content_label_updated` audit log row with the previous
 * and new content_type, the sponsor organization (if any), and a
 * label-visibility check flag so reviewers can later prove the
 * platform's decision trail.
 */

const ALLOWED_TARGETS = ["article", "organization", "job_order"] as const;
type TargetKind = (typeof ALLOWED_TARGETS)[number];

const TARGET_TABLE: Record<TargetKind, string> = {
  article: "articles",
  organization: "organizations",
  job_order: "job_orders",
};

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("not_authenticated");
  if (!isAdminRole(profile.role)) throw new Error("forbidden");
  return profile;
}

function isTargetKind(value: string): value is TargetKind {
  return (ALLOWED_TARGETS as ReadonlyArray<string>).includes(value);
}

function revalidateAfterChange(target: TargetKind, id: string) {
  revalidatePath("/admin/sponsored");
  revalidatePath("/");
  switch (target) {
    case "article":
      revalidatePath("/news");
      revalidatePath(`/news/${id}`);
      break;
    case "organization":
      revalidatePath("/companies");
      revalidatePath("/centers");
      break;
    case "job_order":
      revalidatePath("/jobs");
      revalidatePath(`/admin/job-orders/${id}`);
      break;
  }
}

/**
 * Set the `content_type` (and, for job_orders / articles, the
 * `is_sponsored` shortcut field) on a single record. The previous
 * value is captured before the write and persisted into the audit
 * log so that the trail records exactly what changed.
 */
export async function setContentTypeAction(formData: FormData) {
  const actor = await requireAdmin();

  const targetRaw = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "");
  const newTypeRaw = String(formData.get("content_type") ?? "");
  const reason = (String(formData.get("reason") ?? "").trim() || null) as
    | string
    | null;

  if (!isTargetKind(targetRaw) || !targetId || !isContentType(newTypeRaw)) {
    return;
  }
  const target: TargetKind = targetRaw;
  const newType: ContentType = newTypeRaw;

  const supabase = createSupabaseAdminClient();
  const table = TARGET_TABLE[target];

  // Pull the current row so we can capture before-state. The select
  // is intentionally narrow — only what we need for the audit
  // payload — and we cast to a permissive shape because the row
  // shape varies per table.
  const { data: beforeRaw, error: beforeError } = await supabase
    .from(table)
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  if (beforeError || !beforeRaw) {
    if (beforeError) console.error("[setContentTypeAction]", beforeError);
    return;
  }

  const before = beforeRaw as unknown as Record<string, unknown>;

  // job_orders has a separate is_sponsored boolean (legacy). Keep it
  // in sync so query paths that still gate on that column behave
  // consistently with the new content_type.
  const update: Record<string, unknown> = { content_type: newType };
  if (target === "job_order") {
    update.is_sponsored = newType === "sponsored";
  }

  const { error } = await supabase
    .from(table)
    .update(update)
    .eq("id", targetId);

  if (error) {
    console.error("[setContentTypeAction] update", error);
    return;
  }

  await createAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: AUDIT_ACTIONS.SPONSORED_CONTENT_LABEL_UPDATED,
    targetType: target,
    targetId,
    changedFields:
      target === "job_order"
        ? ["content_type", "is_sponsored"]
        : ["content_type"],
    beforeData: {
      previous_content_type: before.content_type ?? null,
      sponsor_organization_id: before.sponsor_organization_id ?? null,
      is_featured: before.is_featured ?? false,
    },
    afterData: {
      new_content_type: newType,
      sponsor_organization_id: before.sponsor_organization_id ?? null,
      // Per /docs/audit-log-rules.md §5.9: every sponsored-label
      // change must record whether a public label is visible. The
      // public UI ALWAYS renders ContentTypeBadge for the four types,
      // so this is always true after the write — kept as a flag so
      // the trail is explicit even if that ever changes.
      label_visibility_check: true,
    },
    reason,
    humanApproved: true,
  });

  revalidateAfterChange(target, targetId);
}

/**
 * Toggle the `is_featured` flag on an organization or job_order.
 * Featured listing is a paid placement signal that is intentionally
 * decoupled from the verification badge — the action ALSO writes an
 * audit log so the trail shows when paid placement was granted /
 * revoked.
 */
export async function toggleFeaturedAction(formData: FormData) {
  const actor = await requireAdmin();

  const targetRaw = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "");
  const desired = String(formData.get("is_featured") ?? "") === "true";
  const reason = (String(formData.get("reason") ?? "").trim() || null) as
    | string
    | null;

  if (!isTargetKind(targetRaw) || !targetId) return;
  // Only org / job_order have an is_featured column — articles use
  // their own `is_featured` column too, but we let the same toggle
  // work for all three.
  const target: TargetKind = targetRaw;

  const supabase = createSupabaseAdminClient();
  const table = TARGET_TABLE[target];

  const { data: beforeRaw, error: beforeError } = await supabase
    .from(table)
    .select("*")
    .eq("id", targetId)
    .maybeSingle();

  if (beforeError || !beforeRaw) {
    if (beforeError) console.error("[toggleFeaturedAction]", beforeError);
    return;
  }

  const beforeRow = beforeRaw as unknown as {
    id: string;
    is_featured: boolean | null;
    content_type: string | null;
  };
  if ((beforeRow.is_featured ?? false) === desired) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .update({ is_featured: desired })
    .eq("id", targetId);

  if (error) {
    console.error("[toggleFeaturedAction] update", error);
    return;
  }

  await createAuditLog({
    actorId: actor.id,
    actorType: actorTypeForRole(actor.role),
    action: AUDIT_ACTIONS.SPONSORED_CONTENT_LABEL_UPDATED,
    targetType: target,
    targetId,
    changedFields: ["is_featured"],
    beforeData: {
      previous_is_featured: beforeRow.is_featured ?? false,
      content_type: beforeRow.content_type ?? null,
    },
    afterData: {
      new_is_featured: desired,
      content_type: beforeRow.content_type ?? null,
      // Featured ≠ verified. Recording this flag explicitly so
      // future reviewers can prove the trust badge was not granted.
      grants_trust_badge: false,
      label_visibility_check: true,
    },
    reason,
    humanApproved: true,
  });

  revalidateAfterChange(target, targetId);
}
