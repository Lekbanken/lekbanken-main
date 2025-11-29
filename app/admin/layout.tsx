'use client'

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import AdminShellContent from "./layout-client";

function TenantProviderWithAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <TenantProvider userId={user?.id ?? null}>{children}</TenantProvider>;
}

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProviderWithAuth>
        <AdminShellContent>{children}</AdminShellContent>
      </TenantProviderWithAuth>
    </AuthProvider>
  );
}
