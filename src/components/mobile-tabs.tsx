"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Newspaper, Briefcase, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/news", label: "Tin tức", icon: Newspaper },
  { href: "/jobs", label: "Việc làm", icon: Briefcase },
  { href: "/community", label: "Cộng đồng", icon: Users },
  { href: "/dashboard/student", label: "Cá nhân", icon: User },
];

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/85 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/"
              : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]")} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
