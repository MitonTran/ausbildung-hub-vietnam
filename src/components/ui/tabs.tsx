"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onChange: (v: string) => void;
}
const Ctx = React.createContext<TabsContextValue | null>(null);

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const current = value ?? internal;
  const change = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <Ctx.Provider value={{ value: current, onChange: change }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border/40 bg-background/40 p-1.5 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.onChange(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(Ctx);
  if (!ctx || ctx.value !== value) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
