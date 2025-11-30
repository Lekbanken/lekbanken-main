'use client'

import type { ReactNode } from "react";
import { AdminSidebar } from "./components/sidebar";
import { AdminTopbar } from "./components/topbar";

export default function AdminShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminTopbar />
          <main className="flex flex-1 flex-col bg-muted/30 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
