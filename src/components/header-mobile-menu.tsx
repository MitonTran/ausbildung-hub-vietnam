"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";

type NavItem = {
  href: string;
  label: string;
};

export function HeaderMobileMenu({
  nav,
  userLabel,
  avatarInitial,
  canSeeAdmin,
}: {
  nav: ReadonlyArray<NavItem>;
  userLabel: string | null;
  avatarInitial: string;
  canSeeAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-16 lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl">
          <div className="container py-3 flex flex-col gap-1">
            {nav.map((item) => (
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

            {userLabel ? (
              <div className="grid gap-2 pt-2">
                {canSeeAdmin ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin" onClick={() => setOpen(false)}>
                      Admin
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {avatarInitial}
                    </span>
                    {userLabel}
                  </Link>
                </Button>
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" size="sm" className="w-full">
                    Đăng xuất
                  </Button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Đăng nhập
                  </Link>
                </Button>
                <Button asChild variant="gradient" size="sm">
                  <Link href="/register" onClick={() => setOpen(false)}>
                    Đăng ký
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
