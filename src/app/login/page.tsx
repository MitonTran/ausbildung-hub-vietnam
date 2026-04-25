import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
          <CardDescription>Đăng nhập để tiếp tục hành trình Ausbildung của bạn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Email hoặc số điện thoại" />
          <Input type="password" placeholder="Mật khẩu" />
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-border/40" />
              Ghi nhớ đăng nhập
            </label>
            <Link href="#" className="text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
          <Button variant="gradient" className="w-full">
            Đăng nhập
          </Button>
          <div className="relative py-3 text-center text-xs text-muted-foreground">
            <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border/40" />
            <span className="bg-card px-3">Hoặc đăng nhập bằng</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm">Google</Button>
            <Button variant="outline" size="sm">Facebook</Button>
            <Button variant="outline" size="sm">Apple</Button>
          </div>
          <p className="text-center text-xs text-muted-foreground pt-2">
            Bạn chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Đăng ký
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
