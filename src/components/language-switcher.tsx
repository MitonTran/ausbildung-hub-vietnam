"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const langs = ["VI", "DE", "EN"] as const;
type Lang = (typeof langs)[number];

export function LanguageSwitcher() {
  const [lang, setLang] = React.useState<Lang>("VI");

  React.useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("ahv-lang")) as Lang | null;
    if (saved && langs.includes(saved)) setLang(saved);
  }, []);

  const change = (l: Lang) => {
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem("ahv-lang", l);
  };

  return (
    <div className="hidden sm:flex items-center gap-1 rounded-full border border-border/40 bg-background/50 px-1 py-1 backdrop-blur">
      <Globe className="ml-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => change(l)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
            lang === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
