import Link from "next/link";
import { Briefcase, MapPin, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Company } from "@/types";

export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link href={`/companies?selected=${company.slug}`}>
      <Card className="group flex items-center gap-4 p-4 transition-all hover:border-primary/50">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-background/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain p-2" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
              {company.name}
            </h3>
            {company.verification_status === "verified" && (
              <Badge variant="success" className="shrink-0">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{company.industry}</div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {company.city}, {company.state}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> {company.job_count} đơn
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {company.rating_avg}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
