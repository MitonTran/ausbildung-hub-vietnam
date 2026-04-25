"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const current = resolvedTheme ?? theme;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      aria-label="Đổi giao diện sáng/tối"
      className="rounded-full border border-border/40"
    >
      {mounted && current === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
