import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  GraduationCap,
  Flag,
  Gavel,
  MessagesSquare,
  ShieldCheck,
  BarChart3,
  Settings,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { LineChart } from "@/components/charts/line-chart";
import {
  verificationRequests,
  reportFlags,
  centers,
  jobOrders,
} from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: "#", label: "Người dùng", icon: <Users className="h-4 w-4" /> },
  { href: "#", label: "Trung tâm", icon: <GraduationCap className="h-4 w-4" /> },
  { href: "#", label: "Doanh nghiệp", icon: <Building2 className="h-4 w-4" /> },
  { href: "/admin/job-orders", label: "Đơn tuyển", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/admin/sponsored", label: "Nội dung tài trợ", icon: <Briefcase className="h-4 w-4" /> },
  { href: "/admin/reviews", label: "Reviews", icon: <MessagesSquare className="h-4 w-4" /> },
  { href: "#", label: "Bài cộng đồng", icon: <MessagesSquare className="h-4 w-4" /> },
  { href: "/admin/reports", label: "Báo cáo (Reports)", icon: <Flag className="h-4 w-4" /> },
  { href: "/admin/disputes", label: "Khiếu nại (Disputes)", icon: <Gavel className="h-4 w-4" /> },
  { href: "/admin/verifications", label: "Verification (User)", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/organization-verifications", label: "Verification (Organization)", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/admin/audit-logs", label: "Audit logs", icon: <ScrollText className="h-4 w-4" /> },
  { href: "#", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "#", label: "Cài đặt", icon: <Settings className="h-4 w-4" /> },
];

const userTrend = Array.from({ length: 14 }).map((_, i) => ({
  name: `${i + 1}/4`,
  value: 14000 + Math.round(Math.sin(i / 1.6) * 200 + i * 180),
}));

export default function AdminPanelPage() {
  return (
    <DashboardShell title="Admin Panel" subtitle="Moderation & Verification — Ausbildung Hub Vietnam" nav={NAV}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Người dùng" value="16.256" trend="+12%" />
        <Kpi label="Trung tâm" value="248" trend="+8%" />
        <Kpi label="Đơn tuyển đang mở" value="1.648" trend="+15%" />
        <Kpi label="Báo cáo cần xử lý" value="12" trend="0%" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tăng trưởng người dùng (14 ngày)</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={userTrend} height={240} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Requests</CardTitle>
              <Badge variant="warning">{verificationRequests.filter((v) => v.status === "pending").length} chờ duyệt</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {verificationRequests.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3 text-sm">
                <div>
                  <div className="font-semibold">{v.entity_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.entity_type} · gửi {formatDate(v.submitted_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.status === "pending" ? (
                    <>
                      <Button size="sm" variant="gradient">Duyệt</Button>
                      <Button size="sm" variant="outline">Yêu cầu bổ sung</Button>
                      <Button size="sm" variant="ghost">Từ chối</Button>
                    </>
                  ) : (
                    <Badge variant="success">Đã duyệt</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Flags</CardTitle>
              <Badge variant="destructive">{reportFlags.length} mới</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportFlags.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3 text-sm">
                <div>
                  <div className="font-semibold">{r.target_label}</div>
                  <div className="text-xs text-muted-foreground">
                    Bởi {r.reporter_name} · Lý do: {r.reason}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">Ẩn bài viết</Button>
                  <Button size="sm" variant="ghost">Bỏ qua</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bảng moderation chính</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Loại</th>
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Người gửi</th>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {centers.slice(0, 4).map((c) => (
                <tr key={c.id} className="border-b border-border/30">
                  <td className="p-3">
                    <Badge variant="outline">Trung tâm</Badge>
                  </td>
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.city}</td>
                  <td className="p-3 text-muted-foreground">{formatDate("2026-04-20")}</td>
                  <td className="p-3">
                    <Badge variant={c.verification_status === "verified" ? "success" : "warning"}>
                      {c.verification_status === "verified" ? "Đã duyệt" : "Chờ duyệt"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost">Xem</Button>
                  </td>
                </tr>
              ))}
              {jobOrders.slice(0, 3).map((j) => (
                <tr key={j.id} className="border-b border-border/30">
                  <td className="p-3">
                    <Badge variant="outline">Job order</Badge>
                  </td>
                  <td className="p-3 font-semibold">{j.title}</td>
                  <td className="p-3 text-muted-foreground">{j.company_name}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(j.created_at)}</td>
                  <td className="p-3">
                    <Badge variant="success">Đã duyệt</Badge>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost">Xem</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
