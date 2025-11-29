'use client'

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import AuthLayoutContent from "./layout-client";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider userId={null}>
        <AuthLayoutContent>{children}</AuthLayoutContent>
      </TenantProvider>
    </AuthProvider>
  );
}
