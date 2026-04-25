"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function DashboardShell({
  title,
  subtitle,
  nav,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: DashboardNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="container py-6">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 self-start">
          <div className="glass rounded-2xl p-3">
            <div className="px-2 pb-3 text-xs uppercase tracking-wider text-muted-foreground">
              {title}
            </div>
            <nav className="space-y-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    <span className="text-primary">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div className="space-y-6">
          {subtitle && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
