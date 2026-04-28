import Link from "next/link";
import { MapPin, ShieldCheck, Calendar, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ContentTypeBadge } from "@/components/content-type-badge";
import type { JobOrder } from "@/types";
import { formatDate } from "@/lib/utils";
import { levelColor, occupationColor, trainingTypeColor } from "@/lib/badge-colors";

export function JobCard({ job }: { job: JobOrder }) {
  // Resolve a content_type for labelling. Defaults to partner_content
  // because job orders are partner-supplied by definition; paid
  // promotions get explicitly set to 'sponsored' by an admin (the
  // toggle writes audit_logs — see /admin/sponsored).
  const contentType =
    job.content_type ?? (job.is_sponsored ? "sponsored" : "partner_content");

  return (
    <Link href={`/jobs/${job.slug}`}>
      <Card className="group flex h-full flex-col p-5 transition-all hover:border-primary/50">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.company_logo} alt={job.company_name} className="h-full w-full object-contain p-1.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{job.company_name}</span>
              {/*
                Verified badge only reflects the trust state — paid
                placement does NOT grant it. See
                /docs/trust-engine.md §3.4.
              */}
              {job.verification_status === "verified" && (
                <Badge variant="verified" className="shrink-0">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <ContentTypeBadge contentType={contentType} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">
              {job.city}, {job.state}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            {job.monthly_allowance_min}-{job.monthly_allowance_max} EUR
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(job.start_date)}
          </div>
          <Badge variant="level" className={`justify-self-start ${levelColor(job.german_level_required)}`}>
            {job.german_level_required}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
          <Badge variant="tag" className={trainingTypeColor(job.training_type)}>{job.training_type}</Badge>
          <Badge variant="tag" className={occupationColor(job.occupation)}>{job.occupation}</Badge>
          {/*
            "Featured" placement is a paid/promotional surface — kept
            visually separate from the verified badge above on purpose.
          */}
          {job.is_featured && <Badge variant="featured">★ Nổi bật</Badge>}
        </div>
      </Card>
    </Link>
  );
}
