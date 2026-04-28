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
  DISPUTE_RESOLUTION_LABEL_VI,
  DISPUTE_STATUS_LABEL_VI,
  DISPUTE_TARGET_TYPE_LABEL_VI,
  DISPUTE_TYPE_LABEL_VI,
  type DisputeCaseRow,
} from "@/lib/disputes";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = new Set(["resolved", "rejected", "closed"]);

/**
 * Org-admin view of disputes related to their organization.
 *
 * Visibility scope mirrors the SELECT RLS policy added in 0009:
 *   - dispute_cases where target_type='organization' AND target_id = orgId
 *   - dispute_cases where target_type='job_order' AND the underlying
 *     job_orders row belongs to this org
 *
 * We use the service-role admin client and replicate that visibility
 * scope explicitly so the page works whether the caller's request is
 * carrying a JWT or not.
 */
export default async function OrganizationDisputesPage({
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

  // ---- Enforce org-membership gate (matches the dashboard layout
  //      pattern in /dashboard/organization/[orgId]/page.tsx) ----
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

  // ---- Find this org's job_orders so we can scope job_order disputes ----
  const { data: jobRows } = await admin
    .from("job_orders")
    .select("id")
    .eq("organization_id", params.orgId);
  const jobIds = (jobRows ?? []).map((r) => r.id as string);

  // ---- 1. organization-targeted disputes ----
  const { data: orgDisputeRows } = await admin
    .from("dispute_cases")
    .select(
      "id,opened_by,target_type,target_id,dispute_type,summary,evidence_file_paths,status,assigned_to,resolution,resolved_by,resolved_at,internal_note,created_at,updated_at"
    )
    .eq("target_type", "organization")
    .eq("target_id", params.orgId)
    .order("created_at", { ascending: false });

  // ---- 2. job_order-targeted disputes (only this org's jobs) ----
  let jobDisputeRows: DisputeCaseRow[] = [];
  if (jobIds.length > 0) {
    const { data } = await admin
      .from("dispute_cases")
      .select(
        "id,opened_by,target_type,target_id,dispute_type,summary,evidence_file_paths,status,assigned_to,resolution,resolved_by,resolved_at,internal_note,created_at,updated_at"
      )
      .eq("target_type", "job_order")
      .in("target_id", jobIds)
      .order("created_at", { ascending: false });
    jobDisputeRows = (data ?? []) as DisputeCaseRow[];
  }

  const disputes: DisputeCaseRow[] = [
    ...((orgDisputeRows ?? []) as DisputeCaseRow[]),
    ...jobDisputeRows,
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href={`/dashboard/organization/${params.orgId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại tổ chức
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Khiếu nại liên quan đến tổ chức
            </h1>
            <p className="text-sm text-muted-foreground">
              Bạn chỉ thấy các khiếu nại nhắm trực tiếp đến tổ chức này hoặc
              đến đơn tuyển do tổ chức này phát hành. Không hiển thị bằng chứng
              riêng tư hay danh tính người khiếu nại nếu chưa được moderator
              công bố.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/disputes/new">Mở khiếu nại mới</Link>
          </Button>
        </div>
      </div>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Hiện chưa có khiếu nại nào liên quan đến tổ chức của bạn.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const isTerminal = TERMINAL_STATUSES.has(d.status);
            return (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {DISPUTE_TYPE_LABEL_VI[d.dispute_type]} ·{" "}
                      <span className="text-muted-foreground">
                        {DISPUTE_TARGET_TYPE_LABEL_VI[d.target_type]}
                      </span>
                    </CardTitle>
                    <Badge variant={isTerminal ? "secondary" : "warning"}>
                      {DISPUTE_STATUS_LABEL_VI[d.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Mở ngày {formatDate(d.created_at)} · Cập nhật{" "}
                    {formatDate(d.updated_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{d.summary}</p>
                  {d.resolution ? (
                    <p className="text-xs">
                      <span className="font-medium">Kết quả:</span>{" "}
                      {DISPUTE_RESOLUTION_LABEL_VI[d.resolution]}
                      {d.resolved_at
                        ? ` · ${formatDate(d.resolved_at)}`
                        : null}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
