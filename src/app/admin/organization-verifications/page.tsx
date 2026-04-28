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
  ORG_VERIFICATION_REQUESTABLE_LABEL_VI,
  ORG_VERIFICATION_REQUEST_STATUSES,
  ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI,
  type OrgVerificationRequestStatus,
  type OrgVerificationRequestable,
} from "@/lib/organization";

export const metadata = {
  title: "Xác minh tổ chức — Admin",
};

const PAGE_SIZE = 50;

const STATUS_VARIANT: Record<
  OrgVerificationRequestStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  need_more_info: "warning",
  expired: "outline",
  revoked: "destructive",
};

type OrgVerificationListRow = {
  id: string;
  organization_id: string;
  requested_status: string;
  status: OrgVerificationRequestStatus;
  document_file_paths: string[] | null;
  created_at: string;
  reviewed_at: string | null;
  organization: {
    id: string;
    brand_name: string;
    legal_name: string | null;
    org_type: string;
    city: string | null;
    slug: string | null;
  } | null;
  submitter: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

export default async function AdminOrgVerificationsPage({
  searchParams,
}: {
  searchParams?: { status?: string; page?: string };
}) {
  const requestedStatus = searchParams?.status ?? "pending";
  const filterStatus = (
    ORG_VERIFICATION_REQUEST_STATUSES as ReadonlyArray<string>
  ).includes(requestedStatus)
    ? (requestedStatus as OrgVerificationRequestStatus)
    : "pending";
  const pageNum = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  // Service role: admins always read the full queue. The /admin layout
  // already gates on isAdminRole(). Pagination is required so older
  // items do not silently fall off a fixed `.limit()`.
  const supabase = createSupabaseAdminClient();
  const offset = (pageNum - 1) * PAGE_SIZE;
  const { data: rows, count } = await supabase
    .from("organization_verifications")
    .select(
      `id, organization_id, requested_status, status, document_file_paths, created_at, reviewed_at,
       organization:organizations!organization_verifications_organization_id_fkey(
         id, brand_name, legal_name, org_type, city, slug
       ),
       submitter:profiles!organization_verifications_submitted_by_fkey(
         id, full_name, email
       )`,
      { count: "exact" }
    )
    .eq("status", filterStatus)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const list = (rows ?? []) as unknown as OrgVerificationListRow[];
  const totalCount = count ?? 0;

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Xác minh tổ chức
        </h1>
        <p className="text-sm text-muted-foreground">
          Duyệt xác minh giấy tờ cơ bản, phong Đối tác uy tín, từ chối, yêu
          cầu bổ sung, hoặc thu hồi / cho hết hạn. Mỗi hành động đều được ghi
          vào audit log.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {ORG_VERIFICATION_REQUEST_STATUSES.map((s) => {
          const isActive = s === filterStatus;
          return (
            <Link
              key={s}
              href={`/admin/organization-verifications?status=${s}`}
              className={
                isActive
                  ? "rounded-full border border-primary/60 bg-primary/15 px-3 py-1 font-medium"
                  : "rounded-full border border-border/50 px-3 py-1 text-muted-foreground hover:border-border"
              }
            >
              {ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI[s]}
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI[filterStatus]}
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
                    href={`/admin/organization-verifications/${r.id}`}
                    className="block rounded-md p-2 hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>
                        {ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI[r.status]}
                      </Badge>
                      <span className="font-medium">
                        {r.organization?.brand_name ?? r.organization_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ·{" "}
                        {ORG_VERIFICATION_REQUESTABLE_LABEL_VI[
                          r.requested_status as OrgVerificationRequestable
                        ] ?? r.requested_status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {r.document_file_paths?.length ?? 0} tài liệu
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Bởi{" "}
                      {r.submitter?.full_name ||
                        r.submitter?.email ||
                        "không rõ"}
                      {r.organization?.city ? ` · ${r.organization.city}` : ""}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <AdminPagination
            basePath="/admin/organization-verifications"
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
