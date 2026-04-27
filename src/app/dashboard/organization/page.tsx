import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationVerificationBadge } from "@/components/organization-verification-badge";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createSupabaseServerClient,
  getCurrentProfile,
} from "@/lib/supabase/server";
import {
  ORG_TYPE_LABEL_VI,
  type OrganizationRow,
  type OrgType,
} from "@/lib/organization";

export const metadata = {
  title: "Tổ chức của bạn — Ausbildung Hub Vietnam",
};

type MembershipRow = {
  organization_id: string;
  member_role: "owner" | "manager" | "editor" | "viewer";
  status: "active" | "invited" | "suspended" | "revoked";
  organization: OrganizationRow | null;
};

export default async function OrganizationDashboardIndexPage() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createSupabaseServerClient();
  // RLS: "Users can read own memberships" + "Members can read own
  // organizations" — service role not needed here.
  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      `organization_id, member_role, status,
       organization:organizations!organization_members_organization_id_fkey(
         id, org_type, legal_name, brand_name, slug, country, city, address,
         website_url, contact_email, contact_phone, description, services,
         verification_status, trust_badge, last_verified_at,
         verification_expires_at, last_updated_by_org_at, risk_score,
         is_published, is_suspended, created_at, updated_at
       )`
    )
    .eq("user_id", profile.id)
    .eq("status", "active")
    .order("organization(brand_name)", { ascending: true });

  const list = ((memberships ?? []) as unknown as MembershipRow[]).filter(
    (m): m is MembershipRow & { organization: OrganizationRow } =>
      m.organization !== null
  );

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Tổ chức của bạn
        </h1>
        <p className="text-sm text-muted-foreground">
          Trung tâm, doanh nghiệp, hoặc đơn vị tuyển dụng mà bạn đang quản lý.
          Bạn có thể chỉnh sửa thông tin và gửi yêu cầu xác minh.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chưa có tổ chức nào</CardTitle>
            <CardDescription>
              Bạn chưa được liên kết với tổ chức nào. Liên hệ quản trị viên
              để được thêm vào một tổ chức.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((m) => (
            <Card key={m.organization.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-4 w-4 text-primary" />
                      {m.organization.brand_name}
                    </CardTitle>
                    <CardDescription>
                      {ORG_TYPE_LABEL_VI[m.organization.org_type as OrgType] ??
                        m.organization.org_type}
                      {m.organization.city ? ` · ${m.organization.city}` : ""}
                      {" · "}
                      <span className="uppercase">{m.member_role}</span>
                    </CardDescription>
                  </div>
                  <OrganizationVerificationBadge org={m.organization} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {m.organization.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {m.organization.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có mô tả. Cập nhật hồ sơ để hoàn thiện thông tin công khai.
                  </p>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/dashboard/organization/${m.organization.id}`}
                  >
                    Quản lý tổ chức
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
