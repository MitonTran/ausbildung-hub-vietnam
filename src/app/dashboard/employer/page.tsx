import {
  LayoutDashboard,
  Briefcase,
  Users,
  CalendarCheck,
  BarChart3,
  Star,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";

import { requireEmployerDashboardAccess } from "@/lib/auth/route-protection";

const NAV = [
  { href: "/dashboard/employer", label: "Tổng quan", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "#", label: "Đơn tuyển", icon: <Briefcase className="h-4 w-4" /> },
  { href: "#", label: "Ứng viên", icon: <Users className="h-4 w-4" /> },
  { href: "#", label: "Lịch phỏng vấn", icon: <CalendarCheck className="h-4 w-4" /> },
  { href: "#", label: "Đánh giá công ty", icon: <Star className="h-4 w-4" /> },
  { href: "#", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "#", label: "Xác minh", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "#", label: "Cài đặt", icon: <Settings className="h-4 w-4" /> },
];

const perf = Array.from({ length: 12 }).map((_, i) => ({
  name: `T${i + 1}`,
  value: 50 + Math.round(Math.sin(i / 1.5) * 20 + i * 3),
}));

const funnel = [
  { name: "Ứng tuyển", value: 320 },
  { name: "Sàng lọc", value: 145 },
  { name: "Phỏng vấn", value: 84 },
  { name: "Đã chốt", value: 36 },
];

export default async function EmployerDashboardPage() {
  await requireEmployerDashboardAccess();
  return (
    <DashboardShell title="Nhà tuyển dụng" subtitle="Siemens AG · Đối tác xác minh" nav={NAV}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Đơn đang mở" value="16" trend="+8%" />
        <Kpi label="Ứng viên mới" value="32" trend="+18%" />
        <Kpi label="Phỏng vấn tuần này" value="14" trend="+24%" />
        <Kpi label="Phòng cử" value="8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hiệu suất tuyển dụng</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={perf} height={260} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Phễu ứng viên</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={funnel} height={260} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Đơn nổi bật</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Mechatroniker Munich", "62 ứng viên · 3 phỏng vấn"],
              ["IT System Admin", "48 ứng viên · 5 phỏng vấn"],
              ["Industriemechaniker", "39 ứng viên · 2 phỏng vấn"],
            ].map(([t, m]) => (
              <div key={t} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-xs text-muted-foreground">{m}</div>
                </div>
                <Badge variant="success">Featured</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Mới", 24, "default"],
              ["Đang trao đổi", 18, "secondary"],
              ["Phỏng vấn", 14, "warning"],
              ["Đã offer", 6, "success"],
              ["Từ chối", 3, "outline"],
            ].map(([l, n, v]) => (
              <div key={l as string} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <span>{l as string}</span>
                <Badge variant={v as "default"}>{n as number}</Badge>
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
