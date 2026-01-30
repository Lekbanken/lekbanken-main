"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/lib/context/TenantContext";
import { CartProvider } from "@/lib/cart";
import { AppShell as Shell } from "@/components/app/AppShell";
import { AppTopbar } from "./components/app-topbar";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Root routes where back navigation should NOT be shown
 */
const ROOT_ROUTES = [
  '/app',
  '/app/browse',
  '/app/play',
  '/app/planner',
  '/app/profile',
];

/**
 * Check if a pathname is a root route (no back button)
 */
function isRootRoute(pathname: string | null): boolean {
  if (!pathname) return true;
  // Exact match or trailing slash match
  return ROOT_ROUTES.some(route => 
    pathname === route || pathname === `${route}/`
  );
}

export default function AppShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTenant, userTenants, isLoadingTenants, isSystemAdmin } = useTenant();

  const isExemptRoute = pathname?.includes('/select-tenant') || pathname?.includes('/no-access');
  const canGoBack = !isRootRoute(pathname);

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
        {/* Main App Shell */}
        <Shell header={<AppTopbar canGoBack={canGoBack} />}>{children}</Shell>
      </ToastProvider>
    </CartProvider>
  );
}
