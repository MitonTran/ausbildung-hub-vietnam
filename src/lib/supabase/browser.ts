"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Browser-side Supabase client.
 * Authenticates as the current end user via cookies.
 * Uses the public anon key — never the service role key.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  return cached;
}
