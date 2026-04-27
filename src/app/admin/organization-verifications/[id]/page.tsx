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
import { OrganizationVerificationBadge } from "@/components/organization-verification-badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ORG_TYPE_LABEL_VI,
  ORG_VERIFICATION_REQUESTABLE_LABEL_VI,
  ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI,
  ORG_VERIFICATION_STATUS_LABEL_VI,
  basenameFromPath,
  type OrganizationRow,
  type OrganizationVerificationRow,
  type OrgType,
  type OrgVerificationRequestStatus,
  type OrgVerificationRequestable,
} from "@/lib/organization";

import {
  approveOrganizationVerificationAction,
  expireOrganizationVerificationAction,
  rejectOrganizationVerificationAction,
  requestOrganizationMoreInfoAction,
  suspendOrganizationAction,
} from "../actions";

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

type VerificationDetail = OrganizationVerificationRow & {
  organization: OrganizationRow | null;
  submitter:
    | { id: string; full_name: string | null; email: string | null }
    | null;
  reviewer:
    | { id: string; full_name: string | null; email: string | null }
    | null;
};

export default async function AdminOrgVerificationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organization_verifications")
    .select(
      `id, organization_id, requested_status, granted_status, submitted_by, document_file_paths, document_summary, fee_disclosure, status, reviewed_by, reviewed_at, expires_at, rejection_reason, admin_note, created_at, updated_at,
       organization:organizations!organization_verifications_organization_id_fkey(
         id, org_type, legal_name, brand_name, slug, country, city, address,
         website_url, contact_email, contact_phone, description, services,
         verification_status, trust_badge, last_verified_at,
         verification_expires_at, last_updated_by_org_at, risk_score,
         is_published, is_suspended, created_at, updated_at
       ),
       submitter:profiles!organization_verifications_submitted_by_fkey(
         id, full_name, email
       ),
       reviewer:profiles!organization_verifications_reviewed_by_fkey(
         id, full_name, email
       )`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }
  const v = data as unknown as VerificationDetail;
  const org = v.organization;

  const isPending = v.status === "pending" || v.status === "need_more_info";
  const isApproved = v.status === "approved";

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/organization-verifications"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Quay lại danh sách
        </Link>
      </div>

      <div className="space-y-2">
        <Badge variant={STATUS_VARIANT[v.status] ?? "default"}>
          {ORG_VERIFICATION_REQUEST_STATUS_LABEL_VI[v.status]}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">
          {org?.brand_name ?? v.organization_id}
        </h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {org ? (
            <>
              {ORG_TYPE_LABEL_VI[org.org_type as OrgType] ?? org.org_type}
              {org.city ? ` · ${org.city}` : ""}
              {" · "}
              <OrganizationVerificationBadge org={org} />
            </>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">
          Yêu cầu xin cấp{" "}
          <span className="font-medium">
            {ORG_VERIFICATION_REQUESTABLE_LABEL_VI[
              v.requested_status as OrgVerificationRequestable
            ] ?? v.requested_status}
          </span>{" "}
          bởi{" "}
          <span className="font-medium">
            {v.submitter?.full_name || v.submitter?.email || v.submitted_by}
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
          <CardTitle className="text-lg">Trạng thái tổ chức hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {org ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">
                  Mức xác minh
                </dt>
                <dd>
                  {ORG_VERIFICATION_STATUS_LABEL_VI[org.verification_status]}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">
                  Đang bị tạm ẩn?
                </dt>
                <dd>{org.is_suspended ? "Có" : "Không"}</dd>
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
            </dl>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hồ sơ yêu cầu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {v.document_summary ? (
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Mô tả tài liệu
              </p>
              <p className="whitespace-pre-wrap">{v.document_summary}</p>
            </div>
          ) : null}
          {v.fee_disclosure ? (
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Công khai phí / chính sách thu phí
              </p>
              <p className="whitespace-pre-wrap">{v.fee_disclosure}</p>
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
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Người duyệt
            </p>
            <p>
              {v.reviewer?.full_name ||
                v.reviewer?.email ||
                (v.reviewed_by ? v.reviewed_by : "—")}
              {v.reviewed_at
                ? ` · ${new Date(v.reviewed_at).toLocaleString("vi-VN")}`
                : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tài liệu</CardTitle>
          <CardDescription>
            Mở qua link tạm thời do server cấp (hết hạn sau 10 phút). Mỗi lần
            mở đều được ghi vào audit log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {v.document_file_paths && v.document_file_paths.length > 0 ? (
            v.document_file_paths.map((path, idx) => (
              <a
                key={path}
                href={`/admin/organization-verifications/${v.id}/file?index=${idx}`}
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
              <form
                action={approveOrganizationVerificationAction}
                className="space-y-2"
              >
                <input type="hidden" name="verification_id" value={v.id} />
                <input
                  type="hidden"
                  name="grant"
                  value="basic_verified"
                />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Duyệt xác minh giấy tờ cơ bản (không bắt buộc ghi chú)
                </label>
                <Textarea name="reason" rows={2} maxLength={500} />
                <Button type="submit" variant="outline">
                  Duyệt — Đã xác minh giấy tờ cơ bản
                </Button>
              </form>

              <form
                action={approveOrganizationVerificationAction}
                className="space-y-2"
              >
                <input type="hidden" name="verification_id" value={v.id} />
                <input type="hidden" name="grant" value="trusted_partner" />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Phong Đối tác uy tín (yêu cầu lịch sử review tốt + minh bạch
                  phí)
                </label>
                <Textarea name="reason" rows={2} maxLength={500} />
                <Button type="submit" variant="gradient">
                  Phong Đối tác uy tín
                </Button>
              </form>

              <form
                action={requestOrganizationMoreInfoAction}
                className="space-y-2"
              >
                <input type="hidden" name="verification_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Yêu cầu bổ sung thông tin
                </label>
                <Textarea
                  name="admin_note"
                  rows={2}
                  maxLength={1000}
                  required
                />
                <Button type="submit" variant="outline">
                  Yêu cầu bổ sung
                </Button>
              </form>

              <form
                action={rejectOrganizationVerificationAction}
                className="space-y-2"
              >
                <input type="hidden" name="verification_id" value={v.id} />
                <label className="block text-xs font-medium uppercase text-muted-foreground">
                  Lý do từ chối
                </label>
                <Textarea
                  name="rejection_reason"
                  rows={2}
                  maxLength={500}
                  required
                  placeholder="VD: Tài liệu không khớp danh tính tổ chức..."
                />
                <Button type="submit" variant="ghost">
                  Từ chối
                </Button>
              </form>
            </>
          ) : null}

          {isApproved ? (
            <form
              action={expireOrganizationVerificationAction}
              className="space-y-2"
            >
              <input type="hidden" name="verification_id" value={v.id} />
              <label className="block text-xs font-medium uppercase text-muted-foreground">
                Cho hết hạn (lý do — không bắt buộc)
              </label>
              <Textarea name="reason" rows={2} maxLength={500} />
              <Button type="submit" variant="outline">
                Cho hết hạn xác minh
              </Button>
            </form>
          ) : null}

          {org && !org.is_suspended ? (
            <form
              action={suspendOrganizationAction}
              className="space-y-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-3"
            >
              <input type="hidden" name="verification_id" value={v.id} />
              <input
                type="hidden"
                name="organization_id"
                value={v.organization_id}
              />
              <label className="block text-xs font-medium uppercase text-rose-600 dark:text-rose-300">
                Tạm ẩn tổ chức (yêu cầu lý do)
              </label>
              <Textarea
                name="reason"
                rows={2}
                maxLength={1000}
                required
                placeholder="VD: Đang điều tra báo cáo lừa đảo, vi phạm chính sách..."
              />
              <Button type="submit" variant="ghost">
                Tạm ẩn tổ chức
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
