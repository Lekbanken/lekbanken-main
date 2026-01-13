"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/lib/context/TenantContext";
import { AppShell as Shell } from "@/components/app/AppShell";
import { AppTopbar } from "./components/app-topbar";
import { ToastProvider } from "@/components/ui/toast";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTenant, userTenants, isLoadingTenants, isSystemAdmin } = useTenant();

  const isExemptRoute = pathname?.includes('/select-tenant') || pathname?.includes('/no-access');

  useEffect(() => {
    // Skip redirects while loading or on exempt routes
    if (isLoadingTenants || isExemptRoute) return;

    // No tenant selected and not a system admin
    if (!currentTenant) {
      if (userTenants.length > 1) {
        router.replace('/app/select-tenant');
      } else if (userTenants.length === 0 && !isSystemAdmin) {
        router.replace('/app/no-access');
      }
    }
  }, [currentTenant, userTenants, isLoadingTenants, isSystemAdmin, isExemptRoute, router]);

  return (
    <ToastProvider>
      <div className="flex flex-col h-screen">
        {/* Demo Banner (only shown if in demo mode) */}
        <DemoBanner />

        {/* Main App Shell */}
        <div className="flex-1 overflow-hidden">
          <Shell header={<AppTopbar />}>{children}</Shell>
        </div>
      </div>
    </ToastProvider>
  );
}
