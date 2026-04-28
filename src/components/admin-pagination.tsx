import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Pagination controls for admin queue pages.
 *
 * Renders nothing when there is only a single page. Preserves the
 * caller-supplied `params` (e.g. status filters, search query) on
 * every link by serialising them through `URLSearchParams` and
 * adding the next/previous page number.
 *
 * Hardening note: per /docs/admin-moderation-flow.md, every admin
 * queue must be paginated so older items do not silently fall off
 * the end of a fixed `.limit()`. The Trust Engine queues all use a
 * 50-item page size; configurable via `pageSize`.
 */
export function AdminPagination({
  basePath,
  pageNum,
  pageSize,
  totalCount,
  params,
}: {
  basePath: string;
  pageNum: number;
  pageSize: number;
  totalCount: number;
  /** Extra query-string keys to preserve on prev/next links. */
  params?: Record<string, string | undefined | null>;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const buildHref = (target: number) => {
    const sp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) sp.set(k, v);
      }
    }
    sp.set("page", String(target));
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Trang {pageNum} / {totalPages} · {totalCount} mục
      </span>
      <div className="flex gap-2">
        {pageNum > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(pageNum - 1)}>Trước</Link>
          </Button>
        ) : null}
        {pageNum < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildHref(pageNum + 1)}>Sau</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
