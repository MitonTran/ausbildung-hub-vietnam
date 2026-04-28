import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/supabase/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled-function endpoint that flips published / closing_soon job
 * orders past their `expires_at` into status='expired', and flips
 * published rows whose `application_deadline` is within 7 days into
 * `closing_soon`. Designed for Vercel Cron, GitHub Actions cron, or any
 * external scheduler that can issue an authenticated GET / POST.
 *
 * Auth: requires `?secret=<CRON_SECRET>` in the query string OR the
 * `x-cron-secret: <CRON_SECRET>` header. Without `CRON_SECRET` set in
 * the environment the route is disabled.
 *
 * Each row mutated is mirrored into `audit_logs` with
 * action='job_order_expired' or 'job_order_marked_closing_soon' and
 * actor_type='system'. The list of affected ids is also returned in
 * the JSON response for visibility.
 */
async function handle(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const provided =
    request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: expired, error: expireErr } = await admin.rpc(
    "mark_expired_job_orders"
  );
  if (expireErr) {
    console.error("[cron/expire-job-orders] mark_expired_job_orders", expireErr);
    return NextResponse.json({ error: "expire_failed" }, { status: 500 });
  }

  const { data: closing, error: closingErr } = await admin.rpc(
    "mark_closing_soon_job_orders",
    { days_window: 7 }
  );
  if (closingErr) {
    console.error(
      "[cron/expire-job-orders] mark_closing_soon_job_orders",
      closingErr
    );
  }

  type IdRow = { id: string };
  const expiredIds = ((expired ?? []) as IdRow[]).map((r) => r.id);
  const closingIds = ((closing ?? []) as IdRow[]).map((r) => r.id);

  for (const id of expiredIds) {
    await writeAuditLog({
      actorId: null,
      actorType: "system",
      action: "job_order_expired",
      targetType: "job_order",
      targetId: id,
      afterData: { status: "expired" },
    });
  }
  for (const id of closingIds) {
    await writeAuditLog({
      actorId: null,
      actorType: "system",
      action: "job_order_marked_closing_soon",
      targetType: "job_order",
      targetId: id,
      afterData: { status: "closing_soon" },
    });
  }

  return NextResponse.json({
    success: true,
    expiredCount: expiredIds.length,
    closingSoonCount: closingIds.length,
    checkedAt: new Date().toISOString(),
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
