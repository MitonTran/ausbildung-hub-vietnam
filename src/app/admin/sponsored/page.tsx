import Link from "next/link";

import { ContentTypeBadge } from "@/components/content-type-badge";
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
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABEL_VI,
  type ContentType,
  isContentType,
} from "@/lib/content-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import {
  setContentTypeAction,
  toggleFeaturedAction,
} from "./actions";

export const metadata = {
  title: "Quản lý nội dung tài trợ — Admin",
};

export const dynamic = "force-dynamic";

type ArticleRow = {
  id: string;
  title: string;
  slug: string | null;
  content_type: string;
  is_featured: boolean | null;
  sponsor_organization_id: string | null;
  status: string;
  published_at: string | null;
};

type OrganizationRow = {
  id: string;
  brand_name: string;
  slug: string | null;
  org_type: string;
  content_type: string | null;
  is_featured: boolean | null;
  verification_status: string;
};

type JobOrderRow = {
  id: string;
  title: string;
  slug: string | null;
  content_type: string | null;
  is_featured: boolean | null;
  is_sponsored: boolean;
  status: string;
  organization: { brand_name: string } | null;
};

export default async function AdminSponsoredPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container max-w-3xl py-10 text-sm text-muted-foreground">
        Trang này yêu cầu Supabase được cấu hình.
      </div>
    );
  }

  const supabase = createSupabaseAdminClient();

  // Articles
  const { data: articleRows } = await supabase
    .from("articles")
    .select(
      "id, title, slug, content_type, is_featured, sponsor_organization_id, status, published_at",
    )
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(50);
  const articles = (articleRows ?? []) as ArticleRow[];

  // Organizations
  const { data: orgRows } = await supabase
    .from("organizations")
    .select(
      "id, brand_name, slug, org_type, content_type, is_featured, verification_status",
    )
    .is("deleted_at", null)
    .order("brand_name", { ascending: true })
    .limit(50);
  const orgs = (orgRows ?? []) as OrganizationRow[];

  // Job orders
  const { data: jobRows } = await supabase
    .from("job_orders")
    .select(
      `id, title, slug, content_type, is_featured, is_sponsored, status,
       organization:organizations!job_orders_organization_id_fkey(brand_name)`,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  const jobs = (jobRows ?? []) as unknown as JobOrderRow[];

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Quản lý nội dung tài trợ
        </h1>
        <p className="text-sm text-muted-foreground">
          Đặt nhãn nội dung (biên tập / tài trợ / đối tác / người dùng) cho bài
          viết, hồ sơ doanh nghiệp và đơn tuyển. Thao tác trên trang này luôn
          được ghi vào{" "}
          <Link
            href="/admin/audit-logs?action=sponsored_content_label_updated"
            className="underline hover:text-primary"
          >
            audit_logs
          </Link>
          . Trạng thái <strong>Featured</strong> (vị trí nổi bật) được tách
          riêng khỏi badge xác minh — đặt tài trợ không cấp huy hiệu xác minh.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bài viết</CardTitle>
          <CardDescription>{articles.length} bài đang hiển thị.</CardDescription>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có bài viết.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {articles.map((a) => (
                <ContentRow
                  key={a.id}
                  target="article"
                  id={a.id}
                  primary={a.title}
                  secondary={`${a.status} · ${a.slug ?? "—"}`}
                  contentType={a.content_type}
                  isFeatured={a.is_featured ?? false}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Doanh nghiệp / trung tâm</CardTitle>
          <CardDescription>{orgs.length} tổ chức.</CardDescription>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có tổ chức.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {orgs.map((o) => (
                <ContentRow
                  key={o.id}
                  target="organization"
                  id={o.id}
                  primary={o.brand_name}
                  secondary={`${o.org_type} · ${o.verification_status}`}
                  contentType={o.content_type ?? "partner_content"}
                  isFeatured={o.is_featured ?? false}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Đơn tuyển</CardTitle>
          <CardDescription>{jobs.length} đơn tuyển.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có đơn.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {jobs.map((j) => (
                <ContentRow
                  key={j.id}
                  target="job_order"
                  id={j.id}
                  primary={j.title}
                  secondary={`${j.organization?.brand_name ?? "—"} · ${j.status}`}
                  contentType={
                    j.content_type ?? (j.is_sponsored ? "sponsored" : "partner_content")
                  }
                  isFeatured={j.is_featured ?? false}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContentRow({
  target,
  id,
  primary,
  secondary,
  contentType,
  isFeatured,
}: {
  target: "article" | "organization" | "job_order";
  id: string;
  primary: string;
  secondary: string;
  contentType: string;
  isFeatured: boolean;
}) {
  const safeType: ContentType = isContentType(contentType)
    ? contentType
    : "user_generated";

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{primary}</div>
          <div className="text-xs text-muted-foreground">{secondary}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ContentTypeBadge contentType={safeType} />
          {isFeatured ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
              ★ Featured
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <form action={setContentTypeAction} className="space-y-2">
          <input type="hidden" name="target_type" value={target} />
          <input type="hidden" name="target_id" value={id} />
          <label className="block text-xs font-medium uppercase text-muted-foreground">
            Đặt loại nội dung
          </label>
          <Select name="content_type" defaultValue={safeType}>
            {CONTENT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {CONTENT_TYPE_LABEL_VI[ct]}
              </option>
            ))}
          </Select>
          <Textarea
            name="reason"
            rows={2}
            maxLength={500}
            placeholder="Ghi chú lý do đổi nhãn (không bắt buộc)"
          />
          <Button type="submit" size="sm" variant="gradient">
            Lưu nhãn
          </Button>
        </form>

        <form action={toggleFeaturedAction} className="space-y-2">
          <input type="hidden" name="target_type" value={target} />
          <input type="hidden" name="target_id" value={id} />
          <input
            type="hidden"
            name="is_featured"
            value={isFeatured ? "false" : "true"}
          />
          <label className="block text-xs font-medium uppercase text-muted-foreground">
            Vị trí nổi bật (tách riêng khỏi xác minh)
          </label>
          <p className="text-xs text-muted-foreground">
            {isFeatured
              ? "Đang hiển thị ở mục nổi bật trên trang chủ."
              : "Chưa được chọn cho mục nổi bật."}
          </p>
          <Textarea
            name="reason"
            rows={2}
            maxLength={500}
            placeholder="Ghi chú lý do (không bắt buộc)"
          />
          <Button type="submit" size="sm" variant={isFeatured ? "ghost" : "outline"}>
            {isFeatured ? "Bỏ nổi bật" : "Đặt nổi bật"}
          </Button>
        </form>
      </div>
    </li>
  );
}
