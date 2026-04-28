import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DISPUTE_RESOLUTIONS,
  DISPUTE_RESOLUTION_LABEL_VI,
  DISPUTE_STATUS_LABEL_VI,
  DISPUTE_TARGET_TYPE_LABEL_VI,
  DISPUTE_TYPE_LABEL_VI,
  type DisputeCaseRow,
} from "@/lib/disputes";
import { formatDate } from "@/lib/utils";

import {
  assignDisputeAction,
  closeDisputeAction,
  rejectDisputeAction,
  reopenDisputeAction,
  requestMoreInfoAction,
  resolveDisputeAction,
  updateInternalNoteAction,
} from "../actions";

type DisputeProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
} | null;

type DisputeDetail = DisputeCaseRow & {
  opener: DisputeProfile;
  assignee: DisputeProfile;
  resolver: DisputeProfile;
};

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("dispute_cases")
    .select(
      `id,opened_by,target_type,target_id,dispute_type,summary,evidence_file_paths,status,assigned_to,resolution,resolved_by,resolved_at,internal_note,created_at,updated_at,
       opener:profiles!dispute_cases_opened_by_fkey(id,full_name,email),
       assignee:profiles!dispute_cases_assigned_to_fkey(id,full_name,email),
       resolver:profiles!dispute_cases_resolved_by_fkey(id,full_name,email)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    console.error("[admin/disputes/[id]]", error);
  }
  if (!data) notFound();

  const dispute = (data as unknown) as DisputeDetail;
  const isTerminal =
    dispute.status === "resolved" ||
    dispute.status === "rejected" ||
    dispute.status === "closed";

  // Pull related dispute audit history for context.
  const { data: auditRows } = await supabase
    .from("audit_logs")
    .select(
      "id,action,actor_id,actor_type,changed_fields,before_data,after_data,reason,human_approved,created_at"
    )
    .eq("target_type", "dispute_case")
    .eq("target_id", dispute.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-1">
        <Link
          href="/admin/disputes"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Hàng đợi khiếu nại
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {DISPUTE_TYPE_LABEL_VI[dispute.dispute_type]}
          </h1>
          <Badge variant={isTerminal ? "secondary" : "warning"}>
            {DISPUTE_STATUS_LABEL_VI[dispute.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {DISPUTE_TARGET_TYPE_LABEL_VI[dispute.target_type]} ·{" "}
            <code className="text-xs">{dispute.target_id}</code>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Mở ngày {formatDate(dispute.created_at)} · Người mở{" "}
          {dispute.opener?.full_name ?? "—"}
          {dispute.opener?.email ? ` (${dispute.opener.email})` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mô tả khiếu nại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-line">{dispute.summary}</p>
          {dispute.evidence_file_paths &&
          dispute.evidence_file_paths.length > 0 ? (
            <div className="rounded-md border border-border/40 bg-muted/30 p-3 text-xs">
              <div className="font-medium">
                {dispute.evidence_file_paths.length} tệp bằng chứng (riêng tư)
              </div>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {dispute.evidence_file_paths.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">
                Bằng chứng phải được truy cập qua signed URL từ admin client.
                Không hiển thị công khai.
              </p>
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Người phụ trách:</span>{" "}
              {dispute.assignee?.full_name ?? "Chưa phân công"}
            </div>
            {dispute.resolver ? (
              <div>
                <span className="font-medium">Người giải quyết:</span>{" "}
                {dispute.resolver.full_name ?? dispute.resolver.email ?? "—"}
                {dispute.resolved_at
                  ? ` · ${formatDate(dispute.resolved_at)}`
                  : null}
              </div>
            ) : null}
            {dispute.resolution ? (
              <div>
                <span className="font-medium">Kết quả:</span>{" "}
                {DISPUTE_RESOLUTION_LABEL_VI[dispute.resolution]}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!isTerminal ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phân công & xác minh</CardTitle>
              <CardDescription>
                Nhận case về xử lý hoặc yêu cầu thêm thông tin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={assignDisputeAction}>
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <Button type="submit" variant="outline" size="sm">
                  Nhận xử lý (assign to me)
                </Button>
              </form>

              <form action={requestMoreInfoAction} className="space-y-2">
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <Select name="from" defaultValue="user" required>
                  <option value="user">
                    Yêu cầu thông tin từ người dùng (waiting_for_user)
                  </option>
                  <option value="organization">
                    Yêu cầu thông tin từ tổ chức (waiting_for_organization)
                  </option>
                </Select>
                <Textarea
                  name="internal_note"
                  rows={2}
                  placeholder="Ghi chú nội bộ (không hiển thị công khai)"
                />
                <Button type="submit" variant="outline" size="sm">
                  Yêu cầu thêm thông tin
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quyết định</CardTitle>
              <CardDescription>
                Mỗi quyết định đều ghi audit_logs và không thể xóa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={resolveDisputeAction} className="space-y-2">
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <Select name="resolution" required defaultValue="">
                  <option value="" disabled>
                    -- Chọn kết quả xử lý --
                  </option>
                  {DISPUTE_RESOLUTIONS.map((r) => (
                    <option key={r} value={r}>
                      {DISPUTE_RESOLUTION_LABEL_VI[r]}
                    </option>
                  ))}
                </Select>
                <Textarea
                  name="internal_note"
                  rows={2}
                  placeholder="Ghi chú nội bộ"
                />
                <Button type="submit" variant="gradient" size="sm">
                  Giải quyết
                </Button>
              </form>

              <form action={rejectDisputeAction} className="space-y-2">
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <Textarea
                  name="internal_note"
                  rows={2}
                  placeholder="Lý do từ chối khiếu nại"
                />
                <Button type="submit" variant="outline" size="sm">
                  Từ chối khiếu nại
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mở lại / đóng case</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <form action={reopenDisputeAction}>
              <input type="hidden" name="dispute_id" value={dispute.id} />
              <Button type="submit" variant="outline" size="sm">
                Mở lại khiếu nại
              </Button>
            </form>
            {dispute.status !== "closed" ? (
              <form action={closeDisputeAction}>
                <input type="hidden" name="dispute_id" value={dispute.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Đóng case
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ghi chú nội bộ</CardTitle>
          <CardDescription>
            Chỉ admin/moderator nhìn thấy. Không hiển thị cho người mở case
            hoặc tổ chức bị khiếu nại.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateInternalNoteAction} className="space-y-2">
            <input type="hidden" name="dispute_id" value={dispute.id} />
            <Textarea
              name="internal_note"
              rows={4}
              defaultValue={dispute.internal_note ?? ""}
              placeholder="Ghi chú điều tra, mã ticket nội bộ, v.v."
            />
            <Button type="submit" variant="outline" size="sm">
              Lưu ghi chú
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử kiểm toán</CardTitle>
          <CardDescription>
            Tất cả thao tác trên khiếu nại này, theo thứ tự mới nhất trước.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditRows && auditRows.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {auditRows.map((row) => (
                <li
                  key={row.id as string}
                  className="rounded-md border border-border/30 p-2"
                >
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-[11px]">
                      {row.action as string}
                    </code>
                    <span className="text-muted-foreground">
                      {formatDate(row.created_at as string)}
                    </span>
                  </div>
                  {row.reason ? (
                    <p className="mt-1 text-muted-foreground">
                      {row.reason as string}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chưa có sự kiện kiểm toán nào.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
