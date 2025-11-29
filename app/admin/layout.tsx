'use client'

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import { useAuth } from "@/lib/supabase/auth";
import { AdminSidebar } from "./components/sidebar";
import { AdminTopbar } from "./components/topbar";

function AdminShellContent({ children }: { children: ReactNode }) {
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

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <AuthProvider>
      <TenantProvider userId={user?.id || null}>
        <AdminShellContent>{children}</AdminShellContent>
      </TenantProvider>
    </AuthProvider>
  );
}
