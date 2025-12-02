import type { ReactNode } from "react";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export function PlannerPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 pb-32">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardDocumentListIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Planner</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Planera sessioner</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Bygg sekvenser av lekar och starta direkt i Play.
        </p>
      </header>
      {children}
    </div>
  );
}
