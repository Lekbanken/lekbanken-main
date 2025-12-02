"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

export function AppShell({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <SideNav />
      <div className="relative flex min-h-[100dvh] flex-col lg:pl-64">
        <div 
          className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6 lg:pt-8" 
          style={{ paddingBottom: "max(7rem, calc(5.5rem + env(safe-area-inset-bottom)))" }}
        >
          {header && <div className="mb-3 sm:mb-5">{header}</div>}
          <main className="flex flex-1 flex-col gap-5 sm:gap-6">{children}</main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
