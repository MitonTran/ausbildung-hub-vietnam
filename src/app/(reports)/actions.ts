"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  REPORT_DESCRIPTION_MAX_LEN,
  REPORT_EVIDENCE_MAX_COUNT,
  REPORT_EVIDENCE_URL_MAX_LEN,
  defaultSeverityForReason,
  isReportReason,
  isReportTargetType,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/reports";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export type SubmitReportResult =
  | { ok: true; id: string }
  | { ok: false; error: ReportSubmissionError };

export type ReportSubmissionError =
  | "not_authenticated"
  | "invalid_target_type"
  | "invalid_target_id"
  | "invalid_reason"
  | "description_too_long"
  | "too_many_evidence_urls"
  | "evidence_url_too_long"
  | "rate_limited"
  | "internal_error";

/**
 * Submit a report flag against a public reportable target.
 *
 * Authenticated users only — anonymous submissions are intentionally
 * not allowed (see acceptance criteria). The DB row is written by the
 * service-role client, but the reporter_id is always pinned to the
 * authenticated caller's profile id, so a user cannot impersonate
 * another reporter.
 */
export async function submitReportAction(
  formData: FormData
): Promise<SubmitReportResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, error: "not_authenticated" };
  }

  const targetType = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const evidenceRaw = formData.getAll("evidence_url");

  if (!isReportTargetType(targetType)) {
    return { ok: false, error: "invalid_target_type" };
  }
  if (!UUID_RE.test(targetId)) {
    return { ok: false, error: "invalid_target_id" };
  }
  if (!isReportReason(reason)) {
    return { ok: false, error: "invalid_reason" };
  }
  if (description.length > REPORT_DESCRIPTION_MAX_LEN) {
    return { ok: false, error: "description_too_long" };
  }

  const evidenceUrls = evidenceRaw
    .map((v) => String(v ?? "").trim())
    .filter((v) => v.length > 0);
  if (evidenceUrls.length > REPORT_EVIDENCE_MAX_COUNT) {
    return { ok: false, error: "too_many_evidence_urls" };
  }
  for (const url of evidenceUrls) {
    if (url.length > REPORT_EVIDENCE_URL_MAX_LEN) {
      return { ok: false, error: "evidence_url_too_long" };
    }
  }

  const supabase = createSupabaseAdminClient();

  // Spam protection: a single reporter cannot file more than one
  // report on the same target with the same reason within 24h. This
  // covers the "anonymous/public users cannot spam reports" acceptance
  // criterion together with the auth-required check above. Admins
  // are exempt so they can stress-test the queue.
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dupes, error: dupErr } = await supabase
      .from("report_flags")
      .select("id")
      .eq("reporter_id", profile.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("reason", reason)
      .gte("created_at", since)
      .limit(1);
    if (dupErr) {
      console.error("[submitReport] dedupe lookup failed", dupErr);
      return { ok: false, error: "internal_error" };
    }
    if (dupes && dupes.length > 0) {
      return { ok: false, error: "rate_limited" };
    }
  }

  const severity = defaultSeverityForReason(reason as ReportReason);

  const { data: inserted, error: insertErr } = await supabase
    .from("report_flags")
    .insert({
      reporter_id: profile.id,
      target_type: targetType as ReportTargetType,
      target_id: targetId,
      reason,
      description: description.length > 0 ? description : null,
      evidence_file_paths: evidenceUrls.length > 0 ? evidenceUrls : null,
      severity,
      status: "open",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[submitReport] insert failed", insertErr);
    return { ok: false, error: "internal_error" };
  }

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "report_created",
    targetType: "report_flag",
    targetId: inserted.id,
    changedFields: ["status"],
    afterData: {
      target_type: targetType,
      target_id: targetId,
      reason,
      severity,
      status: "open",
    },
    reason: null,
  });

  revalidatePath("/admin/reports");

  return { ok: true, id: inserted.id };
}
