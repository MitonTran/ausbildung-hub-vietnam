import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole, STAFF_ROLES } from "@/lib/supabase/types";
import {
  VERIFICATION_BUCKET,
  basenameFromPath,
} from "@/lib/verification";

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes (per /docs/user-verification-flow.md §8: 5–15 minutes recommended)

/**
 * Server-only signed-URL issuer for verification evidence.
 *
 * - Anonymous users: never reach here (middleware + admin layout gate).
 * - Authenticated non-admin users: 403.
 * - Admins / moderators: receive a short-lived signed URL via 302 redirect.
 *
 * Every issuance is recorded in audit_logs against the user_verification
 * row so we know which staff account viewed which file when.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // Only moderation staff (moderator/admin/super_admin) may view
  // others' evidence. Normal users see only their own evidence
  // through the user-side dashboard, never via this route.
  const allowed =
    isAdminRole(profile.role) ||
    (STAFF_ROLES as ReadonlyArray<string>).includes(profile.role);
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const indexParam = req.nextUrl.searchParams.get("index");
  const index = indexParam === null ? NaN : Number(indexParam);
  if (!Number.isInteger(index) || index < 0) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: verification, error: vErr } = await supabase
    .from("user_verifications")
    .select("id,evidence_file_paths")
    .eq("id", ctx.params.id)
    .maybeSingle();

  if (vErr || !verification) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const paths = (verification.evidence_file_paths as string[] | null) ?? [];
  if (index >= paths.length) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const path = paths[index];

  const { data: signed, error: signErr } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      download: basenameFromPath(path),
    });
  if (signErr || !signed?.signedUrl) {
    console.error("[verification:signed-url]", signErr);
    return new NextResponse("Failed to create signed URL", { status: 500 });
  }

  // Audit: record the staff member who viewed evidence + which file.
  // Action name kept concise; target_id points at the verification so
  // it's joinable from the admin UI history view later.
  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "user_verification_evidence_viewed",
    targetType: "storage_file",
    targetId: verification.id,
    afterData: {
      verification_id: verification.id,
      evidence_index: index,
      filename: basenameFromPath(path),
      ttl_seconds: SIGNED_URL_TTL_SECONDS,
    },
  });

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
