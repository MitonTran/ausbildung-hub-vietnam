import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, actorTypeForRole } from "@/lib/supabase/audit";
import { getCurrentProfile } from "@/lib/supabase/server";
import { isAdminRole, STAFF_ROLES } from "@/lib/supabase/types";
import {
  ORG_EVIDENCE_BUCKET,
  basenameFromPath,
} from "@/lib/organization";

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes — mirrors user-side flow.

/**
 * Server-only signed-URL issuer for organization-verification documents.
 *
 * - Anonymous users: never reach here (middleware + admin layout gate).
 * - Authenticated non-staff users: 403.
 * - Moderators / admins: 302 redirect to a short-lived signed URL.
 *
 * Every issuance is recorded in audit_logs against the
 * organization_verification row so we know which staff account viewed
 * which file when. /docs/audit-log-rules.md §5.4 requires this.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
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
    .from("organization_verifications")
    .select("id, document_file_paths")
    .eq("id", ctx.params.id)
    .maybeSingle();

  if (vErr || !verification) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const paths = (verification.document_file_paths as string[] | null) ?? [];
  if (index >= paths.length) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const path = paths[index];

  const { data: signed, error: signErr } = await supabase.storage
    .from(ORG_EVIDENCE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
      download: basenameFromPath(path),
    });
  if (signErr || !signed?.signedUrl) {
    console.error("[org-verification:signed-url]", signErr);
    return new NextResponse("Failed to create signed URL", { status: 500 });
  }

  await writeAuditLog({
    actorId: profile.id,
    actorType: actorTypeForRole(profile.role),
    action: "organization_verification_evidence_viewed",
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
