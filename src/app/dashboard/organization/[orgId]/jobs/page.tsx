import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  JOB_ORDER_STATUS_LABEL_VI,
  JOB_ORDER_VERIFICATION_STATUS_LABEL_VI,
  isJobOrderExpired,
  type JobOrderRow,
  type JobOrderStatus,
} from "@/lib/job-orders";

import { submitDraftJobOrderAction } from "@/lib/job-order-actions";

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

export const metadata = {
  title: "Đơn tuyển — Ausbildung Hub Vietnam",
};

export default async function OrganizationJobOrdersPage({
  params,
}: {
  params: { orgId: string };
}) {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("member_role, status")
    .eq("organization_id", params.orgId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (
    !membership ||
    membership.status !== "active" ||
    !["owner", "manager", "editor"].includes(membership.member_role as string)
  ) {
    notFound();
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, brand_name")
    .eq("id", params.orgId)
    .maybeSingle();
  if (!org) notFound();

  const { data: rowsRaw } = await admin
    .from("job_orders")
    .select(
      "id, organization_id, created_by, slug, title, occupation, germany_city, germany_state, training_type, german_level_required, education_required, start_date, interview_date, monthly_training_allowance, accommodation_support, fee_disclosure, application_deadline, expires_at, verification_status, status, last_verified_at, last_updated_by_org_at, is_sponsored, created_at, updated_at, deleted_at"
    )
    .eq("organization_id", params.orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const list = (rowsRaw ?? []) as JobOrderRow[];

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href={`/dashboard/organization/${params.orgId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại {org.brand_name}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Đơn tuyển của {org.brand_name}
          </h1>
          <Button asChild variant="gradient">
            <Link href={`/dashboard/organization/${params.orgId}/jobs/new`}>
              + Đơn tuyển mới
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Đơn tuyển dùng các trường có cấu trúc theo Trust Engine. Đơn chỉ
          hiển thị công khai sau khi quản trị viên phê duyệt.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Danh sách đơn ({list.length})
          </CardTitle>
          <CardDescription>
            Trạng thái và mức xác minh phản ánh đúng những gì hiển thị công
            khai. Đơn quá hạn sẽ tự động chuyển sang trạng thái{" "}
            <strong>Đã hết hạn</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có đơn tuyển nào. Hãy tạo đơn mới bằng nút phía trên.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {list.map((jo) => (
                <li key={jo.id} className="space-y-2 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={STATUS_VARIANT[jo.status] ?? "default"}>
                      {JOB_ORDER_STATUS_LABEL_VI[jo.status]}
                    </Badge>
                    <Badge variant="outline">
                      {
                        JOB_ORDER_VERIFICATION_STATUS_LABEL_VI[
                          jo.verification_status
                        ]
                      }
                    </Badge>
                    {isJobOrderExpired(jo) && jo.status !== "expired" ? (
                      <Badge variant="warning">Đã quá ngày hết hạn</Badge>
                    ) : null}
                    <span className="font-semibold">{jo.title}</span>
                    <span className="text-xs text-muted-foreground">
                      · {jo.occupation}
                    </span>
                    {jo.germany_city ? (
                      <span className="text-xs text-muted-foreground">
                        · {jo.germany_city}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Hạn nộp:{" "}
                    {jo.application_deadline
                      ? new Date(jo.application_deadline).toLocaleDateString(
                          "vi-VN"
                        )
                      : "—"}
                    {" · "}
                    Hết hạn:{" "}
                    {jo.expires_at
                      ? new Date(jo.expires_at).toLocaleDateString("vi-VN")
                      : "—"}
                    {" · "}
                    Cập nhật:{" "}
                    {jo.last_updated_by_org_at
                      ? new Date(jo.last_updated_by_org_at).toLocaleDateString(
                          "vi-VN"
                        )
                      : new Date(jo.updated_at).toLocaleDateString("vi-VN")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {jo.slug && jo.status === "published" ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/jobs/${jo.slug}`}>Xem trang công khai</Link>
                      </Button>
                    ) : null}
                    {(jo.status === "draft" ||
                      jo.status === "rejected" ||
                      jo.status === "filled") ? (
                      <form action={submitDraftJobOrderAction}>
                        <input
                          type="hidden"
                          name="job_order_id"
                          value={jo.id}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Gửi đi để duyệt
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
