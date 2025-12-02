'use client';

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { useAuth } from "@/lib/supabase/auth";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const router = useRouter();
  const { user, userRole, isLoading } = useAuth();
  const isRoleResolved = userRole !== null;

  // Debug trace to help diagnose stuck loading
  useEffect(() => {
    console.info("[AdminShell] state", { isLoading, hasUser: !!user, userRole });
  }, [isLoading, user, userRole]);

  // Fallback if loading takes too long
  useEffect(() => {
    if (!isLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login?redirect=/admin");
      return;
    }
    // If role not resolved yet, wait.
    if (!isRoleResolved) return;
    if (userRole !== "admin") {
      router.replace("/auth/login?redirect=/admin");
    }
  }, [user, userRole, isLoading, isRoleResolved, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <p>Laddar...</p>
          {loadingTimedOut && (
            <div className="space-y-2">
              <p className="text-sm">Det tar ovanligt lång tid. Testa att ladda om eller logga in igen.</p>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                onClick={() => router.replace("/auth/login?redirect=/admin")}
              >
                Gå till login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user || (isRoleResolved && userRole !== "admin")) {
    return null;
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
