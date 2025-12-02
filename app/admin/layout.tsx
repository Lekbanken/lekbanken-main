'use client'

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import { AdminShell } from "@/components/admin/AdminShell";

function TenantProviderWithAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <TenantProvider userId={user?.id ?? null}>{children}</TenantProvider>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProviderWithAuth>
        <AdminShell>{children}</AdminShell>
      </TenantProviderWithAuth>
    </AuthProvider>
  );
}
