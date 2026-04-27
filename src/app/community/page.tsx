import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";

import { CommunityFeed } from "./community-feed";

export default async function CommunityPage() {
  let isAuthenticated = false;
  if (isSupabaseConfigured()) {
    const profile = await getCurrentProfile();
    isAuthenticated = !!profile;
  }
  return <CommunityFeed isAuthenticated={isAuthenticated} />;
}
