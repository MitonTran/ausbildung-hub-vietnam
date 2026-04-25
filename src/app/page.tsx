import Link from "next/link";
import {
  ArrowRight,
  Search,
  Sparkles,
  TrendingUp,
  Building2,
  Users,
  GraduationCap,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/cards/stat-card";
import { NewsCard } from "@/components/cards/news-card";
import { CenterCard } from "@/components/cards/center-card";
import { CompanyCard } from "@/components/cards/company-card";
import { JobCard } from "@/components/cards/job-card";
import { EligibilityQuiz } from "@/components/eligibility-quiz";
import {
  articles,
  centers,
  companies,
  jobOrders,
  heroStats,
  communityPosts,
} from "@/lib/mock-data";

export default function HomePage() {
  const featuredArticles = articles.slice(0, 4);
  const featuredCenters = centers.slice(0, 4);
  const featuredCompanies = companies.slice(0, 5);
  const featuredJobs = jobOrders.filter((j) => j.is_featured).slice(0, 4);
  const recentCommunity = communityPosts.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container relative pt-10 pb-12 md:pt-16 md:pb-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8 items-start">
            {/* Left column — brand block */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
                  Ausbildung
                  <br />
                  <span className="text-gradient">Hub Vietnam</span>
                </h1>
                <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                  Nền tảng số 1 về du học nghề Đức dành cho người Việt Nam.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PillIcon icon={<GraduationCap className="h-4 w-4" />} label="Đào tạo bài bản" />
                <PillIcon icon={<ShieldCheck className="h-4 w-4" />} label="Xác minh đối tác" />
                <PillIcon icon={<TrendingUp className="h-4 w-4" />} label="Cộng đồng 18K" />
                <PillIcon icon={<Globe className="h-4 w-4" />} label="Kết nối toàn cầu" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-background/50 p-1.5 backdrop-blur w-fit">
                {["VI", "DE", "EN"].map((l, i) => (
                  <span
                    key={l}
                    className={
                      i === 0
                        ? "rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                        : "rounded-xl px-3 py-1 text-xs text-muted-foreground"
                    }
                  >
                    {l}
                  </span>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <LegendDot color="bg-cyan-400" label="Nội dung biên tập" sub="(Editorial Content)" />
                <LegendDot color="bg-purple-400" label="Nội dung tài trợ" sub="(Sponsored Content)" />
              </div>
            </div>

            {/* Center column — main hero */}
            <div className="lg:col-span-9">
              <div className="glass-strong relative overflow-hidden rounded-3xl p-6 md:p-10">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 opacity-60"
                  style={{
                    background:
                      "radial-gradient(60% 60% at 30% 20%, rgba(34,211,238,0.25), transparent 65%), radial-gradient(50% 60% at 80% 0%, rgba(139,92,246,0.25), transparent 60%)",
                  }}
                />
                <div className="grid gap-6 lg:grid-cols-2 items-center">
                  <div>
                    <Badge variant="default" className="mb-3 px-3 py-1">
                      <Sparkles className="h-3 w-3" /> Phiên bản 2026 · AI-powered
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-black leading-[1.05] tracking-tight">
                      Ausbildung
                      <span className="text-gradient"> Hub </span>
                      Vietnam
                    </h2>
                    <p className="mt-3 text-sm md:text-base text-muted-foreground">
                      Cơ hội đào tạo nghề – Sự nghiệp bền vững tại Đức
                    </p>
                    <p className="mt-4 max-w-lg text-sm text-muted-foreground">
                      Nền tảng giúp học viên Việt Nam tìm hiểu du học nghề Đức, so
                      sánh trung tâm tiếng Đức, khám phá đơn tuyển đã xác minh và
                      kết nối với cộng đồng đi trước.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button asChild variant="gradient" size="lg">
                        <Link href="/jobs">
                          Khám phá cơ hội <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg">
                        <Link href="/quiz">Kiểm tra điều kiện bằng AI</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="relative aspect-square max-w-md mx-auto w-full hidden md:block">
                    <div
                      className="absolute inset-6 rounded-full border-2 border-dashed border-primary/30 animate-[spin_18s_linear_infinite]"
                      aria-hidden
                    />
                    <div className="absolute inset-12 rounded-full border border-primary/20" aria-hidden />
                    <div className="absolute inset-1/4 rounded-full bg-gradient-to-br from-cyan-400/40 via-blue-500/40 to-purple-500/40 blur-2xl" aria-hidden />
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className="text-7xl font-black text-gradient">85</div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          điểm sẵn sàng
                        </div>
                        <Badge variant="success" className="mt-2">
                          Rất cao
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="mt-6 grid gap-2 md:grid-cols-12">
                  <div className="relative md:col-span-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="h-12 pl-9 rounded-2xl"
                      placeholder="Tìm ngành nghề, trung tâm, nhà tuyển dụng..."
                    />
                  </div>
                  <Select className="h-12 rounded-2xl md:col-span-2">
                    <option>Tất cả ngành</option>
                    <option>Điều dưỡng</option>
                    <option>Cơ điện tử</option>
                    <option>Nhà hàng-Khách sạn</option>
                    <option>IT</option>
                  </Select>
                  <Select className="h-12 rounded-2xl md:col-span-2">
                    <option>Trình độ tiếng Đức</option>
                    <option>A1</option>
                    <option>A2</option>
                    <option>B1</option>
                    <option>B2</option>
                  </Select>
                  <Select className="h-12 rounded-2xl md:col-span-2">
                    <option>Địa điểm tại Đức</option>
                    <option>Bayern</option>
                    <option>Berlin</option>
                    <option>Hessen</option>
                    <option>Hamburg</option>
                  </Select>
                  <Button variant="gradient" className="md:col-span-1 h-12 rounded-2xl">
                    Tìm
                  </Button>
                </div>

                {/* Stats */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <StatCard label="Việc làm đang tuyển" value="2.450+" icon={<TrendingUp className="h-4 w-4" />} />
                  <StatCard label="Trung tâm đối tác" value="320+" icon={<GraduationCap className="h-4 w-4" />} />
                  <StatCard label="Nhà tuyển dụng Đức" value="1.250+" icon={<Building2 className="h-4 w-4" />} />
                  <StatCard label="Học viên đã tham gia" value="18.000+" icon={<Users className="h-4 w-4" />} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News + Centers + Companies row */}
      <section className="container space-y-6 pb-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <PanelHeader title="Tin tức thị trường" href="/news" subtitle="Cập nhật xu hướng & chính sách" />
          <PanelHeader title="Trung tâm nổi bật" href="/centers" subtitle="Đối tác xác minh hàng đầu" />
          <PanelHeader title="Nhà tuyển dụng nổi bật" href="/companies" subtitle="Doanh nghiệp Đức tin cậy" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            {featuredArticles.slice(0, 3).map((a) => (
              <NewsCard key={a.id} article={a} compact />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredCenters.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
          <div className="space-y-3">
            {featuredCompanies.slice(0, 4).map((c) => (
              <CompanyCard key={c.id} company={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="container space-y-4 pb-12">
        <PanelHeader title="Việc làm nổi bật" href="/jobs" subtitle="Đơn tuyển đã xác minh, đang mở" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featuredJobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </section>

      {/* Quiz + Community */}
      <section className="container grid gap-6 pb-12 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <EligibilityQuiz compact />
        </div>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Cộng đồng Ausbildung</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Kết nối · Chia sẻ · Thành công · 18.2K thành viên
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/community">
                  Tham gia <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentCommunity.map((p) => (
                <Link
                  key={p.id}
                  href="/community"
                  className="block rounded-xl border border-border/40 p-3 hover:border-primary/50 transition-colors"
                >
                  <div className="text-xs text-muted-foreground">
                    {p.author_name} · {p.category}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{p.title}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {p.content}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-6 py-12 md:px-12 text-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-50"
            style={{
              background:
                "radial-gradient(40% 60% at 50% 0%, rgba(34,211,238,0.3), transparent 60%), radial-gradient(40% 60% at 50% 100%, rgba(139,92,246,0.25), transparent 60%)",
            }}
          />
          <h3 className="text-2xl md:text-4xl font-black tracking-tight">
            Sẵn sàng cho hành trình{" "}
            <span className="text-gradient">Ausbildung tại Đức?</span>
          </h3>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Tạo tài khoản miễn phí, nhận bài quiz đánh giá và kết nối ngay với
            18.000+ học viên Việt Nam đang trên con đường du học nghề.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="gradient" size="lg">
              <Link href="/register">
                Đăng ký miễn phí <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">Xem các gói dịch vụ</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function PillIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-1.5 text-xs backdrop-blur">
      <span className="text-primary">{icon}</span>
      {label}
    </div>
  );
}

function LegendDot({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`mt-1 h-2 w-2 rounded-full ${color}`} />
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  href,
  subtitle,
}: {
  title: string;
  href: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Link
        href={href}
        className="text-xs font-medium text-primary hover:underline"
      >
        Xem tất cả →
      </Link>
    </div>
  );
}
