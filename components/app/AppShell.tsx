"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground">
      <SideNav />
      <div className="min-h-screen pb-[72px] lg:pl-64 lg:pb-10" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom))" }}>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
