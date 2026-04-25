import {
  LayoutDashboard,
  FileText,
  BookmarkCheck,
  GraduationCap,
  Calendar,
  Heart,
  User,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { DashboardShell } from "@/components/dashboard-shell";
import { JobCard } from "@/components/cards/job-card";
import { CenterCard } from "@/components/cards/center-card";
import { jobOrders, centers } from "@/lib/mock-data";

const NAV = [
  { href: "/dashboard/student", label: "Tổng quan", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "#", label: "Hồ sơ của bạn", icon: <User className="h-4 w-4" /> },
  { href: "#", label: "Việc làm đã lưu", icon: <BookmarkCheck className="h-4 w-4" /> },
  { href: "#", label: "Trung tâm đã lưu", icon: <Heart className="h-4 w-4" /> },
  { href: "#", label: "Đơn ứng tuyển", icon: <FileText className="h-4 w-4" /> },
  { href: "#", label: "Lịch phỏng vấn", icon: <Calendar className="h-4 w-4" /> },
  { href: "#", label: "Lộ trình học tiếng Đức", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "#", label: "Cài đặt", icon: <Settings className="h-4 w-4" /> },
];

export default function StudentDashboardPage() {
  const recommendedJobs = jobOrders.slice(0, 3);
  const recommendedCenters = centers.slice(0, 3);

  return (
    <DashboardShell title="Học viên" subtitle="Xin chào, Minh Anh! 👋" nav={NAV}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Điểm sẵn sàng</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-5xl font-black text-gradient">85</div>
            <div className="text-xs text-muted-foreground">/100</div>
            <Badge variant="success" className="mt-2">
              Rất cao
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Hoàn thiện hồ sơ</CardTitle>
              <span className="text-2xl font-bold">85%</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={85} />
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <Item ok label="Thông tin cá nhân" />
              <Item ok label="Trình độ tiếng Đức" />
              <Item ok label="Bằng cấp" />
              <Item ok label="Ngành quan tâm" />
              <Item label="Tải CV (PDF)" />
              <Item label="Video giới thiệu" />
            </div>
            <Button variant="gradient" size="sm">
              Cập nhật hồ sơ
            </Button>
          </CardContent>
        </Card>

        <KpiCard label="Việc làm đã lưu" value="12" />
        <KpiCard label="Trung tâm đã lưu" value="5" />
        <KpiCard label="Đã ứng tuyển" value="8" />
        <KpiCard label="Phỏng vấn sắp tới" value="2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Việc làm gợi ý cho bạn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {recommendedJobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trung tâm phù hợp</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {recommendedCenters.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch phỏng vấn sắp tới</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Phỏng vấn Siemens GmbH", "27/05/2026 · 14:00", "Online"],
            ["Charité Berlin – vòng 2", "30/05/2026 · 10:00", "Online"],
          ].map(([t, when, mode]) => (
            <div key={t} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
              <div className="flex items-center gap-3">
                <Avatar fallback="i" />
                <div>
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-muted-foreground">{when}</div>
                </div>
              </div>
              <Badge variant="secondary">{mode}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Item({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 px-2 py-1.5">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
      />
      <span>{label}</span>
    </div>
  );
}
