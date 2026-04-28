import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Star,
  Briefcase,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationVerificationBadge } from "@/components/organization-verification-badge";
import { ContentTypeBadge } from "@/components/content-type-badge";
import { ReportTarget } from "@/components/report-target";
import { ReviewSection } from "@/components/review-section";
import { companies, findCompany, jobOrders } from "@/lib/mock-data";
import {
  CONTENT_TYPE_DESCRIPTION_VI,
  CONTENT_TYPE_LABEL_VI,
  isSponsoredContent,
} from "@/lib/content-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ORG_TYPE_LABEL_VI, type OrganizationRow, type OrgType } from "@/lib/organization";

export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

async function loadOrgBySlug(slug: string): Promise<OrganizationRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      "id, org_type, legal_name, brand_name, slug, country, city, address, website_url, contact_email, contact_phone, description, services, verification_status, trust_badge, last_verified_at, verification_expires_at, last_updated_by_org_at, risk_score, is_published, is_suspended, created_at, updated_at"
    )
    .eq("slug", slug)
    .in("org_type", ["employer", "recruiter", "agency", "consulting_center", "school", "other"])
    .maybeSingle();
  return (data as OrganizationRow | null) ?? null;
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = findCompany(params.slug);
  if (!company) notFound();

  const dbOrg = await loadOrgBySlug(params.slug);
  // Listings can be sponsored/featured. The chip is rendered as a
  // separate visual element from the verification badge per
  // /docs/trust-engine.md §3.4. We currently derive sponsorship from
  // the presence of any featured job order for this company — that's
  // the only mock signal available, but in production this would come
  // from a paid-placement column on `organizations`.
  const featuredJobs = jobOrders.filter(
    (j) => j.company_id === company.id && j.is_featured
  );
  // Pick the most authoritative content_type for the org-profile
  // highlight: explicit company.content_type wins, otherwise we infer
  // sponsored from any featured paid job, otherwise default to the
  // partner_content label that all org-supplied profiles use.
  const orgContentType =
    company.content_type ??
    (featuredJobs.length > 0 ? "sponsored" : "partner_content");
  const isSponsored = isSponsoredContent(orgContentType);
  const myJobs = jobOrders.filter((j) => j.company_id === company.id);

  return (
    <div className="container space-y-6 py-8">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" /> Tất cả doanh nghiệp
          </Link>
        </Button>
        <ReportTarget
          targetType="organization"
          targetId={dbOrg?.id ?? company.id}
          targetLabel={dbOrg?.brand_name ?? company.name}
          variant="ghost"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.logo_url}
              alt={company.name}
              className="h-full w-full object-contain p-2"
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {company.name}
              </h1>
              {/*
                Verification badge — DB-backed if available, else
                falls back to the mock chip.
              */}
              {dbOrg ? (
                <OrganizationVerificationBadge org={dbOrg} />
              ) : company.verification_status === "verified" ? (
                <Badge variant="verified">Đã xác minh</Badge>
              ) : null}
              {/*
                Sponsored / featured = paid signal. Always rendered as
                a *separate* badge from the verification badge.
              */}
              {/*
                ContentTypeBadge always renders the public Vietnamese
                label (Nội dung tài trợ / Nội dung từ đối tác / etc.)
                so visitors can never confuse a paid placement with a
                verified-trust signal.
              */}
              <ContentTypeBadge contentType={orgContentType} />
            </div>
            {isSponsored ? (
              <p
                className="rounded-md border border-amber-500/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
                role="note"
              >
                <strong>{CONTENT_TYPE_LABEL_VI.sponsored}:</strong>{" "}
                {CONTENT_TYPE_DESCRIPTION_VI.sponsored}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {dbOrg
                ? ORG_TYPE_LABEL_VI[dbOrg.org_type as OrgType] ?? dbOrg.org_type
                : company.industry}
              {" · "}
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {company.city}, {company.state}
              </span>
            </p>
            {company.website ? (
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Globe className="h-3.5 w-3.5" /> {company.website}
              </p>
            ) : null}
            <div className="flex items-center gap-3 pt-1 text-sm">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">{company.rating_avg}</span>
                <span className="text-muted-foreground">/5</span>
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {company.job_count} đơn tuyển
              </span>
            </div>
            {dbOrg?.last_verified_at ? (
              <p className="text-xs text-muted-foreground">
                Lần xác minh gần nhất:{" "}
                {new Date(dbOrg.last_verified_at).toLocaleDateString("vi-VN")}
                {dbOrg.verification_expires_at
                  ? ` · hết hạn ${new Date(
                      dbOrg.verification_expires_at
                    ).toLocaleDateString("vi-VN")}`
                  : ""}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Giới thiệu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap text-muted-foreground">
            {dbOrg?.description ?? company.description}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Đơn tuyển</CardTitle>
          <CardDescription>
            {myJobs.length} đơn đang được mở bởi {company.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Doanh nghiệp này chưa đăng đơn tuyển nào trên Ausbildung Hub.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {myJobs.map((j) => (
                <li key={j.id} className="py-3">
                  <Link
                    href={`/jobs/${j.slug}`}
                    className="flex flex-wrap items-center gap-2 text-sm hover:underline"
                  >
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="font-medium">{j.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {j.city}, {j.state} · {j.training_type}
                    </span>
                    {j.is_featured ? (
                      <ContentTypeBadge
                        contentType="sponsored"
                        className="ml-auto"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {dbOrg ? <ReviewSection organization={dbOrg} /> : null}
    </div>
  );
}
