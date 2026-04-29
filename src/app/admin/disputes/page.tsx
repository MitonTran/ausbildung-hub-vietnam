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
  DISPUTE_RESOLUTION_LABEL_VI,
  DISPUTE_STATUSES,
  DISPUTE_STATUS_LABEL_VI,
  DISPUTE_TARGET_TYPES,
  DISPUTE_TARGET_TYPE_LABEL_VI,
  DISPUTE_TYPES,
  DISPUTE_TYPE_LABEL_VI,
  type DisputeCaseRow,
  type DisputeStatus,
  type DisputeTargetType,
  type DisputeType,
} from "@/lib/disputes";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Khiếu nại (Disputes) — Admin",
};

const PAGE_SIZE = 50;

const STATUS_VARIANT: Record<
  DisputeStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  open: "warning",
  waiting_for_user: "default",
  waiting_for_organization: "default",
  under_review: "default",
  resolved: "success",
  rejected: "outline",
  closed: "outline",
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    target_type?: string;
    dispute_type?: string;
    page?: string;
  };
}) {
  const requestedStatus = searchParams?.status ?? "open";
  const filterStatus: DisputeStatus = (
    DISPUTE_STATUSES as ReadonlyArray<string>
  ).includes(requestedStatus)
    ? (requestedStatus as DisputeStatus)
    : "open";

  const requestedTargetType = searchParams?.target_type ?? "all";
  const filterTargetType: DisputeTargetType | "all" =
    requestedTargetType !== "all" &&
    (DISPUTE_TARGET_TYPES as ReadonlyArray<string>).includes(
      requestedTargetType
    )
      ? (requestedTargetType as DisputeTargetType)
      : "all";

  const requestedDisputeType = searchParams?.dispute_type ?? "all";
  const filterDisputeType: DisputeType | "all" =
    requestedDisputeType !== "all" &&
    (DISPUTE_TYPES as ReadonlyArray<string>).includes(requestedDisputeType)
      ? (requestedDisputeType as DisputeType)
      : "all";

  const pageNum = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const supabase = createSupabaseAdminClient();
  const offset = (pageNum - 1) * PAGE_SIZE;
  let query = supabase
    .from("dispute_cases")
    .select(
      "id,opened_by,target_type,target_id,dispute_type,summary,evidence_file_paths,status,assigned_to,resolution,resolved_by,resolved_at,internal_note,created_at,updated_at",
      { count: "exact" }
    )
    .eq("status", filterStatus)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filterTargetType !== "all") {
    query = query.eq("target_type", filterTargetType);
  }
  if (filterDisputeType !== "all") {
    query = query.eq("dispute_type", filterDisputeType);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("[admin/disputes]", error);
  }
  const disputes = (data ?? []) as DisputeCaseRow[];
  const totalCount = count ?? 0;

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <AdminBackLink />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Khiếu nại (Disputes)
        </h1>
        <p className="text-sm text-muted-foreground">
          Hàng đợi khiếu nại — gồm các vụ việc cần phân loại, xác minh thông
          tin và ra quyết định cuối cùng. Mỗi hành động đều được ghi vào nhật
          ký kiểm toán.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bộ lọc</CardTitle>
          <CardDescription>
            Mặc định hiển thị các khiếu nại chưa xử lý.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="space-y-1">
              <label className="block text-xs uppercase text-muted-foreground">
                Trạng thái
              </label>
              <select
                name="status"
                defaultValue={filterStatus}
                className="rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm"
              >
                {DISPUTE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DISPUTE_STATUS_LABEL_VI[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase text-muted-foreground">
                Loại đối tượng
              </label>
              <select
                name="target_type"
                defaultValue={filterTargetType}
                className="rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">Tất cả</option>
                {DISPUTE_TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DISPUTE_TARGET_TYPE_LABEL_VI[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase text-muted-foreground">
                Loại khiếu nại
              </label>
              <select
                name="dispute_type"
                defaultValue={filterDisputeType}
                className="rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">Tất cả</option>
                {DISPUTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DISPUTE_TYPE_LABEL_VI[t]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Lọc
            </button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {totalCount} vụ việc (đang xem {disputes.length})
      </p>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Không có khiếu nại nào khớp bộ lọc.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className="hover:underline"
                    >
                      {DISPUTE_TYPE_LABEL_VI[d.dispute_type]} ·{" "}
                      <span className="text-muted-foreground">
                        {DISPUTE_TARGET_TYPE_LABEL_VI[d.target_type]}
                      </span>
                    </Link>
                  </CardTitle>
                  <Badge variant={STATUS_VARIANT[d.status]}>
                    {DISPUTE_STATUS_LABEL_VI[d.status]}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Mở ngày {formatDate(d.created_at)} · Người mở{" "}
                  <code className="text-[11px]">{d.opened_by.slice(0, 8)}</code>
                  {d.assigned_to ? (
                    <>
                      {" "}
                      · Phụ trách{" "}
                      <code className="text-[11px]">
                        {d.assigned_to.slice(0, 8)}
                      </code>
                    </>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground line-clamp-2">{d.summary}</p>
                {d.evidence_file_paths && d.evidence_file_paths.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {d.evidence_file_paths.length} tệp bằng chứng (riêng tư).
                  </p>
                ) : null}
                {d.resolution ? (
                  <p className="text-xs">
                    <span className="font-medium">Kết quả:</span>{" "}
                    {DISPUTE_RESOLUTION_LABEL_VI[d.resolution]}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AdminPagination
        basePath="/admin/disputes"
        pageNum={pageNum}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        params={{
          status: filterStatus,
          target_type:
            filterTargetType !== "all" ? filterTargetType : undefined,
          dispute_type:
            filterDisputeType !== "all" ? filterDisputeType : undefined,
        }}
      />
    </div>
  );
}
