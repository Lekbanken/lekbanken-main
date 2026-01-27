"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/lib/context/TenantContext";
import { CartProvider } from "@/lib/cart";
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

    // No tenant selected and not a system admin, and no tenants available
    // (tenant auto-selection now happens in resolver, so this is just a fallback)
    if (!currentTenant && userTenants.length === 0 && !isSystemAdmin) {
      router.replace('/app/no-access');
    }
  }, [currentTenant, userTenants, isLoadingTenants, isSystemAdmin, isExemptRoute, router]);

  return (
    <CartProvider>
      <ToastProvider>
        <div className="flex flex-col min-h-screen">
          {/* Demo Banner (only shown if in demo mode) - sticky at top */}
          <div className="sticky top-0 z-50">
            <DemoBanner />
          </div>

          {/* Main App Shell - flex-1 to fill remaining space */}
          <div className="flex-1">
            <Shell header={<AppTopbar />}>{children}</Shell>
          </div>
        </div>
      </ToastProvider>
    </CartProvider>
  );
}
