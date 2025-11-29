'use client'

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/supabase/auth";
import { TenantProvider } from "@/lib/context/TenantContext";
import { useAuth } from "@/lib/supabase/auth";

function AuthLayoutContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      {children}
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <AuthProvider>
      <TenantProvider userId={user?.id || null}>
        <AuthLayoutContent>{children}</AuthLayoutContent>
      </TenantProvider>
    </AuthProvider>
  );
}
