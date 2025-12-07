'use client';

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { useAuth } from "@/lib/supabase/auth";
import { useTenant } from "@/lib/context/TenantContext";
import { resetAuth } from "@/lib/supabase/resetAuth";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const router = useRouter();
  const { user, userRole, isLoading } = useAuth();
  const { currentTenant, hasTenants, isLoadingTenants } = useTenant();
  const isRoleResolved = userRole !== null;

  useEffect(() => {
    if (!isLoading) {
      const frame = requestAnimationFrame(() => setLoadingTimedOut(false));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    console.info("[AdminShell] state", {
      isLoadingAuth: isLoading,
      hasUser: !!user,
      userRole,
      tenantId: currentTenant?.id,
      hasTenants,
      isLoadingTenants,
    });
  }, [isLoading, user, userRole, currentTenant?.id, hasTenants, isLoadingTenants]);

  const handleLogin = () => router.replace("/auth/login?redirect=/admin");
  const handleReset = async () => {
    await resetAuth();
    handleLogin();
  };

  // Superadmin/admin har alltid tillgång, behöver inte vänta på tenants
  const isGlobalAdmin = userRole === "admin" || userRole === "superadmin";

  // Om vi redan har user + admin roll, behöver vi inte vänta på isLoading
  // Detta hanterar fallet där isLoading fastnar men data finns
  const hasAuthData = !!user && isGlobalAdmin;
  
  // Om auth fortfarande laddar OCH vi inte har tillräcklig data, visa laddning
  // Men om vi är admin/superadmin med user, fortsätt direkt
  const stillLoading = !hasAuthData && (isLoading || (!isGlobalAdmin && isLoadingTenants));

  if (stillLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <p>Laddar...</p>
          {loadingTimedOut && (
            <div className="space-y-2">
              <p className="text-sm">Det tar ovanligt lång tid. Testa att ladda om eller logga in igen.</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  onClick={handleLogin}
                >
                  Gå till login
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  onClick={handleReset}
                >
                  Rensa session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Andra roller kräver tenant
  const needsTenant = !isGlobalAdmin && !hasTenants && !isLoadingTenants;
  const noAdminRole = isRoleResolved && !isGlobalAdmin;

  // DEBUG
  console.log("[AdminShell] access check:", { user: !!user, userRole, isGlobalAdmin, hasTenants, needsTenant, noAdminRole });

  if (!user || noAdminRole || needsTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-semibold text-foreground">Ingen admin-åtkomst</p>
          <p className="text-sm text-muted-foreground">
            {user
              ? `Din roll (${userRole || 'ingen'}) saknar åtkomst. Logga in med ett admin-konto.`
              : "Du är inte inloggad."}
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={handleLogin}
            >
              Gå till login
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
              onClick={handleReset}
            >
              Rensa session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-foreground dark:bg-slate-950">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <AdminSidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Mobile Sidebar */}
        <AdminSidebar
          variant="mobile"
          open={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />

        {/* Main content area */}
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminTopbar
            onToggleSidebar={() => setIsMobileNavOpen(true)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
          <main className="flex flex-1 flex-col bg-slate-100/50 p-4 dark:bg-slate-900/50 lg:p-6 xl:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
