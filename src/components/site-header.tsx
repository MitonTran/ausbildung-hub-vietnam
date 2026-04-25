"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/news", label: "Tin tức" },
  { href: "/centers", label: "Trung tâm" },
  { href: "/companies", label: "Nhà tuyển dụng" },
  { href: "/jobs", label: "Việc làm" },
  { href: "/community", label: "Cộng đồng" },
  { href: "/pricing", label: "Bảng giá" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/30 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 shadow-lg shadow-primary/40">
            <span className="text-sm font-black text-white">A</span>
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-bold">
              Ausbildung <span className="text-primary">Hub</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Vietnam
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Tìm kiếm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex" aria-label="Thông báo">
            <Bell className="h-4 w-4" />
          </Button>
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Đăng nhập</Link>
            </Button>
            <Button asChild variant="gradient" size="sm">
              <Link href="/register">Đăng ký</Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl">
          <div className="container py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button asChild variant="gradient" size="sm">
                <Link href="/register">Đăng ký</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
