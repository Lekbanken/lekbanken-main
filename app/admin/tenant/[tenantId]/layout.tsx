import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/server-context";
import { TenantRouteSync } from "./TenantRouteSync";

/**
 * Layout for tenant-scoped admin routes
 * 
 * Server-side protection ensures routes under /admin/tenant/[tenantId]/ are only accessible to:
 * - System admins (can view any tenant)
 * - Tenant admins (owner/admin/editor role for the specific tenant)
 */
export default async function TenantAdminLayout({ 
  children,
  params 
}: { 
  children: ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const authContext = await getServerAuthContext('/admin');

  // Redirect unauthenticated users to login
  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin');
  }

  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
  
  // Check tenant membership for non-system-admins
  const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
  const tenantRole = membership?.role as string | null;
  const hasTenantAccess = tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';

  // Redirect unauthorized users
  if (!isSystemAdmin && !hasTenantAccess) {
    // If user has other tenant memberships, redirect to their tenant or admin home
    const firstTenantId = authContext.memberships?.[0]?.tenant_id;
    if (firstTenantId && firstTenantId !== tenantId) {
      redirect(`/admin/tenant/${firstTenantId}`);
    }
    redirect('/admin');
  }

  return (
    <>
      <TenantRouteSync tenantId={tenantId} enabled={!isSystemAdmin && hasTenantAccess} />
      {children}
    </>
  );
}
