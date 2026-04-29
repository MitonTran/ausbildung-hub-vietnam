import Link from "next/link";

import { AdminBackLink } from "@/components/admin-back-link";

import { AdminPagination } from "@/components/admin-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  REPORT_REASONS,
  REPORT_REASON_LABEL_VI,
  REPORT_SEVERITIES,
  REPORT_SEVERITY_LABEL_VI,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL_VI,
  REPORT_TARGET_TYPE_LABEL_VI,
  RISK_INDICATOR_LABEL_VI,
  riskIndicatorFromReportCount,
  type ReportFlagRow,
  type ReportReason,
  type ReportSeverity,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/reports";

export const metadata = {
  title: "Báo cáo nội dung — Admin",
};

const PAGE_SIZE = 50;

const STATUS_VARIANT: Record<
  ReportStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  open: "warning",
  triaged: "default",
  under_review: "default",
  resolved: "success",
  rejected: "outline",
  escalated_to_dispute: "destructive",
  closed: "outline",
};

const SEVERITY_VARIANT: Record<
  ReportSeverity,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  low: "outline",
  medium: "default",
  high: "warning",
  critical: "destructive",
};

const RISK_VARIANT: Record<
  "none" | "low" | "medium" | "high",
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  none: "outline",
  low: "outline",
  medium: "warning",
  high: "destructive",
};

type ReportRow = ReportFlagRow;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    severity?: string;
    reason?: string;
    page?: string;
  };
}) {
  const requestedStatus = searchParams?.status ?? "open";
  const filterStatus: ReportStatus = (
    REPORT_STATUSES as ReadonlyArray<string>
  ).includes(requestedStatus)
    ? (requestedStatus as ReportStatus)
    : "open";

  const requestedSeverity = searchParams?.severity ?? "all";
  const filterSeverity: ReportSeverity | "all" =
    requestedSeverity !== "all" &&
    (REPORT_SEVERITIES as ReadonlyArray<string>).includes(requestedSeverity)
      ? (requestedSeverity as ReportSeverity)
      : "all";

  const requestedReason = searchParams?.reason ?? "all";
  const filterReason: ReportReason | "all" =
    requestedReason !== "all" &&
    (REPORT_REASONS as ReadonlyArray<string>).includes(requestedReason)
      ? (requestedReason as ReportReason)
      : "all";

  const pageNum = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const supabase = createSupabaseAdminClient();
  const offset = (pageNum - 1) * PAGE_SIZE;
  let query = supabase
    .from("report_flags")
    .select(
      "id,reporter_id,target_type,target_id,reason,description,evidence_file_paths,severity,status,handled_by,handled_at,outcome,internal_note,created_at,updated_at",
      { count: "exact" }
    )
    .eq("status", filterStatus)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filterSeverity !== "all") {
    query = query.eq("severity", filterSeverity);
  }
  if (filterReason !== "all") {
    query = query.eq("reason", filterReason);
  }

  const { data: rows, count } = await query;
  const list = (rows ?? []) as ReportRow[];
  const totalCount = count ?? 0;

  // Admin-only risk indicator: count distinct reports per (target_type,
  // target_id) across the whole queue (any status). Fetched in batch
  // and joined client-side so the indicator is consistent regardless
  // of the current filter.
  const targetKeys = Array.from(
    new Set(list.map((r) => `${r.target_type}::${r.target_id}`))
  );
  const targetCounts = new Map<string, number>();
  if (targetKeys.length > 0) {
    const targetIds = Array.from(new Set(list.map((r) => r.target_id)));
    const { data: counts } = await supabase
      .from("report_flags")
      .select("target_type,target_id")
      .in("target_id", targetIds);
    if (counts) {
      for (const row of counts as Array<{ target_type: string; target_id: string }>) {
        const key = `${row.target_type}::${row.target_id}`;
        targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
      }
    }
  }

  function buildHref(next: Partial<{ status: string; severity: string; reason: string }>) {
    const params = new URLSearchParams();
    params.set("status", next.status ?? filterStatus);
    const sev = next.severity ?? filterSeverity;
    if (sev !== "all") params.set("severity", sev);
    const reason = next.reason ?? filterReason;
    if (reason !== "all") params.set("reason", reason);
    return `/admin/reports?${params.toString()}`;
  }

  return (
    <div className="container max-w-6xl space-y-6 py-10">
      <AdminBackLink />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Báo cáo nội dung</h1>
        <p className="text-sm text-muted-foreground">
          Phân loại, xử lý hoặc chuyển khiếu nại các báo cáo từ người dùng. Mỗi
          hành động đều được ghi vào audit log. Danh tính người báo cáo được
          giữ kín và chỉ hiển thị trong trang quản trị.
        </p>
      </div>

      <div className="space-y-3">
        <FilterRow
          label="Trạng thái"
          options={REPORT_STATUSES.map((s) => ({
            value: s,
            label: REPORT_STATUS_LABEL_VI[s],
          }))}
          activeValue={filterStatus}
          buildHref={(v) => buildHref({ status: v })}
        />
        <FilterRow
          label="Mức độ"
          options={[
            { value: "all", label: "Tất cả" },
            ...REPORT_SEVERITIES.map((s) => ({
              value: s,
              label: REPORT_SEVERITY_LABEL_VI[s],
            })),
          ]}
          activeValue={filterSeverity}
          buildHref={(v) => buildHref({ severity: v })}
        />
        <FilterRow
          label="Lý do"
          options={[
            { value: "all", label: "Tất cả" },
            ...REPORT_REASONS.map((r) => ({
              value: r,
              label: REPORT_REASON_LABEL_VI[r],
            })),
          ]}
          activeValue={filterReason}
          buildHref={(v) => buildHref({ reason: v })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {REPORT_STATUS_LABEL_VI[filterStatus]}
          </CardTitle>
          <CardDescription>
            {totalCount} báo cáo (đang xem {list.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có báo cáo nào ở trạng thái này.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {list.map((r) => {
                const targetKey = `${r.target_type}::${r.target_id}`;
                const reportCount = targetCounts.get(targetKey) ?? 0;
                const risk = riskIndicatorFromReportCount(reportCount);
                const reasonLabel =
                  REPORT_REASON_LABEL_VI[r.reason as ReportReason] ?? r.reason;
                const targetTypeLabel =
                  REPORT_TARGET_TYPE_LABEL_VI[
                    r.target_type as ReportTargetType
                  ] ?? r.target_type;
                const severityLabel =
                  REPORT_SEVERITY_LABEL_VI[r.severity as ReportSeverity] ??
                  r.severity;
                return (
                  <li key={r.id} className="py-3">
                    <Link
                      href={`/admin/reports/${r.id}`}
                      className="block rounded-md p-2 hover:bg-muted/40"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                          variant={
                            STATUS_VARIANT[r.status as ReportStatus] ?? "default"
                          }
                        >
                          {REPORT_STATUS_LABEL_VI[r.status as ReportStatus] ??
                            r.status}
                        </Badge>
                        <Badge
                          variant={
                            SEVERITY_VARIANT[r.severity as ReportSeverity] ??
                            "default"
                          }
                        >
                          {severityLabel}
                        </Badge>
                        <span className="font-medium">{reasonLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          · {targetTypeLabel}
                        </span>
                        {risk !== "none" ? (
                          <Badge
                            variant={RISK_VARIANT[risk]}
                            className="ml-1"
                            title={`${reportCount} báo cáo trên cùng đối tượng`}
                          >
                            Rủi ro: {RISK_INDICATOR_LABEL_VI[risk]} ·{" "}
                            {reportCount}
                          </Badge>
                        ) : null}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      {r.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {r.description}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <AdminPagination
            basePath="/admin/reports"
            pageNum={pageNum}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            params={{
              status: filterStatus,
              severity: filterSeverity !== "all" ? filterSeverity : undefined,
              reason: filterReason !== "all" ? filterReason : undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FilterRow({
  label,
  options,
  activeValue,
  buildHref,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  activeValue: string;
  buildHref: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      {options.map((opt) => {
        const isActive = opt.value === activeValue;
        return (
          <Link
            key={opt.value}
            href={buildHref(opt.value)}
            className={
              isActive
                ? "rounded-full border border-primary/60 bg-primary/15 px-3 py-1 font-medium"
                : "rounded-full border border-border/50 px-3 py-1 text-muted-foreground hover:border-border"
            }
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
