import Link from "next/link";
import { MapPin, ShieldCheck, Calendar, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { JobOrder } from "@/types";
import { formatDate } from "@/lib/utils";

export function JobCard({ job }: { job: JobOrder }) {
  return (
    <Link href={`/jobs/${job.slug}`}>
      <Card className="group flex h-full flex-col p-5 transition-all hover:border-primary/50">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={job.company_logo} alt={job.company_name} className="h-full w-full object-contain p-1.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              {job.verification_status === "verified" && (
                <Badge variant="success" className="shrink-0">
                  <ShieldCheck className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{job.company_name}</div>
          </div>
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
          <Badge variant="default" className="justify-self-start">
            {job.german_level_required}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
          <Badge variant="outline">{job.training_type}</Badge>
          <Badge variant="outline">{job.occupation}</Badge>
          {job.is_featured && <Badge variant="accent">Nổi bật</Badge>}
        </div>
      </Card>
    </Link>
  );
}
