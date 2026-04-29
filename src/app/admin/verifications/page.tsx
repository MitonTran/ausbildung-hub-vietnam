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
  USER_STAGE_LABEL_VI,
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_LABEL_VI,
  VERIFICATION_TYPE_LABEL_VI,
  type UserStage,
  type VerificationStatus,
  type VerificationType,
} from "@/lib/verification";

export const metadata = {
  title: "Quản lý yêu cầu xác minh — Admin",
};

const STATUS_VARIANT: Record<
  VerificationStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  need_more_info: "warning",
  expired: "outline",
  revoked: "destructive",
};

type VerificationListRow = {
  id: string;
  user_id: string;
  requested_stage: string;
  verification_type: string;
  status: VerificationStatus;
  evidence_file_paths: string[] | null;
  created_at: string;
  reviewed_at: string | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

const PAGE_SIZE = 50;

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams?: { status?: string; page?: string };
}) {
  const requestedStatus = searchParams?.status ?? "pending";
  const filterStatus = (
    VERIFICATION_STATUSES as ReadonlyArray<string>
  ).includes(requestedStatus)
    ? (requestedStatus as VerificationStatus)
    : "pending";
  const pageNum = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  // Service role: admins always read the full queue. The /admin layout
  // already gates on isAdminRole(). Pagination is required so older
  // items do not silently fall off a fixed `.limit()`.
  const supabase = createSupabaseAdminClient();
  const offset = (pageNum - 1) * PAGE_SIZE;
  const { data: rows, count } = await supabase
    .from("user_verifications")
    .select(
      "id,user_id,requested_stage,verification_type,status,evidence_file_paths,created_at,reviewed_at,profile:profiles!user_verifications_user_id_fkey(id,full_name,email)",
      { count: "exact" }
    )
    .eq("status", filterStatus)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const list = (rows ?? []) as unknown as VerificationListRow[];
  const totalCount = count ?? 0;

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <AdminBackLink />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Yêu cầu xác minh người dùng
        </h1>
        <p className="text-sm text-muted-foreground">
          Duyệt, từ chối, yêu cầu bổ sung hoặc thu hồi xác minh. Mỗi hành động
          đều được ghi vào audit log.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {VERIFICATION_STATUSES.map((s) => {
          const isActive = s === filterStatus;
          return (
            <Link
              key={s}
              href={`/admin/verifications?status=${s}`}
              className={
                isActive
                  ? "rounded-full border border-primary/60 bg-primary/15 px-3 py-1 font-medium"
                  : "rounded-full border border-border/50 px-3 py-1 text-muted-foreground hover:border-border"
              }
            >
              {VERIFICATION_STATUS_LABEL_VI[s]}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {VERIFICATION_STATUS_LABEL_VI[filterStatus]}
          </CardTitle>
          <CardDescription>
            {totalCount} yêu cầu (đang xem {list.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có yêu cầu nào ở trạng thái này.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {list.map((r) => (
                <li key={r.id} className="py-3">
                  <Link
                    href={`/admin/verifications/${r.id}`}
                    className="block rounded-md p-2 hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>
                        {VERIFICATION_STATUS_LABEL_VI[r.status]}
                      </Badge>
                      <span className="font-medium">
                        {USER_STAGE_LABEL_VI[
                          r.requested_stage as UserStage
                        ] ?? r.requested_stage}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ·{" "}
                        {VERIFICATION_TYPE_LABEL_VI[
                          r.verification_type as VerificationType
                        ] ?? r.verification_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {r.evidence_file_paths?.length ?? 0} tệp
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Gửi{" "}
                        {new Date(r.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.profile?.full_name || r.profile?.email || r.user_id}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AdminPagination
            basePath="/admin/verifications"
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
