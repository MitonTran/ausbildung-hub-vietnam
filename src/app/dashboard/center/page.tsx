import {
  LayoutDashboard,
  GraduationCap,
  MessagesSquare,
  Users,
  BarChart3,
  Calendar,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardShell } from "@/components/dashboard-shell";
import { LineChart } from "@/components/charts/line-chart";
import { DonutChart } from "@/components/charts/donut-chart";

const NAV = [
  { href: "/dashboard/center", label: "Tổng quan", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "#", label: "Quản lý lớp học", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "#", label: "Lead pipeline", icon: <Users className="h-4 w-4" /> },
  { href: "#", label: "Đánh giá / Reviews", icon: <MessagesSquare className="h-4 w-4" /> },
  { href: "#", label: "Lịch khai giảng", icon: <Calendar className="h-4 w-4" /> },
  { href: "#", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "#", label: "Xác minh trung tâm", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "#", label: "Cài đặt", icon: <Settings className="h-4 w-4" /> },
];

const leadTrend = Array.from({ length: 12 }).map((_, i) => ({
  name: `T${i + 1}`,
  value: 60 + Math.round(Math.sin(i / 1.2) * 25 + i * 4),
  value2: 40 + Math.round(Math.cos(i / 1.4) * 18 + i * 3),
}));

const sourceMix = [
  { name: "Website", value: 320 },
  { name: "Facebook", value: 210 },
  { name: "TikTok", value: 95 },
  { name: "Referral", value: 130 },
];

export default function CenterDashboardPage() {
  return (
    <DashboardShell title="Trung tâm" subtitle="Tổng quan trung tâm DeutschAkademie Hà Nội" nav={NAV}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Lead tháng này" value="120" trend="+18%" />
        <Kpi label="Học viên đang học" value="86" trend="+12%" />
        <Kpi label="Đánh giá trung bình" value="4.9★" trend="+0.2" />
        <Kpi label="Lượt xem hồ sơ" value="2.840" trend="+24%" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={leadTrend} height={260} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nguồn lead</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={sourceMix} height={240} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {sourceMix.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: ["#22d3ee", "#3b82f6", "#8b5cf6", "#facc15"][i] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quy trình duyệt lớp / job order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-5">
            {[
              ["Employer ký", "100%", "success"],
              ["Admin kiểm tra", "75%", "default"],
              ["Đã duyệt", "62%", "secondary"],
              ["Đã đăng tuyển", "44%", "secondary"],
              ["Đã hết hạn", "18%", "outline"],
            ].map(([label, pct, variant]) => (
              <div key={label} className="rounded-xl border border-border/30 p-3">
                <Badge variant={variant as "default"}>{label}</Badge>
                <div className="mt-2 text-2xl font-bold">{pct}</div>
                <Progress value={Number((pct as string).replace("%", ""))} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lớp học sắp khai giảng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Lớp B1 sáng T3/T5/T7", "15/05/2026", "8/12 suất"],
              ["Lớp A2 tối T2/T4/T6", "20/05/2026", "5/12 suất"],
              ["Lớp B2 cuối tuần", "01/06/2026", "12/15 suất"],
            ].map(([n, d, s]) => (
              <div key={n} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <div>
                  <div className="font-semibold">{n}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
                <Badge variant="outline">{s}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Đánh giá mới chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Phạm Thị Mai", "5★ · Lớp B1 cực hay", "2 giờ trước"],
              ["Nguyễn Văn Huy", "4★ · Mong có thêm lớp tối", "5 giờ trước"],
            ].map(([who, what, when]) => (
              <div key={who} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <div>
                  <div className="font-semibold">{who}</div>
                  <div className="text-xs text-muted-foreground">{what}</div>
                </div>
                <Badge variant="warning">{when}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function Kpi({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {trend && <div className="text-xs text-emerald-500">{trend}</div>}
      </CardContent>
    </Card>
  );
}
