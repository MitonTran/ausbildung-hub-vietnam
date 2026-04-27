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

import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Tạo tài khoản mới</CardTitle>
          <CardDescription>
            Tham gia Ausbildung Hub Vietnam — hoàn toàn miễn phí.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSupabaseConfigured() ? (
            <RegisterForm />
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
              vào <code>.env.local</code> để bật đăng ký.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
