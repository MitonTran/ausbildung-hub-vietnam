import { ShieldCheck, ShieldAlert, ShieldX, Sparkles, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ORG_VERIFICATION_PUBLIC_LABEL_VI,
  hasActiveVerifiedBadge,
  type OrganizationRow,
  type OrgVerificationStatus,
} from "@/lib/organization";

type Variant =
  | "default"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "outline"
  | "tag"
  | "level"
  | "featured"
  | "verified"
  | "sponsored"
  | "editorial"
  | "destructive";

/**
 * Maps each org verification status to a Badge variant + icon for
 * public display. Sponsored / featured (paid) statuses are NEVER
 * mapped here — the trust badge must remain visually distinct from
 * any monetization signal (per /docs/trust-engine.md §3.4).
 *
 * Statuses that should not be shown publicly (rejected, revoked) are
 * coerced to the "Chưa xác minh" outline variant so the public profile
 * never reveals moderation history.
 */
const VARIANT: Record<
  OrgVerificationStatus,
  { variant: Variant; icon: React.ReactNode }
> = {
  unverified: {
    variant: "outline",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  pending_review: {
    variant: "outline",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  basic_verified: {
    variant: "verified",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  trusted_partner: {
    variant: "featured",
    icon: <Sparkles className="h-3 w-3" />,
  },
  recently_updated: {
    variant: "success",
    icon: <Clock className="h-3 w-3" />,
  },
  expired: {
    variant: "warning",
    icon: <Clock className="h-3 w-3" />,
  },
  suspended: {
    variant: "destructive",
    icon: <ShieldX className="h-3 w-3" />,
  },
  rejected: {
    variant: "outline",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  revoked: {
    variant: "outline",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
};

/**
 * Public-facing verification badge. Renders the Vietnamese label per
 * /docs/trust-engine.md §7. Honors expiry: if
 * verification_expires_at has passed, the org is shown as "Đã hết hạn
 * xác minh" regardless of stored status (defense-in-depth: the
 * scheduled expirer might not have run yet).
 */
export function OrganizationVerificationBadge({
  org,
  className,
}: {
  org: Pick<
    OrganizationRow,
    "verification_status" | "verification_expires_at" | "is_suspended"
  >;
  className?: string;
}) {
  let displayStatus: OrgVerificationStatus = org.verification_status;

  // Defense-in-depth: if a verified-tier badge is past its expiry,
  // render "expired" instead of the stored badge.
  if (
    !hasActiveVerifiedBadge(org) &&
    (org.verification_status === "basic_verified" ||
      org.verification_status === "trusted_partner" ||
      org.verification_status === "recently_updated")
  ) {
    if (org.is_suspended) {
      displayStatus = "suspended";
    } else if (
      org.verification_expires_at &&
      new Date(org.verification_expires_at).getTime() < Date.now()
    ) {
      displayStatus = "expired";
    }
  }

  const cfg = VARIANT[displayStatus] ?? VARIANT.unverified;
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.icon}
      {ORG_VERIFICATION_PUBLIC_LABEL_VI[displayStatus]}
    </Badge>
  );
}
