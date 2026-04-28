import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/supabase/server";
import {
  DISPUTE_RESOLUTION_LABEL_VI,
  DISPUTE_STATUS_LABEL_VI,
  DISPUTE_TARGET_TYPE_LABEL_VI,
  DISPUTE_TYPE_LABEL_VI,
  type DisputeCaseRow,
} from "@/lib/disputes";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TERMINAL_STATUSES = new Set(["resolved", "rejected", "closed"]);

export default async function MyDisputesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container max-w-3xl py-10">
        <h1 className="text-2xl font-bold tracking-tight">Khiếu nại của tôi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cấu hình Supabase để xem các khiếu nại bạn đã mở.
        </p>
      </div>
    );
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/disputes/mine");
  }

  const supabase = createSupabaseAdminClient();
  // Defense-in-depth: even though only the user's own disputes are
  // returned (opened_by = profile.id), `internal_note` is moderator-
  // only per /docs/audit-log-rules.md §8 and must never appear in a
  // user-facing payload. We project it out at the SELECT layer so a
  // future render change cannot accidentally leak it.
  const { data, error } = await supabase
    .from("dispute_cases")
    .select(
      "id,opened_by,target_type,target_id,dispute_type,summary,evidence_file_paths,status,assigned_to,resolution,resolved_by,resolved_at,created_at,updated_at"
    )
    .eq("opened_by", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[disputes/mine]", error);
  }

  const disputes = (data ?? []) as Omit<DisputeCaseRow, "internal_note">[];

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Khiếu nại của tôi
          </h1>
          <p className="text-sm text-muted-foreground">
            Bạn chỉ thấy các khiếu nại do chính bạn mở. Bằng chứng bạn upload
            không công khai.
          </p>
        </div>
        <Button asChild variant="gradient" size="sm">
          <Link href="/disputes/new">Mở khiếu nại mới</Link>
        </Button>
      </div>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Bạn chưa mở khiếu nại nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const isTerminal = TERMINAL_STATUSES.has(d.status);
            return (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {DISPUTE_TYPE_LABEL_VI[d.dispute_type]} ·{" "}
                      <span className="text-muted-foreground">
                        {DISPUTE_TARGET_TYPE_LABEL_VI[d.target_type]}
                      </span>
                    </CardTitle>
                    <Badge variant={isTerminal ? "secondary" : "warning"}>
                      {DISPUTE_STATUS_LABEL_VI[d.status]}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Mở ngày {formatDate(d.created_at)} · Cập nhật{" "}
                    {formatDate(d.updated_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{d.summary}</p>
                  {d.evidence_file_paths && d.evidence_file_paths.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {d.evidence_file_paths.length} tệp bằng chứng (riêng tư).
                    </p>
                  ) : null}
                  {d.resolution ? (
                    <p className="text-xs">
                      <span className="font-medium">Kết quả:</span>{" "}
                      {DISPUTE_RESOLUTION_LABEL_VI[d.resolution]}
                      {d.resolved_at
                        ? ` · ${formatDate(d.resolved_at)}`
                        : null}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
