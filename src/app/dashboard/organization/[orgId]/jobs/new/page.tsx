import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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

import { NewJobOrderForm } from "./submit-form";

export const metadata = {
  title: "Tạo đơn tuyển mới — Ausbildung Hub Vietnam",
};

export default async function NewJobOrderPage({
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
    .select("id, brand_name, org_type")
    .eq("id", params.orgId)
    .maybeSingle();
  if (!org) notFound();

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href={`/dashboard/organization/${params.orgId}/jobs`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Đơn tuyển của {org.brand_name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Tạo đơn tuyển mới
        </h1>
        <p className="text-sm text-muted-foreground">
          Mọi đơn tuyển đều dùng các trường có cấu trúc theo Trust Engine. Đơn
          được lưu ở trạng thái <strong>Bản nháp</strong> hoặc{" "}
          <strong>Đang chờ xét duyệt</strong> và chỉ hiển thị công khai sau khi
          quản trị viên phê duyệt.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Thông tin đơn tuyển ({org.brand_name})
          </CardTitle>
          <CardDescription>
            Tất cả các trường được đánh dấu * đều bắt buộc — đơn thiếu trường
            sẽ không được lưu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewJobOrderForm organizationId={params.orgId} />
        </CardContent>
      </Card>
    </div>
  );
}
