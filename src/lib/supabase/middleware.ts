import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Refresh the Supabase auth session on every request and forward updated
 * cookies. Returns the response that should be returned by the middleware.
 *
 * Uses the `getAll` / `setAll` pattern required by `@supabase/ssr` >= 0.5
 * — the deprecated `get` / `set` / `remove` shape silently drops all but
 * the last cookie when multiple are written in a single refresh, which
 * leads to random logouts and corrupted sessions.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
        });
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // Triggers session refresh and writes refreshed cookies onto `response`.
  await supabase.auth.getUser();

  return response;
}
