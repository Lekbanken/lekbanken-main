/**
 * Admin Navigation Configuration v2
 * 
 * Centralized navigation structure for the admin panel.
 * Supports collapsible categories with proper context separation.
 * 
 * @see docs/admin/appshell.md for architecture documentation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminNavItem {
  id: string
  label: string
  href: string
  icon?: string // Icon key from navIcons
  badge?: string | number
  description?: string
  /** Only visible to system admins */
  systemAdminOnly?: boolean
  /** Only visible in tenant context */
  tenantOnly?: boolean
  /** Permission key for RBAC check */
  permission?: string
}

export interface AdminNavCategory {
  id: string
  label: string
  icon: string // Icon key from navIcons
  items: AdminNavItem[]
  /** Only visible to system admins */
  systemAdminOnly?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
}

export interface AdminNavConfig {
  system: AdminNavCategory[]
  organisation: AdminNavCategory[]
}

// ---------------------------------------------------------------------------
// System Admin Navigation
// ---------------------------------------------------------------------------

const systemAdminCategories: AdminNavCategory[] = [
  {
    id: 'overview',
    label: 'Översikt',
    icon: 'dashboard',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'dashboard' },
      { id: 'analytics', label: 'Analys', href: '/admin/analytics', icon: 'analytics' },
    ],
  },
  {
    id: 'organisations',
    label: 'Organisationer',
    icon: 'organisations',
    items: [
      { id: 'org-list', label: 'Alla organisationer', href: '/admin/organisations', icon: 'organisations', permission: 'admin.tenants.list' },
      { id: 'licenses', label: 'Licenser & Planer', href: '/admin/licenses', icon: 'licenses', permission: 'admin.licenses.list' },
      { id: 'billing', label: 'Fakturering', href: '/admin/billing', icon: 'billing', permission: 'admin.billing.view' },
    ],
  },
  {
    id: 'users',
    label: 'Användare',
    icon: 'users',
    items: [
      { id: 'user-list', label: 'Alla användare', href: '/admin/users', icon: 'users', permission: 'admin.users.list' },
      { id: 'participants', label: 'Deltagare', href: '/admin/participants', icon: 'participants', permission: 'admin.participants.list' },
    ],
  },
  {
    id: 'products',
    label: 'Produkter',
    icon: 'products',
    items: [
      { id: 'product-list', label: 'Alla produkter', href: '/admin/products', icon: 'products', permission: 'admin.products.list' },
      { id: 'games', label: 'Lekhanteraren', href: '/admin/games', icon: 'games', permission: 'admin.games.list' },
      { id: 'planner', label: 'Planläggaren', href: '/admin/planner', icon: 'content', permission: 'admin.planner.list' },
    ],
  },
  {
    id: 'library',
    label: 'Bibliotek',
    icon: 'achievements',
    items: [
      { id: 'badges', label: 'Badges', href: '/admin/library/badges', icon: 'achievements', permission: 'admin.achievements.list' },
      { id: 'coach-diagrams', label: 'Coach Diagrams', href: '/admin/library/coach-diagrams', icon: 'content', permission: 'admin.content.list' },
      { id: 'media', label: 'Mediefiler', href: '/admin/media', icon: 'content', permission: 'admin.media.list' },
    ],
  },
  {
    id: 'gamification',
    label: 'Gamification',
    icon: 'leaderboard',
    items: [
      { id: 'gamification-hub', label: 'Översikt', href: '/admin/gamification', icon: 'leaderboard' },
      { id: 'dicecoin-xp', label: 'DiceCoin & XP', href: '/admin/gamification/dicecoin-xp', icon: 'leaderboard' },
      { id: 'achievements', label: 'Achievements', href: '/admin/gamification/achievements', icon: 'achievements' },
      { id: 'shop-rewards', label: 'Shop & Rewards', href: '/admin/gamification/shop-rewards', icon: 'marketplace' },
    ],
  },
  {
    id: 'learning',
    label: 'Utbildning',
    icon: 'learning',
    items: [
      { id: 'learning-hub', label: 'Översikt', href: '/admin/learning', icon: 'learning' },
      { id: 'courses', label: 'Kurser', href: '/admin/learning/courses', icon: 'learning' },
      { id: 'paths', label: 'Lärstigar', href: '/admin/learning/paths', icon: 'learning' },
      { id: 'requirements', label: 'Krav & Grind', href: '/admin/learning/requirements', icon: 'learning' },
    ],
  },
  {
    id: 'operations',
    label: 'Drift',
    icon: 'sessions',
    items: [
      { id: 'sessions', label: 'Sessioner', href: '/admin/sessions', icon: 'sessions', permission: 'admin.sessions.list' },
      { id: 'moderation', label: 'Moderering', href: '/admin/moderation', icon: 'moderation', permission: 'admin.moderation.view' },
      { id: 'tickets', label: 'Ärenden', href: '/admin/tickets', icon: 'tickets', permission: 'admin.tickets.view' },
      { id: 'incidents', label: 'Incidenter', href: '/admin/incidents', icon: 'incident', permission: 'admin.system.view' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'settings',
    items: [
      { id: 'design', label: 'Design', href: '/admin/design', icon: 'swatch', permission: 'admin.system.view', systemAdminOnly: true },
      { id: 'notifications', label: 'Notifikationer', href: '/admin/notifications', icon: 'notifications', permission: 'admin.notifications.send' },
      { id: 'feature-flags', label: 'Feature Flags', href: '/admin/feature-flags', icon: 'flag', permission: 'admin.system.view' },
      { id: 'api-keys', label: 'API-nycklar', href: '/admin/api-keys', icon: 'key', permission: 'admin.system.view' },
      { id: 'webhooks', label: 'Webhooks', href: '/admin/webhooks', icon: 'rss', permission: 'admin.system.view' },
      { id: 'system-health', label: 'System Health', href: '/admin/system-health', icon: 'systemHealth', permission: 'admin.system.view' },
      { id: 'audit-logs', label: 'Granskningslogg', href: '/admin/audit-logs', icon: 'audit', permission: 'admin.audit.view' },
      { id: 'release-notes', label: 'Release Notes', href: '/admin/release-notes', icon: 'megaphone', permission: 'admin.system.view' },
      { id: 'settings', label: 'Inställningar', href: '/admin/settings', icon: 'settings', permission: 'admin.settings.view' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Organisation/Tenant Admin Navigation
// ---------------------------------------------------------------------------

const organisationAdminCategories: AdminNavCategory[] = [
  {
    id: 'org-overview',
    label: 'Översikt',
    icon: 'dashboard',
    items: [
      { id: 'org-dashboard', label: 'Dashboard', href: '/admin/tenant/[tenantId]', icon: 'dashboard' },
      { id: 'org-analytics', label: 'Statistik', href: '/admin/tenant/[tenantId]/analytics', icon: 'analytics' },
    ],
  },
  {
    id: 'org-members',
    label: 'Medlemmar',
    icon: 'users',
    items: [
      { id: 'members-list', label: 'Alla medlemmar', href: '/admin/tenant/[tenantId]/members', icon: 'users' },
      { id: 'roles', label: 'Roller & Behörigheter', href: '/admin/tenant/[tenantId]/roles', icon: 'moderation' },
      { id: 'invites', label: 'Inbjudningar', href: '/admin/tenant/[tenantId]/invites', icon: 'notifications' },
    ],
  },
  {
    id: 'org-content',
    label: 'Innehåll',
    icon: 'content',
    items: [
      { id: 'org-games', label: 'Spel', href: '/admin/tenant/[tenantId]/games', icon: 'games' },
      { id: 'org-planner', label: 'Planer', href: '/admin/tenant/[tenantId]/planner', icon: 'content' },
      { id: 'org-media', label: 'Mediefiler', href: '/admin/tenant/[tenantId]/media', icon: 'content' },
    ],
  },
  {
    id: 'org-participants',
    label: 'Deltagare',
    icon: 'participants',
    items: [
      { id: 'org-participants-list', label: 'Alla deltagare', href: '/admin/tenant/[tenantId]/participants', icon: 'participants' },
      { id: 'org-sessions', label: 'Sessioner', href: '/admin/tenant/[tenantId]/sessions', icon: 'sessions' },
    ],
  },
  {
    id: 'org-gamification',
    label: 'Gamification',
    icon: 'achievements',
    items: [
      { id: 'org-achievements', label: 'Utmärkelser', href: '/admin/tenant/[tenantId]/gamification/achievements', icon: 'achievements' },
    ],
  },
  {
    id: 'org-billing',
    label: 'Konto',
    icon: 'billing',
    items: [
      { id: 'org-subscription', label: 'Prenumeration', href: '/admin/tenant/[tenantId]/subscription', icon: 'billing' },
      { id: 'org-invoices', label: 'Fakturor', href: '/admin/tenant/[tenantId]/invoices', icon: 'billing' },
    ],
  },
  {
    id: 'org-settings',
    label: 'Inställningar',
    icon: 'settings',
    items: [
      { id: 'org-general', label: 'Allmänt', href: '/admin/tenant/[tenantId]/settings', icon: 'settings' },
      { id: 'org-branding', label: 'Varumärke', href: '/admin/tenant/[tenantId]/branding', icon: 'personalization' },
      { id: 'org-domains', label: 'Domäner', href: '/admin/tenant/[tenantId]/domains', icon: 'rss' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const ADMIN_NAV: AdminNavConfig = {
  system: systemAdminCategories,
  organisation: organisationAdminCategories,
}

/**
 * Resolve tenant placeholders in href
 */
export function resolveNavHref(href: string, tenantId?: string | null): string {
  if (!tenantId) return href
  return href.replace('[tenantId]', tenantId)
}

/**
 * Find the active category based on current pathname
 */
export function findActiveCategory(
  categories: AdminNavCategory[],
  pathname: string,
  tenantId?: string | null
): { category: AdminNavCategory; item: AdminNavItem } | null {
  for (const category of categories) {
    for (const item of category.items) {
      const resolvedHref = resolveNavHref(item.href, tenantId)
      // Exact match or prefix match (but not just /admin)
      if (pathname === resolvedHref || (resolvedHref !== '/admin' && pathname.startsWith(resolvedHref))) {
        return { category, item }
      }
    }
  }
  return null
}

/**
 * Get expanded category IDs based on current route
 */
export function getExpandedCategoriesFromRoute(
  categories: AdminNavCategory[],
  pathname: string,
  tenantId?: string | null
): Set<string> {
  const active = findActiveCategory(categories, pathname, tenantId)
  if (active) {
    return new Set([active.category.id])
  }
  return new Set()
}
