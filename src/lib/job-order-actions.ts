"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "./supabase/admin";
import { writeAuditLog, actorTypeForRole } from "./supabase/audit";
import { getCurrentProfile } from "./supabase/server";
import {
  REPORT_REASONS,
  TRAINING_TYPES,
  slugifyJobTitle,
  type JobOrderStatus,
  type TrainingType,
} from "./job-orders";

import type { JobOrderFormState, ReportFlagState } from "./job-orders";

const initialState: JobOrderFormState = {
  error: null,
  message: null,
  jobOrderId: null,
  slug: null,
};

async function ensureCanManageOrg(
  organizationId: string
): Promise<
  | {
      ok: true;
      profile: NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;
      memberRole: "owner" | "manager" | "editor";
    }
  | { ok: false; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Bạn cần đăng nhập." };

  const admin = createSupabaseAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("member_role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (
    !membership ||
    membership.status !== "active" ||
    !["owner", "manager", "editor"].includes(membership.member_role as string)
  ) {
    return {
      ok: false,
      error: "Bạn không có quyền quản lý đơn tuyển của tổ chức này.",
    };
  }
  return {
    ok: true,
    profile,
    memberRole: membership.member_role as "owner" | "manager" | "editor",
  };
}

function parseStringField(
  formData: FormData,
  name: string,
  maxLen = 500
): string {
  return String(formData.get(name) ?? "").trim().slice(0, maxLen);
}

function parseDateField(formData: FormData, name: string): string | null {
  const v = String(formData.get(name) ?? "").trim();
  if (!v) return null;
  // Accept YYYY-MM-DD only — the <input type="date"> emits this.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function parseNumberField(formData: FormData, name: string): number | null {
  const v = String(formData.get(name) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function ensureUniqueSlug(
  base: string,
  excludeId: string | null
): Promise<string> {
  const admin = createSupabaseAdminClient();
  let slug = base;
  for (let i = 0; i < 5; i++) {
    let q = admin.from("job_orders").select("id").eq("slug", slug);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${randomUUID().slice(0, 6)}`;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

/**
 * Server action: create a new job order in `draft` (or
 * `pending_verification` if the org submitted directly for review).
 *
 * Requires the caller to be an active owner/manager/editor of the org.
 * Validates that all required structured fields are present per the
 * task spec (occupation, city/state, training_type,
 * german_level_required, education_required, start_date,
 * interview_date, monthly_training_allowance, accommodation_support,
 * fees_disclosure, deadline, expiry_date).
 *
 * The DB-side `job_orders_prevent_privilege_escalation` trigger
 * guarantees that even though we run the insert via the service-role
 * admin client, the row never lands in an admin-only state — but
 * because that trigger short-circuits when auth.uid() is null we
 * still pass safe defaults explicitly.
 */
export async function submitJobOrderAction(
  _prev: JobOrderFormState,
  formData: FormData
): Promise<JobOrderFormState> {
  const organizationId = String(formData.get("organization_id") ?? "").trim();
  if (!organizationId) {
    return { ...initialState, error: "Thiếu tổ chức." };
  }
  const auth = await ensureCanManageOrg(organizationId);
  if (!auth.ok) return { ...initialState, error: auth.error };
  const { profile } = auth;

  const title = parseStringField(formData, "title", 160);
  const occupation = parseStringField(formData, "occupation", 80);
  const germanyCity = parseStringField(formData, "germany_city", 120);
  const germanyState = parseStringField(formData, "germany_state", 120);
  const trainingTypeRaw = String(formData.get("training_type") ?? "");
  const germanLevel = parseStringField(formData, "german_level_required", 16);
  const educationRequired = parseStringField(
    formData,
    "education_required",
    32
  );
  const accommodationSupport = parseStringField(
    formData,
    "accommodation_support",
    1000
  );
  const feeDisclosure = parseStringField(formData, "fee_disclosure", 2000);
  const startDate = parseDateField(formData, "start_date");
  const interviewDate = parseDateField(formData, "interview_date");
  const applicationDeadline = parseDateField(formData, "application_deadline");
  const expiryDate = parseDateField(formData, "expiry_date");
  const monthlyAllowance = parseNumberField(
    formData,
    "monthly_training_allowance"
  );
  const submitForReview =
    String(formData.get("submit_for_review") ?? "") === "on";

  const missing: string[] = [];
  if (!title) missing.push("Tiêu đề");
  if (!occupation) missing.push("Ngành nghề");
  if (!germanyCity) missing.push("Thành phố tại Đức");
  if (!germanyState) missing.push("Bang");
  if (!(TRAINING_TYPES as ReadonlyArray<string>).includes(trainingTypeRaw)) {
    missing.push("Loại đào tạo");
  }
  if (!germanLevel) missing.push("Trình độ tiếng Đức yêu cầu");
  if (!educationRequired) missing.push("Yêu cầu trình độ học vấn");
  if (!startDate) missing.push("Ngày khai giảng");
  if (!interviewDate) missing.push("Ngày phỏng vấn");
  if (monthlyAllowance === null) missing.push("Trợ cấp đào tạo hàng tháng");
  if (!accommodationSupport) missing.push("Hỗ trợ chỗ ở");
  if (!feeDisclosure) missing.push("Công khai phí dịch vụ");
  if (!applicationDeadline) missing.push("Hạn nộp hồ sơ");
  if (!expiryDate) missing.push("Ngày hết hạn đơn");

  if (missing.length > 0) {
    return {
      ...initialState,
      error: `Vui lòng nhập đầy đủ các trường: ${missing.join(", ")}.`,
    };
  }

  // Cross-field sanity checks
  if (
    applicationDeadline &&
    expiryDate &&
    expiryDate < applicationDeadline
  ) {
    return {
      ...initialState,
      error: "Ngày hết hạn không được sớm hơn hạn nộp hồ sơ.",
    };
  }

  const trainingType = trainingTypeRaw as TrainingType;
  const status: JobOrderStatus = submitForReview
    ? "pending_verification"
    : "draft";

  const jobOrderId = randomUUID();
  const slug = await ensureUniqueSlug(slugifyJobTitle(title), null);

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  // expires_at is timestamptz on the table; pin it to end of the
  // chosen day in UTC so a deadline of 2025-06-30 means "00:00 UTC on
  // 2025-07-01" (i.e. the whole 30th is still valid).
  const expiresAtIso = new Date(
    `${expiryDate}T23:59:59.000Z`
  ).toISOString();

  const { error: insertError } = await admin.from("job_orders").insert({
    id: jobOrderId,
    organization_id: organizationId,
    created_by: profile.id,
    slug,
    title,
    occupation,
    germany_city: germanyCity,
    germany_state: germanyState,
    training_type: trainingType,
    german_level_required: germanLevel,
    education_required: educationRequired,
    start_date: startDate,
    interview_date: interviewDate,
    monthly_training_allowance: monthlyAllowance,
    accommodation_support: accommodationSupport,
    fee_disclosure: feeDisclosure,
    application_deadline: applicationDeadline,
    expires_at: expiresAtIso,
    verification_status: "pending_verification",
    status,
    last_verified_at: null,
    last_updated_by_org_at: nowIso,
    is_sponsored: false,
  });
  if (insertError) {
    console.error("[submitJobOrder] insert", insertError);
    return {
      ...initialState,
      error: "Không thể tạo đơn tuyển. Vui lòng thử lại.",
    };
  }

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: submitForReview ? "job_order_submitted" : "job_order_created",
    targetType: "job_order",
    targetId: jobOrderId,
    afterData: {
      organization_id: organizationId,
      title,
      occupation,
      training_type: trainingType,
      status,
      verification_status: "pending_verification",
      application_deadline: applicationDeadline,
      expires_at: expiresAtIso,
    },
  });

  revalidatePath(`/dashboard/organization/${organizationId}/jobs`);
  revalidatePath("/admin/job-orders");
  revalidatePath("/jobs");

  return {
    error: null,
    message: submitForReview
      ? "Đơn tuyển đã được gửi đi để duyệt. Đơn chỉ hiển thị công khai sau khi quản trị viên phê duyệt."
      : "Đơn tuyển đã được lưu dưới dạng bản nháp. Khi sẵn sàng, hãy gửi đi để được duyệt.",
    jobOrderId,
    slug,
  };
}

/**
 * Move an org's draft job order to `pending_verification`. Used from
 * the dashboard list — the explicit "Submit for review" button.
 */
export async function submitDraftJobOrderAction(formData: FormData) {
  const jobOrderId = String(formData.get("job_order_id") ?? "").trim();
  if (!jobOrderId) return;

  const admin = createSupabaseAdminClient();
  const { data: jo } = await admin
    .from("job_orders")
    .select("id, organization_id, status")
    .eq("id", jobOrderId)
    .maybeSingle();
  if (!jo) return;
  const auth = await ensureCanManageOrg(jo.organization_id as string);
  if (!auth.ok) return;
  if (
    jo.status !== "draft" &&
    jo.status !== "rejected" &&
    jo.status !== "filled"
  ) {
    return;
  }

  const { error: updErr } = await admin
    .from("job_orders")
    .update({
      status: "pending_verification",
      last_updated_by_org_at: new Date().toISOString(),
    })
    .eq("id", jobOrderId)
    .eq("status", jo.status);
  if (updErr) {
    console.error("[submitDraftJobOrder] update", updErr);
    return;
  }

  await writeAuditLog({
    actorId: auth.profile.id,
    actorType: actorTypeForRole(auth.profile.role),
    action: "job_order_submitted",
    targetType: "job_order",
    targetId: jobOrderId,
    changedFields: ["status"],
    beforeData: { status: jo.status },
    afterData: { status: "pending_verification" },
  });

  revalidatePath(`/dashboard/organization/${jo.organization_id}/jobs`);
  revalidatePath("/admin/job-orders");
}

// -------------------------------------------------------------------
// Public report-flag action — anyone authenticated can flag a job
// order they believe is suspicious or expired but still listed.
// -------------------------------------------------------------------

export async function reportJobOrderAction(
  _prev: ReportFlagState,
  formData: FormData
): Promise<ReportFlagState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      error: "Bạn cần đăng nhập để gửi báo cáo.",
      message: null,
    };
  }
  const targetId = String(formData.get("job_order_id") ?? "").trim();
  const reasonRaw = String(formData.get("reason") ?? "");
  const summary = parseStringField(formData, "summary", 5000);
  if (!targetId) {
    return { error: "Thiếu đơn tuyển được báo cáo.", message: null };
  }
  if (!(REPORT_REASONS as ReadonlyArray<string>).includes(reasonRaw)) {
    return { error: "Lý do báo cáo không hợp lệ.", message: null };
  }
  if (summary.length < 20) {
    return {
      error: "Vui lòng mô tả ngắn gọn vấn đề (tối thiểu 20 ký tự).",
      message: null,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: jo } = await admin
    .from("job_orders")
    .select("id, organization_id")
    .eq("id", targetId)
    .maybeSingle();
  if (!jo) {
    return { error: "Đơn tuyển không tồn tại.", message: null };
  }

  const { error: insertErr } = await admin.from("report_flags").insert({
    reporter_id: profile.id,
    target_type: "job_order",
    target_id: targetId,
    reason: reasonRaw,
    severity: reasonRaw === "scam" ? "high" : "medium",
    summary,
    status: "open",
    handled_by: null,
    resolution: null,
  });
  if (insertErr) {
    console.error("[reportJobOrder] insert", insertErr);
    return {
      error: "Không thể gửi báo cáo. Vui lòng thử lại.",
      message: null,
    };
  }

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "report_submitted",
    targetType: "job_order",
    targetId: targetId,
    afterData: {
      target_type: "job_order",
      target_id: targetId,
      reason: reasonRaw,
    },
    reason: summary,
  });

  return {
    error: null,
    message:
      "Báo cáo của bạn đã được ghi nhận. Đội kiểm duyệt sẽ xử lý sớm nhất có thể.",
  };
}

