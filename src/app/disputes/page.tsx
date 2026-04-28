import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DisputesIndexPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?next=/disputes");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/disputes");
  }

  redirect("/disputes/mine");
}
