'use client'

import type { ReactNode } from "react";
import { BottomNav } from "./components/bottom-nav";
import { AppTopbar } from "./components/app-topbar";

export default function AppShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-10">
        <AppTopbar />

        <main className="mt-8 flex flex-1 flex-col gap-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
