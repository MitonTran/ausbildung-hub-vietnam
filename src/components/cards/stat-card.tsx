import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, trend, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-4 sm:p-5",
        "before:pointer-events-none before:absolute before:inset-x-0 before:-top-px before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/60 before:to-transparent",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-gradient">
            {value}
          </div>
          {trend && (
            <div className="mt-1 text-xs text-emerald-500">{trend}</div>
          )}
        </div>
        {icon && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
