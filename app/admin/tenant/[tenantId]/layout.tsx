'use client';

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { useAuth } from "@/lib/supabase/auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Layout for tenant-scoped admin routes
 * 
 * Routes under /admin/tenant/[tenantId]/ are accessible to:
 * - System admins (can view any tenant)
 * - Tenant admins (owner/admin role for the specific tenant)
 */
export default function TenantAdminLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { isSystemAdmin, isTenantAdmin, currentTenantId, isLoading: rbacLoading } = useRbac();
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const isLoading = authLoading || rbacLoading;
  
  // Check if user has access to this tenant
  const hasAccess = isSystemAdmin || (isTenantAdmin && currentTenantId === tenantId);

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      // Redirect to admin dashboard with error message
      router.replace('/admin?error=tenant_access_denied');
    }
  }, [isLoading, hasAccess, router]);

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

  // Don't render content if no access (redirect will happen)
  if (!hasAccess) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Åtkomst nekad</h2>
          <p className="mt-1 text-sm text-slate-500">
            Du har inte behörighet att administrera denna organisation.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

