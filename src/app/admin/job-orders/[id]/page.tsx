import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import {
  JOB_ORDER_STATUS_LABEL_VI,
  JOB_ORDER_VERIFICATION_STATUS_LABEL_VI,
  TRAINING_TYPE_LABEL_VI,
  isJobOrderExpired,
  type JobOrderRow,
  type JobOrderStatus,
  type TrainingType,
} from "@/lib/job-orders";

import {
  approveJobOrderAction,
  rejectJobOrderAction,
  suspendJobOrderAction,
  unsuspendJobOrderAction,
} from "../actions";

const STATUS_VARIANT: Record<
  JobOrderStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  draft: "outline",
  pending_verification: "warning",
  published: "success",
  closing_soon: "warning",
  expired: "outline",
  filled: "success",
  under_review: "warning",
  suspended: "destructive",
  rejected: "destructive",
};

type ReportRow = {
  id: string;
  reason: string;
  severity: string;
  status: string;
  summary: string | null;
  created_at: string;
  reporter:
    | { id: string; full_name: string | null; email: string | null }
    | null;
};

type JobDetail = JobOrderRow & {
  organization: { id: string; brand_name: string; slug: string | null } | null;
  creator: { id: string; full_name: string | null; email: string | null } | null;
};

export default async function AdminJobOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("job_orders")
    .select(
      `id, organization_id, created_by, slug, title, occupation, germany_city, germany_state, training_type, german_level_required, education_required, start_date, interview_date, monthly_training_allowance, accommodation_support, fee_disclosure, application_deadline, expires_at, verification_status, status, last_verified_at, last_updated_by_org_at, is_sponsored, created_at, updated_at, deleted_at,
       organization:organizations!job_orders_organization_id_fkey(id, brand_name, slug),
       creator:profiles!job_orders_created_by_fkey(id, full_name, email)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }
  const jo = data as unknown as JobDetail;

  const { data: reports } = await supabase
    .from("report_flags")
    .select(
      `id, reason, severity, status, summary, created_at,
       reporter:profiles!report_flags_reporter_id_fkey(id, full_name, email)`
    )
    .eq("target_type", "job_order")
    .eq("target_id", jo.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const reportRows = (reports ?? []) as unknown as ReportRow[];

  const profile = await getCurrentProfile();
  const isAdmin = isAdminRole(profile?.role ?? null);

  const isPendingDecision =
    jo.status === "pending_verification" || jo.status === "under_review";

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/job-orders"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[jo.status] ?? "default"}>
            {JOB_ORDER_STATUS_LABEL_VI[jo.status]}
          </Badge>
          <Badge variant="outline">
            {JOB_ORDER_VERIFICATION_STATUS_LABEL_VI[jo.verification_status]}
          </Badge>
          {isJobOrderExpired(jo) ? (
            <Badge variant="destructive">Đã quá hạn</Badge>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{jo.title}</h1>
        <p className="text-sm text-muted-foreground">
          {jo.occupation} · {jo.germany_city ?? "—"}, {jo.germany_state ?? "—"}{" "}
          · {jo.organization?.brand_name ?? "—"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cấu trúc đơn tuyển</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <KV label="Loại đào tạo" value={TRAINING_TYPE_LABEL_VI[jo.training_type as TrainingType] ?? jo.training_type} />
          <KV label="Tiếng Đức yêu cầu" value={jo.german_level_required ?? "—"} />
          <KV label="Học vấn yêu cầu" value={jo.education_required ?? "—"} />
          <KV
            label="Trợ cấp đào tạo / tháng"
            value={
              jo.monthly_training_allowance !== null
                ? `${jo.monthly_training_allowance} EUR`
                : "—"
            }
          />
          <KV
            label="Khai giảng"
            value={
              jo.start_date
                ? new Date(jo.start_date).toLocaleDateString("vi-VN")
                : "—"
            }
          />
          <KV
            label="Phỏng vấn"
            value={
              jo.interview_date
                ? new Date(jo.interview_date).toLocaleDateString("vi-VN")
                : "—"
            }
          />
          <KV
            label="Hạn nộp hồ sơ"
            value={
              jo.application_deadline
                ? new Date(jo.application_deadline).toLocaleDateString("vi-VN")
                : "—"
            }
          />
          <KV
            label="Hết hạn đơn"
            value={
              jo.expires_at
                ? new Date(jo.expires_at).toLocaleString("vi-VN")
                : "—"
            }
          />
          <KV
            label="Cập nhật gần nhất"
            value={
              jo.last_updated_by_org_at
                ? new Date(jo.last_updated_by_org_at).toLocaleString("vi-VN")
                : new Date(jo.updated_at).toLocaleString("vi-VN")
            }
          />
          <KV
            label="Người tạo"
            value={
              jo.creator?.full_name || jo.creator?.email || jo.created_by
            }
          />
          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-muted-foreground">
              Hỗ trợ chỗ ở
            </p>
            <p className="whitespace-pre-wrap rounded-md border border-border/40 bg-background/40 p-2">
              {jo.accommodation_support ?? "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-muted-foreground">
              Công khai phí dịch vụ
            </p>
            <p className="whitespace-pre-wrap rounded-md border border-border/40 bg-background/40 p-2">
              {jo.fee_disclosure ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Báo cáo từ người dùng</CardTitle>
          <CardDescription>
            {reportRows.length} báo cáo đã ghi nhận cho đơn này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có báo cáo.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {reportRows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-border/40 p-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant={
                        r.severity === "high" || r.severity === "critical"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {r.severity}
                    </Badge>
                    <span className="font-medium">{r.reason}</span>
                    <span className="text-muted-foreground">
                      · trạng thái {r.status}
                    </span>
                    <span className="ml-auto text-muted-foreground">
                      {r.reporter?.full_name ||
                        r.reporter?.email ||
                        "Người dùng"}{" "}
                      · {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {r.summary ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {r.summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hành động kiểm duyệt</CardTitle>
          <CardDescription>
            Mọi hành động đều được ghi vào audit_logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPendingDecision ? (
            <>
              <form action={approveJobOrderAction} className="space-y-2">
                <input type="hidden" name="job_order_id" value={jo.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Ghi chú khi duyệt (không bắt buộc)
                </label>
                <Textarea name="reason" rows={2} maxLength={500} />
                <Button type="submit" variant="gradient">
                  Duyệt và đăng công khai
                </Button>
              </form>

              <form action={rejectJobOrderAction} className="space-y-2">
                <input type="hidden" name="job_order_id" value={jo.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Lý do từ chối (sẽ hiển thị cho doanh nghiệp)
                </label>
                <Textarea
                  name="rejected_reason"
                  rows={2}
                  maxLength={500}
                  required
                />
                <Button type="submit" variant="ghost">
                  Từ chối
                </Button>
              </form>
            </>
          ) : null}

          {isAdmin && jo.status !== "suspended" ? (
            <form action={suspendJobOrderAction} className="space-y-2">
              <input type="hidden" name="job_order_id" value={jo.id} />
              <label className="block text-xs font-medium uppercase text-muted-foreground">
                Tạm ẩn đơn tuyển (admin)
              </label>
              <Textarea name="reason" rows={2} maxLength={500} required />
              <Button type="submit" variant="ghost">
                Tạm ẩn
              </Button>
            </form>
          ) : null}

          {isAdmin && jo.status === "suspended" ? (
            <form action={unsuspendJobOrderAction} className="space-y-2">
              <input type="hidden" name="job_order_id" value={jo.id} />
              <label className="block text-xs font-medium uppercase text-muted-foreground">
                Bỏ tạm ẩn (chuyển về under_review để xem xét lại)
              </label>
              <Textarea name="reason" rows={2} maxLength={500} />
              <Button type="submit" variant="outline">
                Bỏ tạm ẩn
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
