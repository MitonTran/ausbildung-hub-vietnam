import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Calendar,
  Wallet,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { JobCard } from "@/components/cards/job-card";
import { JobOrderReportForm } from "@/components/job-order-report-form";
import { ReportTarget } from "@/components/report-target";
import {
  ACTIVE_JOB_ORDER_STATUSES,
  JOB_ORDER_STATUS_LABEL_VI,
  JOB_ORDER_VERIFICATION_STATUS_LABEL_VI,
  TRAINING_TYPE_LABEL_VI,
  isJobOrderExpired,
  jobOrderDaysUntilExpiry,
  type JobOrderRow,
  type TrainingType,
} from "@/lib/job-orders";
import { jobOrders, findJob } from "@/lib/mock-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DbJob = JobOrderRow & {
  organization: {
    id: string;
    brand_name: string;
    slug: string | null;
    org_type: string;
  } | null;
};

async function loadDbJob(slug: string): Promise<DbJob | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("job_orders")
    .select(
      `id, organization_id, created_by, slug, title, occupation, germany_city, germany_state, training_type, german_level_required, education_required, start_date, interview_date, monthly_training_allowance, accommodation_support, fee_disclosure, application_deadline, expires_at, verification_status, status, last_verified_at, last_updated_by_org_at, is_sponsored, created_at, updated_at, deleted_at,
       organization:organizations!job_orders_organization_id_fkey(id, brand_name, slug, org_type)`
    )
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  return ((data ?? null) as unknown) as DbJob | null;
}

export default async function JobDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const dbJob = await loadDbJob(params.slug);
  if (dbJob) {
    return <DbJobDetail job={dbJob} />;
  }

  const job = findJob(params.slug);
  if (!job) notFound();

  const related = jobOrders
    .filter((j) => j.id !== job.id && j.occupation === job.occupation)
    .slice(0, 3);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/jobs">
            <ArrowLeft className="h-4 w-4" /> Tất cả việc làm
          </Link>
        </Button>
        <ReportTarget
          targetType="job_order"
          targetId={job.id}
          targetLabel={job.title}
          variant="ghost"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-start">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.company_logo} alt={job.company_name} className="h-full w-full object-contain p-2" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{job.title}</h1>
              {job.verification_status === "verified" && (
                <Badge variant="verified">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
              {job.is_featured && (
                <Badge variant="featured">
                  <Sparkles className="h-3 w-3" /> Featured
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{job.company_name}</div>
            <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={<MapPin className="h-3.5 w-3.5" />} label={`${job.city}, ${job.state}`} />
              <Stat icon={<Wallet className="h-3.5 w-3.5" />} label={`${job.monthly_allowance_min}-${job.monthly_allowance_max} EUR/tháng`} />
              <Stat icon={<GraduationCap className="h-3.5 w-3.5" />} label={`${job.training_type} · ${job.german_level_required}`} />
              <Stat icon={<Calendar className="h-3.5 w-3.5" />} label={`Khai giảng ${formatDate(job.start_date)}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mô tả công việc</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">{job.description}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Yêu cầu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {job.requirements.map((r) => (
                <div key={r} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{r}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quyền lợi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {job.benefits.map((b) => (
                <div key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{b}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline tuyển dụng</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
              <Timeline label="Hạn nộp hồ sơ" value={formatDate(job.deadline)} />
              <Timeline label="Phỏng vấn" value={job.interview_date ? formatDate(job.interview_date) : "Sắp xếp linh hoạt"} />
              <Timeline label="Khai giảng" value={formatDate(job.start_date)} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ứng tuyển ngay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Họ và tên" />
              <Input placeholder="Số điện thoại" />
              <Input type="email" placeholder="Email" />
              <Select defaultValue="">
                <option value="">Trình độ tiếng Đức hiện tại</option>
                <option>Chưa học</option>
                <option>A1</option>
                <option>A2</option>
                <option>B1</option>
                <option>B2</option>
              </Select>
              <Textarea placeholder="Giới thiệu bản thân và động lực ứng tuyển" />
              <Button variant="gradient" className="w-full">
                Gửi đơn ứng tuyển
              </Button>
            </CardContent>
          </Card>

          {related.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Việc làm tương tự</h3>
              <div className="space-y-3">
                {related.map((j) => (
                  <JobCard key={j.id} job={j} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

async function DbJobDetail({ job }: { job: DbJob }) {
  const profile = await getCurrentProfile();
  const expired = isJobOrderExpired(job);
  const daysToExpiry = jobOrderDaysUntilExpiry(job);
  const isActive = (
    ACTIVE_JOB_ORDER_STATUSES as ReadonlyArray<string>
  ).includes(job.status);
  const lastUpdatedDate = new Date(
    job.last_updated_by_org_at ?? job.updated_at
  );

  return (
    <div className="container py-8 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/jobs">
          <ArrowLeft className="h-4 w-4" /> Tất cả việc làm
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {job.title}
            </h1>
            {job.verification_status === "basic_verified" ||
            job.verification_status === "trusted_partner" ||
            job.verification_status === "recently_updated" ? (
              <Badge variant="verified">
                <ShieldCheck className="h-3 w-3" />{" "}
                {JOB_ORDER_VERIFICATION_STATUS_LABEL_VI[job.verification_status]}
              </Badge>
            ) : (
              <Badge variant="warning">
                <ShieldAlert className="h-3 w-3" />{" "}
                {JOB_ORDER_VERIFICATION_STATUS_LABEL_VI[job.verification_status]}
              </Badge>
            )}
            <Badge
              variant={
                job.status === "published"
                  ? "success"
                  : job.status === "closing_soon"
                  ? "warning"
                  : "outline"
              }
            >
              {JOB_ORDER_STATUS_LABEL_VI[job.status]}
            </Badge>
            {expired ? (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3" /> Đã hết hạn
              </Badge>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">
            {job.organization?.brand_name ?? "—"}
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<MapPin className="h-3.5 w-3.5" />}
              label={`${job.germany_city ?? "—"}, ${
                job.germany_state ?? "—"
              }`}
            />
            <Stat
              icon={<Wallet className="h-3.5 w-3.5" />}
              label={
                job.monthly_training_allowance !== null
                  ? `${job.monthly_training_allowance} EUR/tháng`
                  : "Trợ cấp: —"
              }
            />
            <Stat
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              label={`${
                TRAINING_TYPE_LABEL_VI[job.training_type as TrainingType] ??
                job.training_type
              } · ${job.german_level_required ?? "—"}`}
            />
            <Stat
              icon={<Calendar className="h-3.5 w-3.5" />}
              label={
                job.start_date
                  ? `Khai giảng ${formatDate(job.start_date)}`
                  : "Khai giảng: —"
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <Clock className="inline h-3 w-3 align-text-top" /> Cập nhật lần
            cuối: {lastUpdatedDate.toLocaleDateString("vi-VN")}
            {isActive && daysToExpiry !== null && daysToExpiry >= 0 ? (
              <>
                {" · "}
                <span
                  className={
                    daysToExpiry <= 7
                      ? "text-amber-600 dark:text-amber-300"
                      : ""
                  }
                >
                  Còn {daysToExpiry} ngày tới hạn đơn
                </span>
              </>
            ) : null}
          </p>
          {!isActive ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              Đơn tuyển này hiện không còn nhận hồ sơ — trạng thái:{" "}
              <strong>{JOB_ORDER_STATUS_LABEL_VI[job.status]}</strong>.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Yêu cầu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <KV
                label="Trình độ tiếng Đức yêu cầu"
                value={job.german_level_required ?? "—"}
              />
              <KV
                label="Trình độ học vấn"
                value={job.education_required ?? "—"}
              />
              <KV label="Ngành nghề" value={job.occupation} />
              <KV
                label="Loại đào tạo"
                value={
                  TRAINING_TYPE_LABEL_VI[
                    job.training_type as TrainingType
                  ] ?? job.training_type
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hỗ trợ chỗ ở</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {job.accommodation_support ?? "—"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Công khai phí dịch vụ</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {job.fee_disclosure ?? "—"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline tuyển dụng</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
              <Timeline
                label="Hạn nộp hồ sơ"
                value={
                  job.application_deadline
                    ? formatDate(job.application_deadline)
                    : "—"
                }
              />
              <Timeline
                label="Phỏng vấn"
                value={
                  job.interview_date
                    ? formatDate(job.interview_date)
                    : "Sắp xếp linh hoạt"
                }
              />
              <Timeline
                label="Khai giảng"
                value={job.start_date ? formatDate(job.start_date) : "—"}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Báo cáo đơn tuyển</CardTitle>
            </CardHeader>
            <CardContent>
              <JobOrderReportForm
                jobOrderId={job.id}
                isLoggedIn={!!profile}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2">
      <span className="text-primary">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function Timeline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
