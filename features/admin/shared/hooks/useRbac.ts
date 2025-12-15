'use client';

import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import type { TenantRole } from '@/types/tenant';

/**
 * Admin permission types.
 * Follow pattern: domain.resource.action
 */
export type AdminPermission =
  // Tenants
  | 'admin.tenants.list'
  | 'admin.tenants.create'
  | 'admin.tenants.edit'
  | 'admin.tenants.delete'
  // Users
  | 'admin.users.list'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
  // Products
  | 'admin.products.list'
  | 'admin.products.create'
  | 'admin.products.edit'
  // Games
  | 'admin.games.list'
  | 'admin.games.edit'
  // Content
  | 'admin.content.list'
  | 'admin.content.edit'
  // Sessions
  | 'admin.sessions.list'
  | 'admin.sessions.view'
  // Achievements
  | 'admin.achievements.list'
  | 'admin.achievements.create'
  | 'admin.achievements.edit'
  // Billing
  | 'admin.billing.view'
  | 'admin.billing.manage'
  // Operations
  | 'admin.moderation.view'
  | 'admin.moderation.action'
  | 'admin.tickets.view'
  | 'admin.tickets.respond'
  | 'admin.audit.view'
  // System
  | 'admin.system.view'
  | 'admin.system.manage'
  | 'admin.settings.view'
  | 'admin.settings.edit'
  | 'admin.notifications.send'
  // Participants
  | 'admin.participants.list'
  | 'admin.participants.view'
  | 'admin.participants.moderate';

/**
 * Admin role types
 */
export type AdminRole = 'system_admin' | 'tenant_admin' | 'tenant_editor' | 'none';

/**
 * Permission check function type
 */
type PermissionCheck = (isSystemAdmin: boolean, tenantRole?: TenantRole | null) => boolean;

/**
 * Permission matrix mapping permissions to role checks
 */
const permissionChecks: Record<AdminPermission, PermissionCheck> = {
  // Tenants - system_admin only
  'admin.tenants.list': (sys) => sys,
  'admin.tenants.create': (sys) => sys,
  'admin.tenants.edit': (sys) => sys,
  'admin.tenants.delete': (sys) => sys,

  // Users - system_admin for all, tenant_admin for own tenant members
  'admin.users.list': (sys) => sys,
  'admin.users.create': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.users.edit': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.users.delete': (sys) => sys,

  // Products - system_admin only
  'admin.products.list': (sys) => sys,
  'admin.products.create': (sys) => sys,
  'admin.products.edit': (sys) => sys,

  // Games - system_admin or tenant admin
  'admin.games.list': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.games.edit': (sys, tr) => sys || tr === 'owner' || tr === 'admin' || tr === 'editor',

  // Content - system_admin or tenant editor+
  'admin.content.list': (sys, tr) => sys || Boolean(tr),
  'admin.content.edit': (sys, tr) => sys || tr === 'owner' || tr === 'admin' || tr === 'editor',

  // Sessions - system_admin or tenant admin
  'admin.sessions.list': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.sessions.view': (sys, tr) => sys || Boolean(tr),

  // Achievements - system_admin or tenant admin
  'admin.achievements.list': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.achievements.create': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.achievements.edit': (sys, tr) => sys || tr === 'owner' || tr === 'admin',

  // Billing - system_admin full, tenant owner view only
  'admin.billing.view': (sys, tr) => sys || tr === 'owner',
  'admin.billing.manage': (sys) => sys,

  // Operations - system_admin only
  'admin.moderation.view': (sys) => sys,
  'admin.moderation.action': (sys) => sys,
  'admin.tickets.view': (sys) => sys,
  'admin.tickets.respond': (sys) => sys,
  'admin.audit.view': (sys) => sys,

  // System - system_admin only
  'admin.system.view': (sys) => sys,
  'admin.system.manage': (sys) => sys,
  'admin.settings.view': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
  'admin.settings.edit': (sys, tr) => sys || tr === 'owner',
  'admin.notifications.send': (sys) => sys,

  // Participants - system_admin or tenant admin/editor
  'admin.participants.list': (sys, tr) => sys || Boolean(tr),
  'admin.participants.view': (sys, tr) => sys || Boolean(tr),
  'admin.participants.moderate': (sys, tr) => sys || tr === 'owner' || tr === 'admin',
};

/**
 * Hook for Role-Based Access Control in admin area.
 * 
 * @example
 * const { can, isSystemAdmin } = useRbac();
 * 
 * if (!can('admin.tenants.list')) {
 *   return <Unauthorized />;
 * }
 * 
 * return (
 *   <>
 *     <TenantList />
 *     {can('admin.tenants.create') && <CreateButton />}
 *   </>
 * );
 */
export function useRbac() {
  const { effectiveGlobalRole, isLoading: authLoading } = useAuth();
  const { currentTenant, isLoadingTenants, hasTenants } = useTenant();

  const isSystemAdmin = effectiveGlobalRole === 'system_admin';

  // Determine tenant role from current tenant membership
  const tenantRole = (currentTenant?.membership?.role ?? null) as TenantRole | null;
  const isTenantAdmin = tenantRole === 'owner' || tenantRole === 'admin';
  const isTenantEditor = isTenantAdmin || tenantRole === 'editor';

  // Determine effective admin role
  const getAdminRole = (): AdminRole => {
    if (isSystemAdmin) return 'system_admin';
    if (isTenantAdmin) return 'tenant_admin';
    if (isTenantEditor) return 'tenant_editor';
    return 'none';
  };

  /**
   * Check if user has a specific permission
   */
  const can = (permission: AdminPermission): boolean => {
    const check = permissionChecks[permission];
    if (!check) return false;
    return check(isSystemAdmin, tenantRole);
  };

  /**
   * Check multiple permissions (all must be true)
   */
  const canAll = (...permissions: AdminPermission[]): boolean => {
    return permissions.every(p => can(p));
  };

  /**
   * Check multiple permissions (any can be true)
   */
  const canAny = (...permissions: AdminPermission[]): boolean => {
    return permissions.some(p => can(p));
  };

  // Combined loading state
  const isLoading = authLoading || isLoadingTenants;

  return {
    // Loading state
    isLoading,

    // Permission checks
    can,
    canAll,
    canAny,
    
    // Role info
    adminRole: getAdminRole(),
    isSystemAdmin,
    isTenantAdmin,
    isTenantEditor,
    
    // Tenant context
    currentTenantId: currentTenant?.id ?? null,
    currentTenantName: currentTenant?.name ?? null,
    hasTenants,
    tenantRole,
    
    // Access checks
    canAccessSystemAdmin: isSystemAdmin,
    canAccessTenantAdmin: isTenantAdmin || isTenantEditor,
    canAccessAdmin: isSystemAdmin || isTenantAdmin || isTenantEditor,
  };
}

/**
 * Get permissions for a nav item based on its href
 */
export function getNavPermission(href: string): AdminPermission | null {
  const permissionMap: Record<string, AdminPermission> = {
    '/admin/tenants': 'admin.tenants.list',
    '/admin/organisations': 'admin.tenants.list',
    '/admin/users': 'admin.users.list',
    '/admin/products': 'admin.products.list',
    '/admin/games': 'admin.games.list',
    '/admin/content': 'admin.content.list',
    '/admin/sessions': 'admin.sessions.list',
    '/admin/achievements': 'admin.achievements.list',
    '/admin/billing': 'admin.billing.view',
    '/admin/moderation': 'admin.moderation.view',
    '/admin/tickets': 'admin.tickets.view',
    '/admin/audit': 'admin.audit.view',
    '/admin/audit-logs': 'admin.audit.view',
    '/admin/system': 'admin.system.view',
    '/admin/system-health': 'admin.system.view',
    '/admin/settings': 'admin.settings.view',
    '/admin/notifications': 'admin.notifications.send',
  };

  // Check exact match first
  if (permissionMap[href]) return permissionMap[href];

  // Check prefix match
  for (const [path, permission] of Object.entries(permissionMap)) {
    if (href.startsWith(path + '/')) return permission;
  }

  return null;
}
