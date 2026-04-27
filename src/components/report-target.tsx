import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import type { ReportTargetType } from "@/lib/reports";

import { ReportButton } from "./report-button";

/**
 * Server-side wrapper around <ReportButton/>.
 *
 * Resolves the current viewer's auth state and forwards it to the
 * client ReportButton. Used on public reportable surfaces (job
 * detail, organization detail, article, community post, etc.) so
 * each page only has to hand over a target_type + target_id.
 *
 * In demo / mock-fallback mode (Supabase env not configured) we
 * still render the button so the UI can be inspected, but treat the
 * viewer as unauthenticated — submission requires a real session.
 */
export async function ReportTarget({
  targetType,
  targetId,
  targetLabel,
  className,
  size,
  variant,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  className?: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "secondary";
}) {
  let isAuthenticated = false;
  if (isSupabaseConfigured()) {
    const profile = await getCurrentProfile();
    isAuthenticated = !!profile;
  }

  return (
    <ReportButton
      targetType={targetType}
      targetId={targetId}
      targetLabel={targetLabel}
      isAuthenticated={isAuthenticated}
      className={className}
      size={size}
      variant={variant}
    />
  );
}
