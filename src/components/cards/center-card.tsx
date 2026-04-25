import Link from "next/link";
import { Star, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Center } from "@/types";

export function CenterCard({ center }: { center: Center }) {
  return (
    <Link href={`/centers/${center.slug}`}>
      <Card className="group flex h-full flex-col p-5 transition-all hover:border-primary/50">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={center.logo_url} alt={center.name} className="h-full w-full object-contain p-2" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                {center.name}
              </h3>
              {center.verification_status === "verified" && (
                <Badge variant="success" className="shrink-0">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {center.city}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex items-center gap-0.5 text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{center.rating_avg}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({center.review_count} đánh giá)
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {center.german_levels.map((l) => (
            <Badge key={l} variant="outline" className="text-[10px]">
              {l}
            </Badge>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Học phí từ{" "}
          <span className="font-semibold text-foreground">
            {(center.tuition_min / 1000000).toFixed(1)}M
          </span>{" "}
          – {(center.tuition_max / 1000000).toFixed(1)}M VND
        </div>
      </Card>
    </Link>
  );
}
