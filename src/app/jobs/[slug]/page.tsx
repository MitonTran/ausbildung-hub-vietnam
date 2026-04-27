import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Calendar,
  Wallet,
  GraduationCap,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { JobCard } from "@/components/cards/job-card";
import { ReportTarget } from "@/components/report-target";
import { jobOrders, findJob } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return jobOrders.map((j) => ({ slug: j.slug }));
}

export default function JobDetailPage({ params }: { params: { slug: string } }) {
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
