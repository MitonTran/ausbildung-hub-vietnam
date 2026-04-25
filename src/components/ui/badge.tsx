import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary border border-primary/30",
        secondary: "bg-secondary/15 text-secondary-foreground border border-secondary/30",
        accent: "bg-accent/15 text-accent border border-accent/30",
        success: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
        outline: "border border-border/50 text-muted-foreground",
        sponsored: "bg-amber-400/20 text-amber-500 border border-amber-400/40",
        editorial: "bg-cyan-400/20 text-cyan-500 border border-cyan-400/40",
        destructive: "bg-rose-500/15 text-rose-500 border border-rose-500/30",
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
