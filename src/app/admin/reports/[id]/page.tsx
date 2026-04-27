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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  REPORT_OUTCOME_LABEL_VI,
  REPORT_REASON_LABEL_VI,
  REPORT_SEVERITIES,
  REPORT_SEVERITY_LABEL_VI,
  REPORT_STATUS_LABEL_VI,
  REPORT_TARGET_TYPE_LABEL_VI,
  RISK_INDICATOR_LABEL_VI,
  riskIndicatorFromReportCount,
  type ReportFlagRow,
  type ReportOutcome,
  type ReportReason,
  type ReportSeverity,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/reports";

import {
  escalateToDisputeAction,
  hideTargetAction,
  markReviewingAction,
  resolveNoActionAction,
  suspendTargetAction,
} from "../actions";

type ReporterProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
} | null;

type ReportDetail = ReportFlagRow & {
  reporter: ReporterProfile;
  handler: ReporterProfile;
};

const HIDE_SUPPORTED: ReadonlyArray<ReportTargetType> = [
  "review",
  "community_post",
  "comment",
  "article",
  "job_order",
];

const SUSPEND_SUPPORTED: ReadonlyArray<ReportTargetType> = [
  "organization",
  "user",
  "job_order",
];

export default async function AdminReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("report_flags")
    .select(
      `id,reporter_id,target_type,target_id,reason,description,evidence_file_paths,severity,status,handled_by,handled_at,outcome,internal_note,created_at,updated_at,
       reporter:profiles!report_flags_reporter_id_fkey(id,full_name,email),
       handler:profiles!report_flags_handled_by_fkey(id,full_name,email)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) notFound();
  const r = data as unknown as ReportDetail;

  // Admin-only risk indicator: total reports across all statuses on
  // the same target. Never exposed to public users.
  const { count: totalForTarget } = await supabase
    .from("report_flags")
    .select("id", { count: "exact", head: true })
    .eq("target_type", r.target_type)
    .eq("target_id", r.target_id);
  const riskCount = totalForTarget ?? 0;
  const risk = riskIndicatorFromReportCount(riskCount);

  const status = r.status as ReportStatus;
  const targetType = r.target_type as ReportTargetType;
  const isClosed = status === "resolved" || status === "closed";
  const canHide = HIDE_SUPPORTED.includes(targetType) && !isClosed;
  const canSuspend = SUSPEND_SUPPORTED.includes(targetType) && !isClosed;
  const canEscalate = !isClosed && status !== "escalated_to_dispute";

  const reasonLabel =
    REPORT_REASON_LABEL_VI[r.reason as ReportReason] ?? r.reason;
  const targetTypeLabel =
    REPORT_TARGET_TYPE_LABEL_VI[targetType] ?? r.target_type;
  const severityLabel =
    REPORT_SEVERITY_LABEL_VI[r.severity as ReportSeverity] ?? r.severity;
  const statusLabel = REPORT_STATUS_LABEL_VI[status] ?? r.status;

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/reports"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{statusLabel}</Badge>
            <Badge variant="warning">{severityLabel}</Badge>
            <CardTitle className="text-xl">{reasonLabel}</CardTitle>
          </div>
          <CardDescription>
            {targetTypeLabel} · {r.target_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {r.description ? (
            <div>
              <div className="text-xs text-muted-foreground">Mô tả</div>
              <p className="whitespace-pre-wrap">{r.description}</p>
            </div>
          ) : null}

          {r.evidence_file_paths && r.evidence_file_paths.length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground">Bằng chứng</div>
              <ul className="list-disc space-y-1 pl-5 text-xs">
                {r.evidence_file_paths.map((path, idx) => (
                  <li key={idx} className="break-all">
                    {path}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Người báo cáo (admin-only)">
              {r.reporter ? (
                <div>
                  <div>{r.reporter.full_name ?? r.reporter.email ?? r.reporter.id}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.reporter.id}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Field>
            <Field label="Tạo lúc">
              {new Date(r.created_at).toLocaleString("vi-VN")}
            </Field>
            <Field label="Người xử lý">
              {r.handler
                ? r.handler.full_name ?? r.handler.email ?? r.handler.id
                : "Chưa có"}
            </Field>
            <Field label="Xử lý lúc">
              {r.handled_at
                ? new Date(r.handled_at).toLocaleString("vi-VN")
                : "—"}
            </Field>
            {r.outcome ? (
              <Field label="Kết quả">
                {REPORT_OUTCOME_LABEL_VI[r.outcome as ReportOutcome] ??
                  r.outcome}
              </Field>
            ) : null}
            <Field label="Chỉ số rủi ro">
              <div className="flex items-center gap-2">
                <Badge
                  variant={risk === "high" ? "destructive" : risk === "medium" ? "warning" : "outline"}
                >
                  {RISK_INDICATOR_LABEL_VI[risk]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {riskCount} báo cáo trên cùng đối tượng (chỉ admin nhìn
                  thấy)
                </span>
              </div>
            </Field>
          </div>

          {r.internal_note ? (
            <div className="rounded-xl border border-border/40 bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">
                Ghi chú nội bộ
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{r.internal_note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isClosed ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đánh dấu đang xử lý</CardTitle>
              <CardDescription>
                Chuyển trạng thái sang &quot;Đang xử lý&quot; và phân công cho
                bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={markReviewingAction} className="space-y-2">
                <input type="hidden" name="report_id" value={r.id} />
                <label className="text-xs text-muted-foreground">
                  Mức độ
                  <Select name="severity" defaultValue={r.severity} className="mt-1">
                    {REPORT_SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {REPORT_SEVERITY_LABEL_VI[s]}
                      </option>
                    ))}
                  </Select>
                </label>
                <Textarea
                  name="internal_note"
                  placeholder="Ghi chú nội bộ (không hiển thị cho người báo cáo)"
                  defaultValue={r.internal_note ?? ""}
                />
                <Button type="submit" variant="outline" className="w-full">
                  Chuyển sang đang xử lý
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bỏ qua / Không vi phạm</CardTitle>
              <CardDescription>
                Đóng báo cáo với kết quả &quot;Không vi phạm&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={resolveNoActionAction} className="space-y-2">
                <input type="hidden" name="report_id" value={r.id} />
                <Textarea
                  name="internal_note"
                  placeholder="Ghi chú nội bộ"
                />
                <Button type="submit" variant="ghost" className="w-full">
                  Đóng — không vi phạm
                </Button>
              </form>
            </CardContent>
          </Card>

          {canHide ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ẩn nội dung</CardTitle>
                <CardDescription>
                  Tạm ẩn nội dung khỏi mặt công khai. Audit log sẽ ghi nhận.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={hideTargetAction} className="space-y-2">
                  <input type="hidden" name="report_id" value={r.id} />
                  <Textarea
                    name="internal_note"
                    placeholder="Lý do ẩn (ghi chú nội bộ)"
                    required
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                  >
                    Ẩn nội dung
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canSuspend ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tạm khóa đối tượng</CardTitle>
                <CardDescription>
                  Tạm khóa{" "}
                  {targetTypeLabel.toLowerCase()} liên quan. Người dùng /
                  tổ chức sẽ không xuất hiện công khai.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={suspendTargetAction} className="space-y-2">
                  <input type="hidden" name="report_id" value={r.id} />
                  <Textarea
                    name="internal_note"
                    placeholder="Lý do tạm khóa (ghi chú nội bộ)"
                    required
                  />
                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                  >
                    Tạm khóa
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canEscalate ? (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Chuyển khiếu nại</CardTitle>
                <CardDescription>
                  Mở dispute case mới và chuyển báo cáo sang luồng khiếu nại.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={escalateToDisputeAction} className="space-y-2">
                  <input type="hidden" name="report_id" value={r.id} />
                  <Textarea
                    name="summary"
                    placeholder="Tóm tắt khiếu nại (sẽ lưu vào dispute_cases.summary)"
                    required
                  />
                  <Textarea
                    name="internal_note"
                    placeholder="Ghi chú nội bộ"
                  />
                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full"
                  >
                    Chuyển khiếu nại
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
