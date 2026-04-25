import { BadgeCheck, Clock3, XCircle, Megaphone } from 'lucide-react';
import type { VerificationStatus } from '../types';
import clsx from 'clsx';

export function VerifiedBadge({ status }: { status: VerificationStatus }) {
  if (status === 'verified')
    return <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" /> Đã xác minh</span>;
  if (status === 'pending')
    return <span className="chip bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Clock3 className="h-3.5 w-3.5" /> Đang chờ duyệt</span>;
  return <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"><XCircle className="h-3.5 w-3.5" /> Đã từ chối</span>;
}

export function SponsoredBadge({ sponsored }: { sponsored?: boolean }) {
  if (!sponsored) return null;
  return <span className="chip bg-brand-yellow/20 text-amber-800 dark:text-amber-200"><Megaphone className="h-3.5 w-3.5" /> Tài trợ</span>;
}

export function FeaturedBadge({ featured }: { featured?: boolean }) {
  if (!featured) return null;
  return <span className={clsx('chip bg-brand-red text-white')}>Nổi bật</span>;
}
