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
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import {
  REVIEW_MODERATION_STATUS_LABEL_VI,
  REVIEW_RELATIONSHIP_LABEL_VI,
  REVIEW_TYPE_LABEL_VI,
  basenameFromPath,
  type ReviewModerationStatus,
  type ReviewRelationship,
  type ReviewRow,
  type ReviewType,
} from "@/lib/reviews";
import { USER_STAGE_LABEL_VI, type UserStage } from "@/lib/verification";

import {
  approveReviewAction,
  escalateReviewToDisputeAction,
  redactAndPublishReviewAction,
  rejectReviewAction,
  requestReviewProofAction,
} from "../actions";

const STATUS_VARIANT: Record<
  ReviewModerationStatus,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  pending: "warning",
  approved: "success",
  published: "success",
  rejected: "destructive",
  need_more_info: "warning",
  hidden: "outline",
  under_dispute: "warning",
  removed: "destructive",
};

type ReviewDetail = ReviewRow & {
  reviewer:
    | {
        id: string;
        full_name: string | null;
        email: string | null;
        verified_stage: string | null;
      }
    | null;
  organization:
    | {
        id: string;
        brand_name: string;
        slug: string | null;
        org_type: string;
      }
    | null;
};

export default async function AdminReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, reviewer_id, target_type, target_id, review_type, relationship_to_target, rating, title, content, proof_status, proof_file_paths, moderation_status, published_at, rejected_reason, right_to_reply, reply_by, reply_at, dispute_status, created_at, updated_at, deleted_at,
       reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, email, verified_stage)`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }
  const v = data as unknown as ReviewDetail;

  // Best-effort org lookup; reviews may target other entity types in
  // the future but the current submit flow only inserts target_type
  // = 'organization'.
  let organization: ReviewDetail["organization"] = null;
  if (v.target_type === "organization") {
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("id, brand_name, slug, org_type")
      .eq("id", v.target_id)
      .maybeSingle();
    organization =
      (orgRow as ReviewDetail["organization"]) ?? null;
  }

  const profile = await getCurrentProfile();
  const isAdmin = isAdminRole(profile?.role ?? null);

  const isOpen =
    v.moderation_status === "pending" ||
    v.moderation_status === "approved" ||
    v.moderation_status === "need_more_info";

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/reviews"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <div className="space-y-2">
        <Badge variant={STATUS_VARIANT[v.moderation_status] ?? "default"}>
          {REVIEW_MODERATION_STATUS_LABEL_VI[v.moderation_status]}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          {v.title || "(Không có tiêu đề)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {REVIEW_TYPE_LABEL_VI[v.review_type as ReviewType] ?? v.review_type} ·{" "}
          {v.rating ?? "—"}★ · gửi{" "}
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
                Người gửi
              </dt>
              <dd>
                {v.reviewer?.full_name ||
                  v.reviewer?.email ||
                  v.reviewer_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Trạng thái xác minh người gửi
              </dt>
              <dd>
                {v.reviewer?.verified_stage
                  ? USER_STAGE_LABEL_VI[
                      v.reviewer.verified_stage as UserStage
                    ] ?? v.reviewer.verified_stage
                  : "Chưa xác minh"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Mối quan hệ tự khai
              </dt>
              <dd>
                {REVIEW_RELATIONSHIP_LABEL_VI[
                  v.relationship_to_target as ReviewRelationship
                ] ?? v.relationship_to_target}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Đơn vị được đánh giá
              </dt>
              <dd>
                {organization
                  ? organization.brand_name +
                    (organization.slug ? ` (/${organization.slug})` : "")
                  : v.target_id}
              </dd>
            </div>
            {v.published_at ? (
              <div>
                <dt className="text-xs uppercase text-muted-foreground">
                  Đã đăng
                </dt>
                <dd>
                  {new Date(v.published_at).toLocaleString("vi-VN")}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Trạng thái bằng chứng
              </dt>
              <dd>{v.proof_status}</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs uppercase text-muted-foreground">Nội dung</p>
            <p className="whitespace-pre-wrap rounded-md border border-border/40 bg-background/40 p-3">
              {v.content}
            </p>
          </div>
          {v.rejected_reason ? (
            <p className="rounded-md bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-300">
              Ghi chú với người dùng: {v.rejected_reason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bằng chứng đính kèm</CardTitle>
          <CardDescription>
            File trong bucket riêng tư <code>review-proof-private</code>. Không
            chia sẻ link ra ngoài.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {v.proof_file_paths && v.proof_file_paths.length > 0 ? (
            <ul className="space-y-1">
              {v.proof_file_paths.map((path) => (
                <li
                  key={path}
                  className="rounded-md border border-border/40 p-2 font-mono text-xs"
                >
                  {basenameFromPath(path)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Người dùng không đính kèm bằng chứng.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hành động kiểm duyệt</CardTitle>
          <CardDescription>
            Mọi hành động đều được ghi vào audit_logs với người thực hiện và
            trạng thái trước / sau.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isOpen ? (
            <>
              <form action={approveReviewAction} className="space-y-2">
                <input type="hidden" name="review_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Ghi chú khi duyệt (không bắt buộc)
                </label>
                <Textarea name="reason" rows={2} maxLength={500} />
                <Button type="submit" variant="gradient">
                  Duyệt và xuất bản
                </Button>
              </form>

              <form action={requestReviewProofAction} className="space-y-2">
                <input type="hidden" name="review_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Yêu cầu bổ sung bằng chứng (sẽ hiển thị cho người dùng)
                </label>
                <Textarea
                  name="admin_note"
                  rows={2}
                  maxLength={1000}
                  required
                />
                <Button type="submit" variant="outline">
                  Yêu cầu bổ sung bằng chứng
                </Button>
              </form>

              <form action={rejectReviewAction} className="space-y-2">
                <input type="hidden" name="review_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Lý do từ chối (sẽ hiển thị cho người dùng)
                </label>
                <Textarea
                  name="rejected_reason"
                  rows={2}
                  maxLength={500}
                  required
                  placeholder="VD: Đánh giá vi phạm điều khoản, có thông tin cá nhân của người khác..."
                />
                <Button type="submit" variant="ghost">
                  Từ chối
                </Button>
              </form>
            </>
          ) : null}

          <form action={redactAndPublishReviewAction} className="space-y-2">
            <input type="hidden" name="review_id" value={v.id} />
            <label className="block text-xs font-medium uppercase text-muted-foreground">
              Biên tập (gỡ thông tin nhạy cảm) và xuất bản
            </label>
            <Textarea
              name="redacted_content"
              rows={6}
              minLength={30}
              maxLength={5000}
              defaultValue={v.content}
              required
            />
            <Textarea
              name="reason"
              rows={2}
              maxLength={500}
              placeholder="Lý do biên tập"
            />
            <Button type="submit" variant="outline">
              Biên tập và xuất bản
            </Button>
          </form>

          {isAdmin ? (
            <form action={escalateReviewToDisputeAction} className="space-y-2">
              <input type="hidden" name="review_id" value={v.id} />
              <label className="block text-xs font-medium uppercase text-muted-foreground">
                Chuyển sang xử lý tranh chấp (chỉ admin)
              </label>
              <Textarea
                name="summary"
                rows={3}
                maxLength={5000}
                required
                placeholder="Tóm tắt lý do chuyển dispute..."
              />
              <Button type="submit" variant="ghost">
                Chuyển sang dispute
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
