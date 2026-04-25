import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-primary border border-primary/50 dark:text-cyan-300 shadow-[0_0_0_1px_hsl(var(--primary)/0.05)]",
        secondary:
          "bg-secondary/20 text-secondary border border-secondary/50 dark:text-blue-300",
        accent:
          "bg-accent/20 text-accent border border-accent/50 dark:text-violet-300",
        success:
          "bg-emerald-500/20 text-emerald-700 border border-emerald-500/50 dark:text-emerald-300",
        warning:
          "bg-amber-500/20 text-amber-700 border border-amber-500/50 dark:text-amber-300",
        outline:
          "bg-foreground/5 text-foreground/80 border border-border/60 hover:bg-foreground/10 dark:bg-white/5 dark:text-foreground/90 dark:border-white/15",
        tag:
          "bg-primary/10 text-primary border border-primary/40 dark:text-cyan-200 dark:bg-cyan-400/10 dark:border-cyan-400/30",
        level:
          "border font-semibold tracking-wide bg-cyan-500/15 text-cyan-700 border-cyan-500/40 dark:text-cyan-200 dark:border-cyan-400/35",
        featured:
          "bg-gradient-to-br from-amber-400/25 to-orange-500/25 text-amber-700 border border-amber-500/50 font-semibold dark:text-amber-200 dark:border-amber-400/50",
        verified:
          "bg-emerald-500/15 text-emerald-700 border border-emerald-500/45 font-semibold dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/40",
        sponsored:
          "bg-amber-400/25 text-amber-700 border border-amber-400/55 dark:text-amber-200 dark:border-amber-400/50",
        editorial:
          "bg-cyan-400/25 text-cyan-700 border border-cyan-400/55 dark:text-cyan-200 dark:border-cyan-400/50",
        destructive:
          "bg-rose-500/20 text-rose-700 border border-rose-500/50 dark:text-rose-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
