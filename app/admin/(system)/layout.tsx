'use client';

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { useAuth } from "@/lib/supabase/auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Layout for system admin-only routes
 * 
 * Routes under /admin/(system)/ are only accessible to users with system_admin role.
 * Examples: /admin/audit-logs, /admin/system-health, /admin/moderation
 */
export default function SystemAdminLayout({ children }: { children: ReactNode }) {
  const { isSystemAdmin, isLoading: rbacLoading } = useRbac();
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const isLoading = authLoading || rbacLoading;

  useEffect(() => {
    if (!isLoading && !isSystemAdmin) {
      // Redirect to admin dashboard with error message
      router.replace('/admin?error=unauthorized');
    }
  }, [isLoading, isSystemAdmin, router]);

  // Show loading spinner while checking permissions
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-500">Verifierar behörighet...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not system admin (redirect will happen)
  if (!isSystemAdmin) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Åtkomst nekad</h2>
          <p className="mt-1 text-sm text-slate-500">
            Du har inte behörighet att se denna sida.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


