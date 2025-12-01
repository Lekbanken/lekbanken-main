'use client'

import type { ReactNode } from "react";
import { BottomNav } from "./components/bottom-nav";
import { Badge } from "@/components/ui";

export default function AppShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">App</p>
            <h1 className="text-2xl font-semibold text-foreground">Lekledare</h1>
          </div>
          <Badge variant="primary" size="sm">Mobile-first</Badge>
        </header>

        <main className="mt-8 flex flex-1 flex-col gap-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
