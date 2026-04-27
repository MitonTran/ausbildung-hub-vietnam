import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient, getCurrentProfile } from "@/lib/supabase/server";
import {
  USER_STAGES,
  USER_STAGE_LABEL_VI,
  VERIFICATION_STATUS_LABEL_VI,
  VERIFICATION_TYPE_LABEL_VI,
  type UserStage,
  type UserVerificationRow,
  type VerificationStatus,
  type VerificationType,
} from "@/lib/verification";

import { updateSelfDeclaredStageAction } from "./actions";
import { VerificationSubmitForm } from "./submit-form";

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

export const metadata = {
  title: "Xác minh trạng thái — Ausbildung Hub Vietnam",
};

export default async function VerificationDashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("user_verifications")
    .select(
      "id,user_id,requested_stage,verification_type,evidence_summary,evidence_file_paths,status,reviewed_by,reviewed_at,expires_at,rejection_reason,admin_note,created_at,updated_at"
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const list = (requests ?? []) as UserVerificationRow[];
  const hasActivePending = list.some((r) => r.status === "pending");

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Xác minh trạng thái</h1>
        <p className="text-sm text-muted-foreground">
          Tách rõ giữa <strong>trạng thái tự khai</strong> và{" "}
          <strong>trạng thái đã được xác minh</strong>. Ausbildung Hub Vietnam chỉ cấp
          huy hiệu xác minh khi quản trị viên duyệt bằng chứng.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tình trạng hiện tại của bạn</CardTitle>
          <CardDescription>
            Cập nhật trạng thái tự khai bất cứ lúc nào — chưa cần bằng chứng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Trạng thái tự khai
              </dt>
              <dd className="font-medium">
                {USER_STAGE_LABEL_VI[profile.self_declared_stage as UserStage] ??
                  profile.self_declared_stage ??
                  "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Trạng thái đã xác minh
              </dt>
              <dd className="font-medium">
                {profile.verified_stage ? (
                  <span className="inline-flex items-center gap-2">
                    {USER_STAGE_LABEL_VI[
                      profile.verified_stage as UserStage
                    ] ?? profile.verified_stage}
                    <Badge variant="success">Đã xác minh</Badge>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Chưa xác minh</span>
                )}
              </dd>
            </div>
          </dl>

          <form
            action={updateSelfDeclaredStageAction}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-1">
              <label
                htmlFor="self_declared_stage"
                className="block text-xs font-medium text-muted-foreground"
              >
                Cập nhật trạng thái tự khai
              </label>
              <Select
                id="self_declared_stage"
                name="self_declared_stage"
                defaultValue={profile.self_declared_stage ?? "exploring"}
              >
                {USER_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {USER_STAGE_LABEL_VI[s]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Lưu
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gửi yêu cầu xác minh</CardTitle>
          <CardDescription>
            Đính kèm bằng chứng để được cấp huy hiệu xác minh. Đừng upload tài
            liệu của người khác hoặc dữ liệu nhạy cảm không cần thiết.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasActivePending ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              Bạn đã có một yêu cầu đang chờ duyệt. Bạn có thể gửi yêu cầu mới
              cho giai đoạn khác, hoặc đợi quản trị viên phản hồi yêu cầu hiện
              tại.
            </p>
          ) : null}
          <div className={hasActivePending ? "mt-4" : undefined}>
            <VerificationSubmitForm
              defaultStage={profile.self_declared_stage ?? "exploring"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử yêu cầu của bạn</CardTitle>
          <CardDescription>
            Mỗi dòng là một yêu cầu xác minh đã gửi. Bằng chứng bạn upload không
            được chia sẻ với người dùng khác.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bạn chưa gửi yêu cầu xác minh nào.
            </p>
          ) : (
            <ul className="space-y-3">
              {list.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-border/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[r.status] ?? "default"}>
                      {VERIFICATION_STATUS_LABEL_VI[r.status]}
                    </Badge>
                    <span className="font-medium">
                      {USER_STAGE_LABEL_VI[r.requested_stage as UserStage] ??
                        r.requested_stage}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ·{" "}
                      {VERIFICATION_TYPE_LABEL_VI[
                        r.verification_type as VerificationType
                      ] ?? r.verification_type}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Gửi {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {r.evidence_summary ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      Ghi chú: {r.evidence_summary}
                    </p>
                  ) : null}
                  {r.rejection_reason ? (
                    <p className="mt-2 text-xs text-red-500">
                      Lý do từ chối: {r.rejection_reason}
                    </p>
                  ) : null}
                  {r.admin_note ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Yêu cầu bổ sung: {r.admin_note}
                    </p>
                  ) : null}
                  {r.expires_at ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Hết hạn: {new Date(r.expires_at).toLocaleDateString("vi-VN")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {r.evidence_file_paths?.length ?? 0} tệp bằng chứng
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
