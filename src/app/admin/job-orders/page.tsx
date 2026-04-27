import Link from "next/link";

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
  JOB_ORDER_STATUSES,
  JOB_ORDER_STATUS_LABEL_VI,
  type JobOrderStatus,
} from "@/lib/job-orders";

export const metadata = {
  title: "Quản lý đơn tuyển — Admin",
};

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

type Row = {
  id: string;
  title: string;
  occupation: string;
  germany_city: string | null;
  status: JobOrderStatus;
  application_deadline: string | null;
  expires_at: string | null;
  created_at: string;
  organization: { brand_name: string } | null;
};

export default async function AdminJobOrdersPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const requested = searchParams?.status ?? "pending_verification";
  const filter = (
    JOB_ORDER_STATUSES as ReadonlyArray<string>
  ).includes(requested)
    ? (requested as JobOrderStatus)
    : "pending_verification";

  const supabase = createSupabaseAdminClient();
  const { data: rows } = await supabase
    .from("job_orders")
    .select(
      `id, title, occupation, germany_city, status, application_deadline, expires_at, created_at,
       organization:organizations!job_orders_organization_id_fkey(brand_name)`
    )
    .eq("status", filter)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = (rows ?? []) as unknown as Row[];

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Quản lý đơn tuyển có cấu trúc
        </h1>
        <p className="text-sm text-muted-foreground">
          Duyệt, từ chối, tạm ẩn hoặc bỏ tạm ẩn đơn tuyển của doanh nghiệp.
          Mỗi hành động ghi vào audit_logs.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {JOB_ORDER_STATUSES.map((s) => {
          const isActive = s === filter;
          return (
            <Link
              key={s}
              href={`/admin/job-orders?status=${s}`}
              className={
                isActive
                  ? "rounded-full border border-primary/60 bg-primary/15 px-3 py-1 font-medium"
                  : "rounded-full border border-border/50 px-3 py-1 text-muted-foreground hover:border-border"
              }
            >
              {JOB_ORDER_STATUS_LABEL_VI[s]}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {JOB_ORDER_STATUS_LABEL_VI[filter]}
          </CardTitle>
          <CardDescription>{list.length} đơn</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có đơn nào ở trạng thái này.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {list.map((r) => (
                <li key={r.id} className="py-3">
                  <Link
                    href={`/admin/job-orders/${r.id}`}
                    className="block rounded-md p-2 hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>
                        {JOB_ORDER_STATUS_LABEL_VI[r.status]}
                      </Badge>
                      <span className="font-semibold">{r.title}</span>
                      <span className="text-xs text-muted-foreground">
                        · {r.occupation}
                      </span>
                      {r.germany_city ? (
                        <span className="text-xs text-muted-foreground">
                          · {r.germany_city}
                        </span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        · {r.organization?.brand_name ?? "—"}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("vi-VN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Hạn nộp:{" "}
                      {r.application_deadline
                        ? new Date(r.application_deadline).toLocaleDateString(
                            "vi-VN"
                          )
                        : "—"}
                      {" · "}
                      Hết hạn:{" "}
                      {r.expires_at
                        ? new Date(r.expires_at).toLocaleDateString("vi-VN")
                        : "—"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
