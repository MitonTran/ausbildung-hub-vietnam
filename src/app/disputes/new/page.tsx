import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisputeForm } from "@/components/dispute-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  isDisputeTargetType,
  isDisputeType,
  type DisputeTargetType,
  type DisputeType,
} from "@/lib/disputes";

export const dynamic = "force-dynamic";

export default async function NewDisputePage({
  searchParams,
}: {
  searchParams: { target_type?: string; target_id?: string; reason?: string };
}) {
  // Demo mode: render the form without auth so the UI is visible in
  // preview deploys, but server-side submission will still reject
  // unauthenticated callers via dispute-actions.ts.
  let isAuthenticated = false;
  if (isSupabaseConfigured()) {
    const profile = await getCurrentProfile();
    isAuthenticated = !!profile;
  }

  const defaultTargetType: DisputeTargetType | undefined =
    searchParams.target_type && isDisputeTargetType(searchParams.target_type)
      ? searchParams.target_type
      : undefined;
  const defaultTargetId =
    typeof searchParams.target_id === "string" &&
    searchParams.target_id.length > 0
      ? searchParams.target_id
      : undefined;
  const defaultReason: DisputeType | undefined =
    searchParams.reason && isDisputeType(searchParams.reason)
      ? searchParams.reason
      : undefined;

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Mở khiếu nại</h1>
        <p className="text-sm text-muted-foreground">
          Sử dụng biểu mẫu này khi bạn muốn khiếu nại một quyết định kiểm duyệt,
          một review không công bằng, hoặc một đơn tuyển có vấn đề. Mọi khiếu nại
          đều được ghi vào nhật ký kiểm toán và sẽ được xem xét bởi đội ngũ
          moderator.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Biểu mẫu khiếu nại</CardTitle>
          <CardDescription>
            Bằng chứng được lưu riêng tư và không hiển thị công khai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAuthenticated && isSupabaseConfigured() ? (
            <div className="space-y-3 rounded-xl border border-border/40 bg-muted/30 p-4 text-sm">
              <p>Bạn cần đăng nhập để mở khiếu nại.</p>
              <Button asChild variant="gradient">
                <Link href="/login">Đăng nhập</Link>
              </Button>
            </div>
          ) : (
            <DisputeForm
              defaultTargetType={defaultTargetType}
              defaultTargetId={defaultTargetId}
              defaultReason={defaultReason}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
