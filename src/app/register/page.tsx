import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function RegisterPage() {
  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Tạo tài khoản mới</CardTitle>
          <CardDescription>Tham gia Ausbildung Hub Vietnam — hoàn toàn miễn phí.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Họ và tên" />
          <Select defaultValue="student">
            <option value="student">Học viên</option>
            <option value="center">Trung tâm tiếng Đức</option>
            <option value="employer">Nhà tuyển dụng / Agency</option>
          </Select>
          <Input placeholder="Email" type="email" />
          <Input placeholder="Số điện thoại" />
          <Input type="password" placeholder="Mật khẩu" />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 rounded border-border/40" />
            <span>
              Tôi đồng ý với{" "}
              <Link href="#" className="text-primary hover:underline">
                Điều khoản
              </Link>{" "}
              và{" "}
              <Link href="#" className="text-primary hover:underline">
                Chính sách bảo mật
              </Link>
            </span>
          </label>
          <Button variant="gradient" className="w-full">
            Đăng ký
          </Button>
          <div className="relative py-3 text-center text-xs text-muted-foreground">
            <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border/40" />
            <span className="bg-card px-3">Hoặc đăng ký nhanh</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm">Google</Button>
            <Button variant="outline" size="sm">Facebook</Button>
            <Button variant="outline" size="sm">Apple</Button>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-2">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
