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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationVerificationBadge } from "@/components/organization-verification-badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  ORG_TYPE_LABEL_VI,
  ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI,
  ORG_VERIFICATION_STATUS_LABEL_VI,
  ORG_VERIFICATION_REQUESTABLE_LABEL_VI,
  type OrganizationRow,
  type OrgType,
  type OrganizationVerificationRow,
  type OrgVerificationRequestStatus,
  type OrgVerificationRequestable,
} from "@/lib/organization";

import { updateOrganizationProfileAction } from "./actions";
import { OrgVerificationSubmitForm } from "./submit-form";

export const metadata = {
  title: "Quản lý tổ chức — Ausbildung Hub Vietnam",
};

const REQUEST_STATUS_VARIANT: Record<
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

export default async function OrganizationDashboardDetailPage({
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

  const { data: orgRaw } = await admin
    .from("organizations")
    .select(
      "id, org_type, legal_name, brand_name, slug, country, city, address, website_url, contact_email, contact_phone, description, services, verification_status, trust_badge, last_verified_at, verification_expires_at, last_updated_by_org_at, risk_score, is_published, is_suspended, created_at, updated_at"
    )
    .eq("id", params.orgId)
    .maybeSingle();
  if (!orgRaw) notFound();
  const org = orgRaw as OrganizationRow;

  const { data: verificationsRaw } = await admin
    .from("organization_verifications")
    .select(
      "id, organization_id, requested_status, submitted_by, document_file_paths, document_summary, fee_disclosure, status, reviewed_by, reviewed_at, expires_at, rejection_reason, admin_note, created_at, updated_at"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });
  const verifications = (verificationsRaw ??
    []) as OrganizationVerificationRow[];

  const hasOpenRequest = verifications.some(
    (v) => v.status === "pending" || v.status === "need_more_info"
  );

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href="/dashboard/organization"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tất cả tổ chức của bạn
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {org.brand_name}
          </h1>
          <OrganizationVerificationBadge org={org} />
          {org.is_suspended ? (
            <Badge variant="destructive">Tổ chức đang bị tạm ẩn</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {ORG_TYPE_LABEL_VI[org.org_type as OrgType] ?? org.org_type}
          {org.city ? ` · ${org.city}` : ""} ·{" "}
          <span className="uppercase">{membership.member_role}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trạng thái xác minh hiện tại</CardTitle>
          <CardDescription>
            Trạng thái này hiển thị công khai trên trang giới thiệu của tổ chức.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Mức xác minh
              </dt>
              <dd className="font-medium">
                {ORG_VERIFICATION_STATUS_LABEL_VI[org.verification_status]}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Lần xác minh gần nhất
              </dt>
              <dd>
                {org.last_verified_at
                  ? new Date(org.last_verified_at).toLocaleDateString("vi-VN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Hết hạn
              </dt>
              <dd>
                {org.verification_expires_at
                  ? new Date(org.verification_expires_at).toLocaleDateString(
                      "vi-VN"
                    )
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">
                Cập nhật hồ sơ gần nhất
              </dt>
              <dd>
                {org.last_updated_by_org_at
                  ? new Date(org.last_updated_by_org_at).toLocaleDateString(
                      "vi-VN"
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="rounded-md border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
            Thanh toán hoặc gói tài trợ KHÔNG đồng nghĩa với xác minh. Huy
            hiệu xác minh chỉ được cấp sau khi quản trị viên duyệt hồ sơ.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hồ sơ tổ chức</CardTitle>
          <CardDescription>
            Thông tin công khai. Chỉnh sửa các trường này không tự động cấp
            huy hiệu — bạn cần gửi yêu cầu xác minh để admin duyệt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updateOrganizationProfileAction}
            className="space-y-4"
          >
            <input type="hidden" name="organization_id" value={org.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Tên thương hiệu / công khai"
                name="brand_name"
                defaultValue={org.brand_name}
                required
              />
              <Field
                label="Tên pháp lý"
                name="legal_name"
                defaultValue={org.legal_name ?? ""}
              />
              <Field
                label="Quốc gia"
                name="country"
                defaultValue={org.country ?? ""}
              />
              <Field
                label="Thành phố"
                name="city"
                defaultValue={org.city ?? ""}
              />
              <Field
                label="Địa chỉ"
                name="address"
                defaultValue={org.address ?? ""}
                className="sm:col-span-2"
              />
              <Field
                label="Website"
                name="website_url"
                defaultValue={org.website_url ?? ""}
                placeholder="https://"
              />
              <Field
                label="Email liên hệ"
                name="contact_email"
                defaultValue={org.contact_email ?? ""}
                type="email"
              />
              <Field
                label="Điện thoại liên hệ"
                name="contact_phone"
                defaultValue={org.contact_phone ?? ""}
              />
              <Field
                label="Dịch vụ (cách nhau bằng dấu phẩy)"
                name="services"
                defaultValue={(org.services ?? []).join(", ")}
                className="sm:col-span-2"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                Mô tả tổ chức
              </label>
              <Textarea
                id="description"
                name="description"
                rows={6}
                maxLength={4000}
                defaultValue={org.description ?? ""}
                placeholder="Giới thiệu ngắn về tổ chức của bạn — chương trình đào tạo, kinh nghiệm hợp tác với Ausbildung..."
              />
            </div>

            <Button type="submit" variant="outline">
              Lưu hồ sơ
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gửi yêu cầu xác minh</CardTitle>
          <CardDescription>
            Đính kèm tài liệu chứng minh và yêu cầu cấp huy hiệu. Mọi yêu cầu
            đều được ghi vào audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgVerificationSubmitForm
            organizationId={org.id}
            hasOpenRequest={hasOpenRequest}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử xác minh</CardTitle>
          <CardDescription>
            Mỗi dòng là một yêu cầu xác minh đã gửi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bạn chưa gửi yêu cầu xác minh nào.
            </p>
          ) : (
            <ul className="space-y-3">
              {verifications.map((v) => (
                <li
                  key={v.id}
                  className="rounded-md border border-border/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={REQUEST_STATUS_VARIANT[v.status] ?? "default"}>
                      {ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI[v.status]}
                    </Badge>
                    <span className="font-medium">
                      {ORG_VERIFICATION_REQUESTABLE_LABEL_VI[
                        v.requested_status as OrgVerificationRequestable
                      ] ?? v.requested_status}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Gửi {new Date(v.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {v.document_summary ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      Mô tả: {v.document_summary}
                    </p>
                  ) : null}
                  {v.rejection_reason ? (
                    <p className="mt-2 text-xs text-red-500">
                      Lý do từ chối: {v.rejection_reason}
                    </p>
                  ) : null}
                  {v.admin_note ? (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Ghi chú quản trị: {v.admin_note}
                    </p>
                  ) : null}
                  {v.expires_at ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Hết hạn: {new Date(v.expires_at).toLocaleDateString("vi-VN")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {v.document_file_paths?.length ?? 0} tài liệu đính kèm
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

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`.trim()}>
      <label htmlFor={name} className="block text-xs font-medium uppercase text-muted-foreground">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
