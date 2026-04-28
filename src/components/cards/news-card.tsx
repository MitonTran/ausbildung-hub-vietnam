import Link from "next/link";
import { Clock, Eye, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ContentTypeBadge } from "@/components/content-type-badge";
import type { Article } from "@/types";
import { relativeTime } from "@/lib/utils";
import { categoryColor } from "@/lib/badge-colors";
import { isSponsoredContent } from "@/lib/content-types";

export function NewsCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  const contentType = article.content_type ?? (article.is_sponsored ? "sponsored" : "editorial");
  const sponsored = isSponsoredContent(contentType);
  return (
    <Link href={`/news/${article.slug}`}>
      <Card className="group overflow-hidden transition-all hover:border-primary/50">
        <div className={compact ? "flex gap-3" : "block"}>
          <div
            className={
              compact
                ? "relative h-24 w-32 flex-none overflow-hidden rounded-l-2xl"
                : "relative aspect-[16/9] overflow-hidden rounded-t-2xl"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image_url}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
              <ContentTypeBadge contentType={contentType} />
              {!sponsored && (
                <Badge
                  variant="default"
                  className={categoryColor(article.category)}
                >
                  {article.category}
                </Badge>
              )}
            </div>
          </div>
          <div className={compact ? "flex-1 py-3 pr-3" : "p-4"}>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            {!compact && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                {article.excerpt}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {relativeTime(article.published_at)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {article.views ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> {article.comments ?? 0}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
