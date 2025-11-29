'use client'

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import AppShellContent from "./layout-client";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider userId={null}>
        <AppShellContent>{children}</AppShellContent>
      </TenantProvider>
    </AuthProvider>
  );
}
