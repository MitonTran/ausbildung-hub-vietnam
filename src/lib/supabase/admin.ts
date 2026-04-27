import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * Server-side only — gated by `import "server-only"` so any accidental import
 * from a client component will fail the Next.js build.
 *
 * Use sparingly: only for trusted server actions (e.g. creating a profile
 * after signup, admin moderation tasks). Never accept user-supplied filters
 * as raw input here without validation.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
