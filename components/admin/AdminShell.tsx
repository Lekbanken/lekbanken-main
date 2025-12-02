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
  const router = useRouter();
  const { user, userRole, isLoading } = useAuth();
  const isRoleResolved = userRole !== null;

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
        Laddar...
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
