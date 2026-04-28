import Link from "next/link";

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
  REVIEW_MODERATION_STATUSES,
  REVIEW_MODERATION_STATUS_LABEL_VI,
  REVIEW_TYPE_LABEL_VI,
  type ReviewModerationStatus,
  type ReviewType,
} from "@/lib/reviews";

export const metadata = {
  title: "Quản lý đánh giá — Admin",
};

const PAGE_SIZE = 50;

const STATUS_VARIANT: Record<
  ReviewModerationStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  pending: "warning",
  approved: "success",
  published: "success",
  rejected: "destructive",
  need_more_info: "warning",
  hidden: "outline",
  under_dispute: "warning",
  removed: "destructive",
};

type ReviewListRow = {
  id: string;
  reviewer_id: string;
  target_type: string;
  target_id: string;
  review_type: ReviewType;
  relationship_to_target: string;
  rating: number | null;
  title: string | null;
  moderation_status: ReviewModerationStatus;
  created_at: string;
  reviewer: { id: string; full_name: string | null; email: string | null } | null;
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams?: { status?: string; page?: string };
}) {
  const requestedStatus = searchParams?.status ?? "pending";
  const filterStatus = (
    REVIEW_MODERATION_STATUSES as ReadonlyArray<string>
  ).includes(requestedStatus)
    ? (requestedStatus as ReviewModerationStatus)
    : "pending";
  const pageNum = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const supabase = createSupabaseAdminClient();
  const offset = (pageNum - 1) * PAGE_SIZE;
  const { data: rows, count } = await supabase
    .from("reviews")
    .select(
      `id, reviewer_id, target_type, target_id, review_type, relationship_to_target, rating, title, moderation_status, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, email)`,
      { count: "exact" }
    )
    .eq("moderation_status", filterStatus)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const list = (rows ?? []) as unknown as ReviewListRow[];
  const totalCount = count ?? 0;

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Quản lý đánh giá có kiểm chứng
        </h1>
        <p className="text-sm text-muted-foreground">
          Duyệt, từ chối, yêu cầu bổ sung bằng chứng, biên tập và xuất bản, hoặc
          chuyển sang xử lý tranh chấp. Mỗi hành động đều ghi vào audit_logs.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {REVIEW_MODERATION_STATUSES.map((s) => {
          const isActive = s === filterStatus;
          return (
            <Link
              key={s}
              href={`/admin/reviews?status=${s}`}
              className={
                isActive
                  ? "rounded-full border border-primary/60 bg-primary/15 px-3 py-1 font-medium"
                  : "rounded-full border border-border/50 px-3 py-1 text-muted-foreground hover:border-border"
              }
            >
              {REVIEW_MODERATION_STATUS_LABEL_VI[s]}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {REVIEW_MODERATION_STATUS_LABEL_VI[filterStatus]}
          </CardTitle>
          <CardDescription>
            {totalCount} đánh giá (đang xem {list.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có đánh giá nào ở trạng thái này.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {list.map((r) => (
                <li key={r.id} className="py-3">
                  <Link
                    href={`/admin/reviews/${r.id}`}
                    className="block rounded-md p-2 hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge
                        variant={STATUS_VARIANT[r.moderation_status] ?? "default"}
                      >
                        {REVIEW_MODERATION_STATUS_LABEL_VI[r.moderation_status]}
                      </Badge>
                      <span className="font-medium">
                        {REVIEW_TYPE_LABEL_VI[r.review_type] ?? r.review_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {r.rating ?? "—"}★
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ·{" "}
                        {r.reviewer?.full_name ||
                          r.reviewer?.email ||
                          r.reviewer_id}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {r.title ? (
                      <p className="mt-1 text-sm font-semibold">{r.title}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AdminPagination
            basePath="/admin/reviews"
            pageNum={pageNum}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            params={{ status: filterStatus }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
