'use client'

import type { ReactNode } from "react";
import { AdminSidebar } from "./components/sidebar";
import { AdminTopbar } from "./components/topbar";

export default function AdminShellContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminTopbar />
          <main className="flex flex-1 flex-col gap-6 bg-white px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
