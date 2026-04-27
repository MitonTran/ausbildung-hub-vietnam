import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // When Supabase isn't configured (e.g. early Vercel preview without env
  // vars), fall back to mock-data mode so the UI still renders.
  if (!isSupabaseConfigured()) {
    return <>{children}</>;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  return <>{children}</>;
}
