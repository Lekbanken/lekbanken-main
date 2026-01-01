"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageTitleHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  rightSlot?: ReactNode;
  className?: string;
};

export function PageTitleHeader({ icon, title, subtitle, rightSlot, className }: PageTitleHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between", className)}>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{title}</p>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{subtitle}</h1>
        </div>
      </div>
      {rightSlot ? <div className="ml-4 flex shrink-0 items-center">{rightSlot}</div> : null}
    </header>
  );
}
