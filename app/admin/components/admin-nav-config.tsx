import type { ReactNode } from 'react';
import type { AdminPermission } from '@/features/admin/shared/hooks/useRbac';

/**
 * Navigation item with RBAC support
 */
export interface AdminNavItemConfig {
  /** Unique identifier */
  id: string;
  /** Route href */
  href: string;
  /** Display label (Swedish) */
  label: string;
  /** Icon element */
  icon: ReactNode;
  /** Static badge text */
  badge?: string;
  /** Permission required to see this item */
  permission?: AdminPermission;
  /** Only show for system admins */
  systemAdminOnly?: boolean;
  /** Only show for tenant admins (not system admin without tenant context) */
  tenantAdminOnly?: boolean;
}

/**
 * Navigation group with RBAC support
 */
export interface AdminNavGroupConfig {
  /** Unique identifier */
  id: string;
  /** Group title (Swedish) */
  title: string;
  /** Nav items in this group */
  items: AdminNavItemConfig[];
  /** Hide entire group for non-system admins */
  systemAdminOnly?: boolean;
}

/**
 * Navigation configuration type
 */
export type AdminNavConfig = AdminNavGroupConfig[];

/**
 * Icon base class for consistency
 */
export const navIconClass = 'h-5 w-5';

/**
 * SVG Icons as functions for nav items
 */
export const navIcons = {
  dashboard: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  ),
  organisations: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 21V8l-6-4-6 4v13" />
      <path d="M2 21h20" />
      <path d="M9 12h6m-6 4h6" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20c0-2.8 2.7-5 6-5s6 2.2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 20c0-2 -1.8-3.5-4-3.5" />
    </svg>
  ),
  licenses: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6m-6 4h6m-6 4h4" />
    </svg>
  ),
  content: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10m6 10V4m6 16v-8m6 8v-4" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-5.07-1.41 1.41M8.34 15.66l-1.41 1.41m10.14 0-1.41-1.41M8.34 8.34 6.93 6.93" />
    </svg>
  ),
  billing: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  moderation: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 4 7v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  leaderboard: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 21V11m8 10V7m-4 14v-6" />
      <path d="M4 21h16" />
    </svg>
  ),
  achievements: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="6" />
      <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
    </svg>
  ),
  personalization: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7 7 0 0 0 0 14" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  marketplace: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9h18v12H3V9Z" />
      <path d="M3 9 5 3h14l2 6" />
      <path d="M12 9v12" />
    </svg>
  ),
  tickets: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h16v16H4z" />
      <path d="M4 9h16M9 4v16" />
    </svg>
  ),
  systemHealth: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8m8 4H8" />
    </svg>
  ),
  games: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 12h4m-2-2v4" />
      <circle cx="16" cy="10" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  ),
  sessions: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" className={navIconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
};

/**
 * Main navigation configuration with RBAC
 * 
 * Groups are rendered in order.
 * Items within groups are filtered based on user permissions.
 */
export const adminNavConfig: AdminNavConfig = [
  {
    id: 'main',
    title: 'Huvudmeny',
    items: [
      { id: 'dashboard', href: '/admin', label: 'Dashboard', icon: navIcons.dashboard },
      { id: 'organisations', href: '/admin/organisations', label: 'Organisationer', icon: navIcons.organisations, permission: 'admin.tenants.list' },
      { id: 'users', href: '/admin/users', label: 'Användare', icon: navIcons.users, permission: 'admin.users.list' },
      { id: 'products', href: '/admin/products', label: 'Produkter', icon: navIcons.products, permission: 'admin.products.list', systemAdminOnly: true },
      { id: 'licenses', href: '/admin/licenses', label: 'Licenser', icon: navIcons.licenses, permission: 'admin.billing.view' },
      { id: 'content', href: '/admin/content', label: 'Innehåll', icon: navIcons.content, permission: 'admin.content.list' },
    ],
  },
  {
    id: 'verktyg',
    title: 'Verktyg',
    items: [
      { id: 'analytics', href: '/admin/analytics', label: 'Analys', icon: navIcons.analytics },
      { id: 'billing', href: '/admin/billing', label: 'Fakturering', icon: navIcons.billing, permission: 'admin.billing.view' },
      { id: 'moderation', href: '/admin/moderation', label: 'Moderering', icon: navIcons.moderation, permission: 'admin.moderation.view', systemAdminOnly: true },
      { id: 'notifications', href: '/admin/notifications', label: 'Notifikationer', icon: navIcons.notifications, permission: 'admin.notifications.send', systemAdminOnly: true },
      { id: 'tickets', href: '/admin/tickets', label: 'Ärenden', icon: navIcons.tickets, permission: 'admin.tickets.view', systemAdminOnly: true },
    ],
  },
  {
    id: 'gamification',
    title: 'Gamification',
    items: [
      { id: 'leaderboard', href: '/admin/leaderboard', label: 'Leaderboard', icon: navIcons.leaderboard },
      { id: 'achievements', href: '/admin/achievements', label: 'Achievements', icon: navIcons.achievements, permission: 'admin.achievements.list' },
      { id: 'personalization', href: '/admin/personalization', label: 'Personalisering', icon: navIcons.personalization },
      { id: 'marketplace', href: '/admin/marketplace', label: 'Butik', icon: navIcons.marketplace },
    ],
  },
  {
    id: 'system',
    title: 'System',
    systemAdminOnly: true,
    items: [
      { id: 'system-health', href: '/admin/system-health', label: 'System Health', icon: navIcons.systemHealth, permission: 'admin.system.view' },
      { id: 'audit-logs', href: '/admin/audit-logs', label: 'Granskningslogg', icon: navIcons.audit, permission: 'admin.audit.view' },
      { id: 'settings', href: '/admin/settings', label: 'Inställningar', icon: navIcons.settings, permission: 'admin.settings.view' },
    ],
  },
];

/**
 * Tenant-scoped navigation for license admins
 */
export const tenantAdminNavConfig: AdminNavConfig = [
  {
    id: 'tenant-main',
    title: 'Min Organisation',
    items: [
      { id: 'tenant-dashboard', href: '/admin/tenant/[tenantId]', label: 'Översikt', icon: navIcons.dashboard },
      { id: 'tenant-members', href: '/admin/tenant/[tenantId]/members', label: 'Medlemmar', icon: navIcons.users },
      { id: 'tenant-settings', href: '/admin/tenant/[tenantId]/settings', label: 'Inställningar', icon: navIcons.settings },
    ],
  },
  {
    id: 'tenant-content',
    title: 'Innehåll',
    items: [
      { id: 'tenant-games', href: '/admin/tenant/[tenantId]/games', label: 'Spel', icon: navIcons.games },
      { id: 'tenant-content', href: '/admin/tenant/[tenantId]/content', label: 'Material', icon: navIcons.content },
    ],
  },
  {
    id: 'tenant-billing',
    title: 'Konto',
    items: [
      { id: 'tenant-subscription', href: '/admin/tenant/[tenantId]/subscription', label: 'Prenumeration', icon: navIcons.billing },
      { id: 'tenant-analytics', href: '/admin/tenant/[tenantId]/analytics', label: 'Statistik', icon: navIcons.analytics },
    ],
  },
];
