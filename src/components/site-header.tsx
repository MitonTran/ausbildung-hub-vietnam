import Link from "next/link";
import { Search, Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HeaderMobileMenu } from "@/components/header-mobile-menu";
import { signOutAction } from "@/app/(auth)/actions";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/news", label: "Tin tức" },
  { href: "/centers", label: "Trung tâm" },
  { href: "/companies", label: "Nhà tuyển dụng" },
  { href: "/jobs", label: "Việc làm" },
  { href: "/community", label: "Cộng đồng" },
  { href: "/pricing", label: "Bảng giá" },
];

export async function SiteHeader() {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);
  const userLabel = profile?.full_name ?? profile?.email ?? user?.email ?? "Tài khoản";
  const avatarInitial = userLabel.slice(0, 1).toUpperCase();
  const canSeeAdmin = isAdminRole(profile?.role);

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
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {item.label}
            </Link>
          ))}
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
            {user ? (
              <>
                {canSeeAdmin ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">Admin</Link>
                  </Button>
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard" className="max-w-[180px] truncate">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {avatarInitial}
                    </span>
                    {userLabel}
                  </Link>
                </Button>
                <form action={signOutAction}>
                  <Button type="submit" variant="outline" size="sm">
                    Đăng xuất
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
                <Button asChild variant="gradient" size="sm">
                  <Link href="/register">Đăng ký</Link>
                </Button>
              </>
            )}
          </div>
          <HeaderMobileMenu
            nav={NAV}
            userLabel={user ? userLabel : null}
            avatarInitial={avatarInitial}
            canSeeAdmin={canSeeAdmin}
          />
        </div>
      </div>
    </header>
  );
}
