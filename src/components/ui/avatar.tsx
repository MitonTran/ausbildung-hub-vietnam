import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

export function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
          {fallback ?? "?"}
        </span>
      )}
    </div>
  );
}
