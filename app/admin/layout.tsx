'use client'

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import AdminShellContent from "./layout-client";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider userId={null}>
        <AdminShellContent>{children}</AdminShellContent>
      </TenantProvider>
    </AuthProvider>
  );
}
