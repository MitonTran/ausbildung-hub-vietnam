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
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  ACTIVE_JOB_ORDER_STATUSES,
  JOB_ORDER_STATUS_LABEL_VI,
  JOB_ORDER_VERIFICATION_STATUS_LABEL_VI,
  jobOrderDaysUntilExpiry,
  type JobOrderRow,
} from "@/lib/job-orders";
import { jobOrders as mockJobOrders } from "@/lib/mock-data";

import { MockJobOrdersList } from "./mock-list";

type DbJob = JobOrderRow & {
  organization: { brand_name: string; slug: string | null } | null;
};

export default async function JobOrdersPage() {
  const dbJobs: DbJob[] = [];
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("job_orders")
      .select(
        `id, organization_id, created_by, slug, title, occupation, germany_city, germany_state, training_type, german_level_required, education_required, start_date, interview_date, monthly_training_allowance, accommodation_support, fee_disclosure, application_deadline, expires_at, verification_status, status, last_verified_at, last_updated_by_org_at, is_sponsored, created_at, updated_at, deleted_at,
         organization:organizations!job_orders_organization_id_fkey(brand_name, slug)`
      )
      .in("status", ACTIVE_JOB_ORDER_STATUSES as unknown as string[])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    dbJobs.push(...(((data ?? []) as unknown) as DbJob[]));
  }

  return (
    <div className="container py-8 space-y-8">
      <header className="space-y-2">
        <Badge>Job Orders</Badge>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Đơn tuyển <span className="text-gradient">Ausbildung</span> tại Đức
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {dbJobs.length} đơn tuyển có cấu trúc đang mở từ doanh nghiệp đã
          xác minh trên Ausbildung Hub Vietnam, kèm{" "}
          {mockJobOrders.length} đơn mẫu để minh hoạ.
        </p>
      </header>

      {dbJobs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Đơn tuyển đã được kiểm duyệt
            </CardTitle>
            <CardDescription>
              Chỉ những đơn ở trạng thái <strong>Đã đăng</strong> hoặc{" "}
              <strong>Sắp hết hạn</strong> mới hiển thị tại đây. Đơn quá hạn,
              tạm ẩn hoặc đang chờ xét duyệt được tự động ẩn khỏi danh sách.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-2">
              {dbJobs.map((j) => {
                const days = jobOrderDaysUntilExpiry(j);
                return (
                  <li
                    key={j.id}
                    className="rounded-xl border border-border/40 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant={
                          j.status === "closing_soon" ? "warning" : "success"
                        }
                      >
                        {JOB_ORDER_STATUS_LABEL_VI[j.status]}
                      </Badge>
                      <Badge variant="outline">
                        {
                          JOB_ORDER_VERIFICATION_STATUS_LABEL_VI[
                            j.verification_status
                          ]
                        }
                      </Badge>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">
                      {j.slug ? (
                        <Link
                          href={`/jobs/${j.slug}`}
                          className="hover:underline"
                        >
                          {j.title}
                        </Link>
                      ) : (
                        j.title
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {j.organization?.brand_name ?? "—"} · {j.occupation}
                      {j.germany_city ? ` · ${j.germany_city}` : ""}
                      {j.germany_state ? `, ${j.germany_state}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Hạn nộp:{" "}
                      {j.application_deadline
                        ? new Date(j.application_deadline).toLocaleDateString(
                            "vi-VN"
                          )
                        : "—"}
                      {" · "}
                      {days !== null ? (
                        <span
                          className={
                            days <= 7
                              ? "text-amber-600 dark:text-amber-300"
                              : "text-muted-foreground"
                          }
                        >
                          Còn {days} ngày tới hạn đơn
                        </span>
                      ) : (
                        "—"
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Cập nhật lần cuối:{" "}
                      {j.last_updated_by_org_at
                        ? new Date(
                            j.last_updated_by_org_at
                          ).toLocaleDateString("vi-VN")
                        : new Date(j.updated_at).toLocaleDateString("vi-VN")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <MockJobOrdersList />
    </div>
  );
}
