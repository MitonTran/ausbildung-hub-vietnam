import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
          <CardDescription>
            Đăng nhập để tiếp tục hành trình Ausbildung của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSupabaseConfigured() ? (
            <LoginForm />
          ) : (
            <p className="text-sm text-muted-foreground">
              Supabase chưa được cấu hình trong môi trường này. Hãy thêm
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>
              và
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>
              vào <code>.env.local</code> để bật đăng nhập.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
