import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewForm } from "@/components/review-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { OrganizationRow, OrgType } from "@/lib/organization";
import {
  REVIEW_TYPE_LABEL_VI,
  REVIEW_VERIFIED_GENERIC_LABEL_VI,
  VERIFIED_STAGE_RELATIONSHIPS,
  eligibleReviewTypesFor,
  reviewRelationshipVerifiedLabelVi,
  type ReviewRelationship,
  type ReviewRow,
  type ReviewType,
} from "@/lib/reviews";
import type { UserStage } from "@/lib/verification";

type PublishedReview = Pick<
  ReviewRow,
  | "id"
  | "rating"
  | "title"
  | "content"
  | "review_type"
  | "relationship_to_target"
  | "published_at"
  | "created_at"
> & {
  reviewer:
    | { full_name: string | null; avatar_url: string | null }
    | null;
};

async function loadPublishedReviews(
  organizationId: string
): Promise<PublishedReview[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("reviews")
    .select(
      `id, rating, title, content, review_type, relationship_to_target, published_at, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)`
    )
    .eq("target_type", "organization")
    .eq("target_id", organizationId)
    .eq("moderation_status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(50);
  return (data as unknown as PublishedReview[]) ?? [];
}

function VerifiedReviewBadges({
  relationship,
}: {
  relationship: ReviewRelationship;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="verified">
        <ShieldCheck className="h-3 w-3" />
        {REVIEW_VERIFIED_GENERIC_LABEL_VI}
      </Badge>
      <Badge variant="success">
        {reviewRelationshipVerifiedLabelVi(relationship)}
      </Badge>
    </div>
  );
}

function StarRow({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < r
              ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}

/**
 * Server component rendered on org profile pages
 * (/centers/[slug], /companies/[slug]) when the organization has a
 * real DB row.
 *
 * Responsibilities:
 *   - List published, non-deleted reviews for this organization with
 *     verification labels.
 *   - Resolve the current user's eligibility server-side and decide
 *     whether to render the submission form.
 *   - Surface helpful CTAs (login / verify) when the user is not yet
 *     eligible.
 */
export async function ReviewSection({
  organization,
}: {
  organization: Pick<OrganizationRow, "id" | "org_type" | "is_suspended">;
}) {
  const reviews = await loadPublishedReviews(organization.id);
  const profile = await getCurrentProfile();

  const verifiedStage = (profile?.verified_stage ?? null) as UserStage | null;
  const orgType = organization.org_type as OrgType;

  const eligibleReviewTypes = eligibleReviewTypesFor({
    orgType,
    verifiedStage,
  });
  const eligibleRelationships: ReadonlyArray<ReviewRelationship> = verifiedStage
    ? VERIFIED_STAGE_RELATIONSHIPS[verifiedStage]
    : [];

  const canReview =
    !!profile &&
    !organization.is_suspended &&
    eligibleReviewTypes.length > 0 &&
    eligibleRelationships.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Đánh giá có kiểm chứng</CardTitle>
            <Badge variant="outline">{reviews.length} đã đăng</Badge>
          </div>
          <CardDescription>
            Mọi đánh giá đều được kiểm chứng dựa trên trạng thái xác minh của
            người gửi và phải qua bước duyệt của quản trị viên trước khi hiển
            thị công khai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có đánh giá nào được công bố cho đơn vị này.
            </p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="space-y-2 rounded-xl border border-border/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">
                      {r.reviewer?.full_name ?? "Người dùng đã xác minh"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ·{" "}
                      {REVIEW_TYPE_LABEL_VI[r.review_type as ReviewType] ??
                        r.review_type}
                    </span>
                  </div>
                  <StarRow rating={r.rating} />
                </div>
                <VerifiedReviewBadges
                  relationship={r.relationship_to_target as ReviewRelationship}
                />
                {r.title ? (
                  <div className="text-sm font-semibold">{r.title}</div>
                ) : null}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.content}
                </p>
                <div className="text-[11px] text-muted-foreground">
                  Đăng{" "}
                  {new Date(
                    r.published_at ?? r.created_at
                  ).toLocaleDateString("vi-VN")}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gửi đánh giá có kiểm chứng</CardTitle>
          <CardDescription>
            Chỉ người dùng có trạng thái xác minh phù hợp mới được gửi đánh giá
            chính thức cho từng loại nội dung. Đánh giá sẽ chuyển sang trạng
            thái <strong>chờ duyệt</strong> và chỉ hiển thị sau khi quản trị
            viên phê duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organization.is_suspended ? (
            <p className="text-sm text-muted-foreground">
              Đơn vị này đang bị tạm ẩn — không nhận đánh giá mới.
            </p>
          ) : !profile ? (
            <p className="text-sm text-muted-foreground">
              Vui lòng{" "}
              <Link href="/login" className="font-medium underline">
                đăng nhập
              </Link>{" "}
              để gửi đánh giá có kiểm chứng.
            </p>
          ) : !verifiedStage ? (
            <p className="text-sm text-muted-foreground">
              Bạn chưa được xác minh trạng thái. Hãy gửi yêu cầu tại{" "}
              <Link
                href="/dashboard/verification"
                className="font-medium underline"
              >
                Dashboard → Xác minh trạng thái
              </Link>{" "}
              trước khi gửi đánh giá chính thức.
            </p>
          ) : !canReview ? (
            <p className="text-sm text-muted-foreground">
              Trạng thái đã xác minh hiện tại của bạn không đủ điều kiện để
              đánh giá đơn vị này. Mỗi loại đánh giá yêu cầu một mức xác minh
              khác nhau theo Trust Engine.
            </p>
          ) : (
            <ReviewForm
              organizationId={organization.id}
              eligibleReviewTypes={eligibleReviewTypes}
              eligibleRelationships={eligibleRelationships}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
