import Link from "next/link";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  Building2,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  Gavel,
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
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole, type UserRole } from "@/lib/supabase/types";
import { signOutAction } from "../(auth)/actions";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Học viên",
  center_admin: "Quản trị trung tâm",
  employer_admin: "Nhà tuyển dụng",
  moderator: "Kiểm duyệt viên",
  admin: "Quản trị viên",
  super_admin: "Super admin",
};

const ROLE_HOME: Partial<Record<UserRole, { href: string; label: string; icon: React.ReactNode }>> = {
  student: {
    href: "/dashboard/student",
    label: "Mở dashboard học viên",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  center_admin: {
    href: "/dashboard/center",
    label: "Mở dashboard trung tâm",
    icon: <Building2 className="h-4 w-4" />,
  },
  employer_admin: {
    href: "/dashboard/employer",
    label: "Mở dashboard nhà tuyển dụng",
    icon: <Briefcase className="h-4 w-4" />,
  },
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard/student");
  }

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const role = profile.role;
  const roleHome = ROLE_HOME[role];
  const greetingName = profile.full_name?.trim() || profile.email || "bạn";

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Badge variant="outline" className="rounded-full">
          {ROLE_LABEL[role]}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">
          Xin chào, {greetingName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Đây là khu vực dành riêng cho thành viên đã đăng nhập. Vai trò hiện tại của bạn sẽ
          quyết định những gì bạn có thể truy cập.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roleHome ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {roleHome.icon}
                Dashboard chuyên biệt
              </CardTitle>
              <CardDescription>
                Đi tới khu vực làm việc phù hợp với vai trò của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="gradient">
                <Link href={roleHome.href}>
                  {roleHome.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isAdminRole(role) ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-4 w-4" />
                Trung tâm vận hành
              </CardTitle>
              <CardDescription>
                Truy cập kiểm duyệt, xác minh và báo cáo vi phạm.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/admin">
                  Mở /admin
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-4 w-4" />
              Xác minh trạng thái
            </CardTitle>
            <CardDescription>
              Gửi bằng chứng để được cấp huy hiệu xác minh giai đoạn của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/verification">
                Mở trang xác minh
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-4 w-4" />
              Tổ chức của bạn
            </CardTitle>
            <CardDescription>
              Cập nhật hồ sơ trung tâm / doanh nghiệp và gửi yêu cầu xác minh
              tổ chức.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/organization">
                Mở trang quản lý tổ chức
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gavel className="h-4 w-4" />
              Khiếu nại
            </CardTitle>
            <CardDescription>
              Mở khiếu nại đối với một review, một quyết định xác minh, hoặc
              một đơn tuyển có vấn đề. Tất cả khiếu nại đều được ghi vào nhật
              ký kiểm toán.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/disputes/new">
                Mở khiếu nại mới
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/disputes/mine">Khiếu nại của tôi</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Tài khoản</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutAction}>
              <Button type="submit" variant="outline">
                Đăng xuất
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
