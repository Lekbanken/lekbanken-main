'use client'

import type { ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/ui";

function TenantProviderWithAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <TenantProvider userId={user?.id ?? null}>{children}</TenantProvider>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <TenantProviderWithAuth>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </TenantProviderWithAuth>
  );
}
