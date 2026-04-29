import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminBackLink } from "@/components/admin-back-link";

const TITLES: Record<string, string> = {
  users: "Người dùng",
  centers: "Trung tâm",
  companies: "Doanh nghiệp",
  community: "Bài cộng đồng",
  analytics: "Analytics",
  settings: "Cài đặt",
};

export function AdminPlaceholderPage({ module }: { module: keyof typeof TITLES }) {
  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <AdminBackLink />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{TITLES[module]}</h1>
        <p className="text-sm text-muted-foreground">
          Module quản trị này chưa được triển khai trong MVP hiện tại.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sắp ra mắt</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Trang đã được bảo vệ bằng admin guard server-side qua layout /admin.
          Khi module sẵn sàng, nội dung quản trị sẽ được bổ sung tại đây.
        </CardContent>
      </Card>
    </div>
  );
}
