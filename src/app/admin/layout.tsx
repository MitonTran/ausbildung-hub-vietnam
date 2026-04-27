import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isAdminRole } from "@/lib/supabase/types";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Demo / preview mode: render the admin UI with mock data when Supabase
  // env vars are absent. Never reached in production.
  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (!isAdminRole(profile.role)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
