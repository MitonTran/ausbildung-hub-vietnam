import { Megaphone, NewspaperIcon, HandshakeIcon, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CONTENT_TYPE_BADGE_CLASS,
  CONTENT_TYPE_LABEL_VI,
  type ContentType,
  isContentType,
} from "@/lib/content-types";

const ICON_BY_TYPE: Record<ContentType, React.ReactNode> = {
  editorial: <NewspaperIcon className="h-3 w-3" />,
  sponsored: <Megaphone className="h-3 w-3" />,
  partner_content: <HandshakeIcon className="h-3 w-3" />,
  user_generated: <Users className="h-3 w-3" />,
};

/**
 * Public-facing content type label.
 *
 * Renders the Vietnamese label for one of the four content types
 * defined in /docs/trust-engine.md §9. Always renders — there is no
 * "no label" fallback — because every public surface that shows
 * promotable content must be unambiguously labeled (see acceptance
 * criteria: "Public users can distinguish editorial and sponsored
 * content").
 *
 * Visually distinct from the Verified / Trusted Partner badges by
 * design — paid placement (`sponsored`) must never be confused with
 * trust verification.
 */
export function ContentTypeBadge({
  contentType,
  className,
  showIcon = true,
}: {
  contentType: ContentType | string | null | undefined;
  className?: string;
  showIcon?: boolean;
}) {
  const ct: ContentType = isContentType(contentType)
    ? contentType
    : "user_generated";
  return (
    <span
      data-content-type={ct}
      title={CONTENT_TYPE_LABEL_VI[ct]}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        CONTENT_TYPE_BADGE_CLASS[ct],
        className,
      )}
    >
      {showIcon ? ICON_BY_TYPE[ct] : null}
      <span>{CONTENT_TYPE_LABEL_VI[ct]}</span>
    </span>
  );
}
