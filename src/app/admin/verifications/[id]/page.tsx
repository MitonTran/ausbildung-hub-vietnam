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
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  USER_STAGE_LABEL_VI,
  VERIFICATION_STATUS_LABEL_VI,
  VERIFICATION_TYPE_LABEL_VI,
  basenameFromPath,
  type UserStage,
  type UserVerificationRow,
  type VerificationStatus,
  type VerificationType,
} from "@/lib/verification";

import {
  approveVerificationAction,
  rejectVerificationAction,
  requestMoreInfoAction,
  expireOrRevokeVerificationAction,
} from "../actions";

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

type VerificationDetail = UserVerificationRow & {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    self_declared_stage: string | null;
    verified_stage: string | null;
    verification_status: string;
  } | null;
  reviewer:
    | { id: string; full_name: string | null; email: string | null }
    | null;
};

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_verifications")
    .select(
      `id,user_id,requested_stage,verification_type,evidence_summary,evidence_file_paths,status,reviewed_by,reviewed_at,expires_at,rejection_reason,admin_note,created_at,updated_at,
       profile:profiles!user_verifications_user_id_fkey(id,full_name,email,self_declared_stage,verified_stage,verification_status),
       reviewer:profiles!user_verifications_reviewed_by_fkey(id,full_name,email)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }
  const v = data as unknown as VerificationDetail;

  const isPending = v.status === "pending" || v.status === "need_more_info";
  const isApproved = v.status === "approved";

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/verifications"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <div className="space-y-2">
        <Badge variant={STATUS_VARIANT[v.status] ?? "default"}>
          {VERIFICATION_STATUS_LABEL_VI[v.status]}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          {USER_STAGE_LABEL_VI[v.requested_stage as UserStage] ?? v.requested_stage}
        </h1>
        <p className="text-sm text-muted-foreground">
          Yêu cầu của{" "}
          <span className="font-medium">
            {v.profile?.full_name || v.profile?.email || v.user_id}
          </span>
          , gửi{" "}
          {new Date(v.created_at).toLocaleString("vi-VN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chi tiết</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Loại bằng chứng
              </dt>
              <dd>
                {VERIFICATION_TYPE_LABEL_VI[
                  v.verification_type as VerificationType
                ] ?? v.verification_type}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Trạng thái tự khai (profile)
              </dt>
              <dd>
                {USER_STAGE_LABEL_VI[
                  v.profile?.self_declared_stage as UserStage
                ] ??
                  v.profile?.self_declared_stage ??
                  "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Trạng thái đã xác minh (profile)
              </dt>
              <dd>
                {v.profile?.verified_stage
                  ? USER_STAGE_LABEL_VI[
                      v.profile.verified_stage as UserStage
                    ] ?? v.profile.verified_stage
                  : "Chưa xác minh"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Người duyệt
              </dt>
              <dd>
                {v.reviewer?.full_name ||
                  v.reviewer?.email ||
                  (v.reviewed_by ? v.reviewed_by : "—")}
                {v.reviewed_at
                  ? ` · ${new Date(v.reviewed_at).toLocaleString("vi-VN")}`
                  : ""}
              </dd>
            </div>
            {v.expires_at ? (
              <div>
                <dt className="text-xs uppercase text-muted-foreground">
                  Hết hạn
                </dt>
                <dd>{new Date(v.expires_at).toLocaleDateString("vi-VN")}</dd>
              </div>
            ) : null}
          </dl>

          {v.evidence_summary ? (
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Ghi chú từ người dùng
              </p>
              <p className="whitespace-pre-wrap">{v.evidence_summary}</p>
            </div>
          ) : null}
          {v.rejection_reason ? (
            <p className="rounded-md bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-300">
              Lý do từ chối: {v.rejection_reason}
            </p>
          ) : null}
          {v.admin_note ? (
            <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300">
              Ghi chú quản trị: {v.admin_note}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bằng chứng</CardTitle>
          <CardDescription>
            Mở qua link tạm thời do server cấp (hết hạn sau 10 phút). Không
            chia sẻ link ra bên ngoài.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {v.evidence_file_paths && v.evidence_file_paths.length > 0 ? (
            v.evidence_file_paths.map((path, idx) => (
              <a
                key={path}
                href={`/admin/verifications/${v.id}/file?index=${idx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md border border-border/40 p-2 text-sm hover:bg-muted/40"
              >
                <span className="font-medium">{idx + 1}.</span>{" "}
                {basenameFromPath(path)}
              </a>
            ))
          ) : (
            <p className="text-muted-foreground">Không có tệp đính kèm.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hành động</CardTitle>
          <CardDescription>
            Mọi hành động đều được ghi vào audit_logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isPending ? (
            <>
              <form action={approveVerificationAction} className="space-y-2">
                <input type="hidden" name="verification_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Ghi chú khi duyệt (không bắt buộc)
                </label>
                <Textarea name="reason" rows={2} maxLength={500} />
                <Button type="submit" variant="gradient">
                  Duyệt — cấp huy hiệu
                </Button>
              </form>

              <form action={requestMoreInfoAction} className="space-y-2">
                <input type="hidden" name="verification_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Yêu cầu bổ sung thông tin (sẽ hiển thị cho người dùng)
                </label>
                <Textarea name="admin_note" rows={2} maxLength={1000} required />
                <Button type="submit" variant="outline">
                  Yêu cầu bổ sung
                </Button>
              </form>

              <form action={rejectVerificationAction} className="space-y-2">
                <input type="hidden" name="verification_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Lý do từ chối (sẽ hiển thị cho người dùng)
                </label>
                <Textarea
                  name="rejection_reason"
                  rows={2}
                  maxLength={500}
                  required
                  placeholder="VD: Tài liệu không rõ ràng, không khớp danh tính..."
                />
                <Button type="submit" variant="ghost">
                  Từ chối
                </Button>
              </form>
            </>
          ) : null}

          {isApproved ? (
            <>
              <form
                action={expireOrRevokeVerificationAction}
                className="space-y-2"
              >
                <input type="hidden" name="verification_id" value={v.id} />
                <input type="hidden" name="mode" value="expire" />
                <p className="text-xs text-muted-foreground">
                  Đánh dấu đã hết hạn (xóa huy hiệu xác minh nếu vẫn đang gắn ở
                  giai đoạn này).
                </p>
                <Button type="submit" variant="outline">
                  Đánh dấu hết hạn
                </Button>
              </form>

              <form
                action={expireOrRevokeVerificationAction}
                className="space-y-2"
              >
                <input type="hidden" name="verification_id" value={v.id} />
                <input type="hidden" name="mode" value="revoke" />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Lý do thu hồi (bắt buộc)
                </label>
                <Textarea name="reason" rows={2} maxLength={500} required />
                <Button type="submit" variant="ghost">
                  Thu hồi xác minh
                </Button>
              </form>
            </>
          ) : null}

          {!isPending && !isApproved ? (
            <p className="text-sm text-muted-foreground">
              Yêu cầu này không còn ở trạng thái có thể tác động. Mở yêu cầu mới
              nếu cần.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
