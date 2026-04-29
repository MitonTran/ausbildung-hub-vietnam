import Link from "next/link";

import { AdminBackLink } from "@/components/admin-back-link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuditTargetType } from "@/lib/audit/createAuditLog";

export const metadata = {
  title: "Audit logs — Admin",
};

export const dynamic = "force-dynamic";

const TARGET_TYPES: ReadonlyArray<AuditTargetType> = [
  "profile",
  "user_verification",
  "organization",
  "organization_verification",
  "organization_member",
  "job_order",
  "review",
  "review_proof",
  "report_flag",
  "dispute_case",
  "article",
  "community_post",
  "comment",
  "application_lead",
  "storage_file",
  "badge",
  "system_setting",
];

// The hardening task asks for filters by actor / action / target_type
// / date range. We surface the most commonly-needed actions as a
// dropdown and fall back to free text for everything else.
const COMMON_ACTIONS: ReadonlyArray<string> = [
  "user_verification_approved",
  "user_verification_rejected",
  "user_verification_expired",
  "organization_badge_granted",
  "organization_badge_revoked",
  "organization_suspended",
  "review_published",
  "review_rejected",
  "review_redacted",
  "report_resolved_no_action",
  "report_resolved_content_changed",
  "report_target_suspended",
  "dispute_opened",
  "dispute_resolved",
  "job_order_published",
  "job_order_expired",
  "job_order_suspended",
  "ai_suggestion_accepted",
  "ai_suggestion_rejected",
];

const PAGE_SIZE = 50;

type ActorJoin = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
} | null;

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  target_type: string;
  target_id: string | null;
  changed_fields: string[] | null;
  before_data: unknown;
  after_data: unknown;
  reason: string | null;
  ai_generated: boolean;
  human_approved: boolean;
  ip_address: string | null;
  created_at: string;
  actor: ActorJoin;
};

function isoDayStart(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T00:00:00.000Z`;
}

function isoDayEndExclusive(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Use exclusive upper bound so a single-day range stays anchored to UTC.
  const next = new Date(`${value}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actorLabel(row: AuditLogRow): string {
  if (row.actor) {
    return (
      row.actor.full_name ??
      row.actor.email ??
      `${row.actor_type} ${row.actor_id?.slice(0, 8) ?? ""}`
    );
  }
  if (row.actor_type === "system" || row.actor_type === "ai") {
    return row.actor_type;
  }
  return row.actor_id ? `${row.actor_type} ${row.actor_id.slice(0, 8)}` : row.actor_type;
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams?: {
    actor?: string;
    action?: string;
    target_type?: string;
    from?: string;
    to?: string;
    ai_only?: string;
    page?: string;
  };
}) {
  const filterActorRaw = (searchParams?.actor ?? "").trim();
  const filterActionRaw = (searchParams?.action ?? "").trim();
  const filterTargetTypeRaw = (searchParams?.target_type ?? "").trim();
  const filterFromRaw = (searchParams?.from ?? "").trim();
  const filterToRaw = (searchParams?.to ?? "").trim();
  const aiOnly = searchParams?.ai_only === "1";
  const pageNum = Math.max(1, Number(searchParams?.page ?? "1") || 1);

  const filterTargetType =
    filterTargetTypeRaw &&
    (TARGET_TYPES as ReadonlyArray<string>).includes(filterTargetTypeRaw)
      ? (filterTargetTypeRaw as AuditTargetType)
      : null;

  const fromIso = filterFromRaw ? isoDayStart(filterFromRaw) : null;
  const toIso = filterToRaw ? isoDayEndExclusive(filterToRaw) : null;

  const supabase = createSupabaseAdminClient();

  // Resolve a typed actor filter:
  //   - exact UUID -> match actor_id
  //   - email substring -> resolve to a small set of profile ids
  //     and IN-filter on actor_id
  let actorIdFilter: string[] | null = null;
  if (filterActorRaw) {
    if (isUuid(filterActorRaw)) {
      actorIdFilter = [filterActorRaw];
    } else {
      const { data: matchedProfiles } = await supabase
        .from("profiles")
        .select("id")
        .or(
          `email.ilike.%${filterActorRaw}%,full_name.ilike.%${filterActorRaw}%`,
        )
        .limit(50);
      const ids = (matchedProfiles ?? []).map(
        (p: { id: string }) => p.id,
      );
      // No matches -> still narrow to an empty set so the table is empty.
      actorIdFilter = ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
    }
  }

  let query = supabase
    .from("audit_logs")
    .select(
      `id, actor_id, actor_type, action, target_type, target_id,
       changed_fields, before_data, after_data, reason, ai_generated,
       human_approved, ip_address, created_at,
       actor:profiles!audit_logs_actor_id_fkey(id, email, full_name, role)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (actorIdFilter) query = query.in("actor_id", actorIdFilter);
  if (filterActionRaw) query = query.eq("action", filterActionRaw);
  if (filterTargetType) query = query.eq("target_type", filterTargetType);
  if (fromIso) query = query.gte("created_at", fromIso);
  if (toIso) query = query.lt("created_at", toIso);
  if (aiOnly) query = query.eq("ai_generated", true);

  const offset = (pageNum - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data, error, count } = await query;
  const rows = (data as unknown as AuditLogRow[]) ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="container max-w-6xl space-y-6 py-10">
      <AdminBackLink />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Lịch sử bất biến của các hành động quản trị nhạy cảm. Chỉ admin
          có quyền xem. Không UI nào cho phép sửa hoặc xoá audit log.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
          <CardDescription>
            Lọc theo người thực hiện, hành động, loại đối tượng, hoặc khoảng
            thời gian. Có thể giới hạn ở các thay đổi do AI tạo ra.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
          >
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                Actor (email, tên, hoặc UUID)
              </span>
              <Input
                type="text"
                name="actor"
                defaultValue={filterActorRaw}
                placeholder="admin@example.com"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Action</span>
              <Select name="action" defaultValue={filterActionRaw}>
                <option value="">Tất cả</option>
                {COMMON_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Target type</span>
              <Select name="target_type" defaultValue={filterTargetTypeRaw}>
                <option value="">Tất cả</option>
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Từ ngày</span>
              <Input type="date" name="from" defaultValue={filterFromRaw} />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Đến ngày</span>
              <Input type="date" name="to" defaultValue={filterToRaw} />
            </label>

            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                name="ai_only"
                value="1"
                defaultChecked={aiOnly}
                className="h-4 w-4"
              />
              <span>Chỉ thay đổi do AI tạo</span>
            </label>

            <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-2">
              <Button type="submit" variant="gradient" size="sm">
                Lọc
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
              >
                <Link href="/admin/audit-logs">Xoá bộ lọc</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kết quả</CardTitle>
          <CardDescription>
            {totalCount} log
            {error ? ` · lỗi truy vấn: ${error.message}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có log nào khớp với bộ lọc hiện tại.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border/40">
                    <th className="py-2 pr-3">Thời gian</th>
                    <th className="py-2 pr-3">Actor</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2 pr-3">AI</th>
                    <th className="py-2 pr-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/20 align-top"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{actorLabel(row)}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.actor_type}
                          {row.actor?.role ? ` · ${row.actor.role}` : ""}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <code className="rounded bg-muted/40 px-1.5 py-0.5 text-xs">
                          {row.action}
                        </code>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="text-xs">{row.target_type}</div>
                        {row.target_id ? (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {row.target_id.slice(0, 8)}…
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        {row.ai_generated ? (
                          <Badge variant="warning">AI</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {row.human_approved ? (
                          <Badge className="ml-1" variant="success">
                            human ok
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {row.reason ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Trang {pageNum} / {totalPages}
              </span>
              <div className="flex gap-2">
                {pageNum > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={
                        "/admin/audit-logs?" +
                        new URLSearchParams({
                          ...(filterActorRaw ? { actor: filterActorRaw } : {}),
                          ...(filterActionRaw
                            ? { action: filterActionRaw }
                            : {}),
                          ...(filterTargetType
                            ? { target_type: filterTargetType }
                            : {}),
                          ...(filterFromRaw ? { from: filterFromRaw } : {}),
                          ...(filterToRaw ? { to: filterToRaw } : {}),
                          ...(aiOnly ? { ai_only: "1" } : {}),
                          page: String(pageNum - 1),
                        }).toString()
                      }
                    >
                      Trước
                    </Link>
                  </Button>
                ) : null}
                {pageNum < totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={
                        "/admin/audit-logs?" +
                        new URLSearchParams({
                          ...(filterActorRaw ? { actor: filterActorRaw } : {}),
                          ...(filterActionRaw
                            ? { action: filterActionRaw }
                            : {}),
                          ...(filterTargetType
                            ? { target_type: filterTargetType }
                            : {}),
                          ...(filterFromRaw ? { from: filterFromRaw } : {}),
                          ...(filterToRaw ? { to: filterToRaw } : {}),
                          ...(aiOnly ? { ai_only: "1" } : {}),
                          page: String(pageNum + 1),
                        }).toString()
                      }
                    >
                      Sau
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
