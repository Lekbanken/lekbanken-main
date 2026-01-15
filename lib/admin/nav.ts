/**
 * Admin Navigation Configuration v2
 * 
 * Centralized navigation structure for the admin panel.
 * Supports collapsible categories with proper context separation.
 * 
 * Labels use i18n keys from messages/{locale}.json under "admin.nav" namespace.
 * Use the getTranslatedNav() helper or translate keys in components.
 * 
 * @see docs/admin/appshell.md for architecture documentation
 * @see docs/I18N_GUIDE.md for internationalization
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminNavItem {
  id: string
  /** i18n key under admin.nav namespace, e.g., "dashboard" → t("admin.nav.dashboard") */
  labelKey: string
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
  /** i18n key under admin.navGroups namespace */
  labelKey: string
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
    labelKey: 'overview',
    icon: 'dashboard',
    items: [
      { id: 'dashboard', labelKey: 'dashboard', href: '/admin', icon: 'dashboard' },
      { id: 'analytics', labelKey: 'analytics', href: '/admin/analytics', icon: 'analytics' },
    ],
  },
  {
    id: 'organisations',
    labelKey: 'organizations',
    icon: 'organisations',
    items: [
      { id: 'org-list', labelKey: 'allOrganizations', href: '/admin/organisations', icon: 'organisations', permission: 'admin.tenants.list' },
      { id: 'licenses', labelKey: 'licenses', href: '/admin/licenses', icon: 'licenses', permission: 'admin.licenses.list' },
      { id: 'billing', labelKey: 'billing', href: '/admin/billing', icon: 'billing', permission: 'admin.billing.view' },
    ],
  },
  {
    id: 'users',
    labelKey: 'users',
    icon: 'users',
    items: [
      { id: 'user-list', labelKey: 'allUsers', href: '/admin/users', icon: 'users', permission: 'admin.users.list' },
      { id: 'participants', labelKey: 'participants', href: '/admin/participants', icon: 'participants', permission: 'admin.participants.list' },
    ],
  },
  {
    id: 'products',
    labelKey: 'products',
    icon: 'products',
    items: [
      { id: 'product-list', labelKey: 'allProducts', href: '/admin/products', icon: 'products', permission: 'admin.products.list' },
      { id: 'games', labelKey: 'gameManager', href: '/admin/games', icon: 'games', permission: 'admin.games.list' },
      { id: 'planner', labelKey: 'plannerTool', href: '/admin/planner', icon: 'content', permission: 'admin.planner.list' },
    ],
  },
  {
    id: 'library',
    labelKey: 'library',
    icon: 'achievements',
    items: [
      { id: 'badges', labelKey: 'badges', href: '/admin/library/badges', icon: 'achievements', permission: 'admin.achievements.list' },
      { id: 'coach-diagrams', labelKey: 'coachDiagrams', href: '/admin/library/coach-diagrams', icon: 'content', permission: 'admin.content.list' },
      { id: 'media', labelKey: 'mediaFiles', href: '/admin/media', icon: 'content', permission: 'admin.media.list' },
    ],
  },
  {
    id: 'gamification',
    labelKey: 'gamification',
    icon: 'leaderboard',
    items: [
      { id: 'gamification-hub', labelKey: 'overview', href: '/admin/gamification', icon: 'leaderboard' },
      { id: 'dicecoin-xp', labelKey: 'dicecoinXp', href: '/admin/gamification/dicecoin-xp', icon: 'leaderboard' },
      { id: 'achievements', labelKey: 'achievements', href: '/admin/gamification/achievements', icon: 'achievements' },
      { id: 'shop-rewards', labelKey: 'shopRewards', href: '/admin/gamification/shop-rewards', icon: 'marketplace' },
    ],
  },
  {
    id: 'learning',
    labelKey: 'learning',
    icon: 'learning',
    items: [
      { id: 'learning-hub', labelKey: 'overview', href: '/admin/learning', icon: 'learning' },
      { id: 'courses', labelKey: 'courses', href: '/admin/learning/courses', icon: 'learning' },
      { id: 'paths', labelKey: 'learningPaths', href: '/admin/learning/paths', icon: 'learning' },
      { id: 'requirements', labelKey: 'requirements', href: '/admin/learning/requirements', icon: 'learning' },
      { id: 'reports', labelKey: 'reports', href: '/admin/learning/reports', icon: 'learning' },
    ],
  },
  {
    id: 'support',
    labelKey: 'support',
    icon: 'tickets',
    items: [
      { id: 'support-hub', labelKey: 'overview', href: '/admin/support', icon: 'tickets' },
      { id: 'tickets', labelKey: 'tickets', href: '/admin/tickets', icon: 'tickets', permission: 'admin.tickets.view' },
      { id: 'kb', labelKey: 'knowledgeBase', href: '/admin/support/kb', icon: 'learning' },
      { id: 'automation', labelKey: 'automation', href: '/admin/support/automation', icon: 'settings', systemAdminOnly: true },
      { id: 'bugs', labelKey: 'bugReports', href: '/admin/support/bugs', icon: 'incident' },
      { id: 'feedback', labelKey: 'feedback', href: '/admin/support/feedback', icon: 'notifications' },
    ],
  },
  {
    id: 'operations',
    labelKey: 'operations',
    icon: 'sessions',
    items: [
      { id: 'sessions', labelKey: 'sessions', href: '/admin/sessions', icon: 'sessions', permission: 'admin.sessions.list' },
      { id: 'moderation', labelKey: 'moderation', href: '/admin/moderation', icon: 'moderation', permission: 'admin.moderation.view' },
      { id: 'incidents', labelKey: 'incidents', href: '/admin/incidents', icon: 'incident', permission: 'admin.system.view' },
    ],
  },
  {
    id: 'system',
    labelKey: 'system',
    icon: 'settings',
    items: [
      { id: 'design', labelKey: 'design', href: '/admin/design', icon: 'swatch', permission: 'admin.system.view', systemAdminOnly: true },
      { id: 'translations', labelKey: 'translations', href: '/admin/translations', icon: 'language', permission: 'admin.system.view', systemAdminOnly: true },
      { id: 'legal', labelKey: 'legal', href: '/admin/legal', icon: 'audit', permission: 'admin.system.view', systemAdminOnly: true },
      { id: 'cookies', labelKey: 'cookies', href: '/admin/cookies', icon: 'cookies', permission: 'admin.system.view', systemAdminOnly: true },
      { id: 'notifications', labelKey: 'notifications', href: '/admin/notifications', icon: 'notifications', permission: 'admin.notifications.send' },
      { id: 'feature-flags', labelKey: 'featureFlags', href: '/admin/feature-flags', icon: 'flag', permission: 'admin.system.view' },
      { id: 'api-keys', labelKey: 'apiKeys', href: '/admin/api-keys', icon: 'key', permission: 'admin.system.view' },
      { id: 'webhooks', labelKey: 'webhooks', href: '/admin/webhooks', icon: 'rss', permission: 'admin.system.view' },
      { id: 'system-health', labelKey: 'systemHealth', href: '/admin/system-health', icon: 'systemHealth', permission: 'admin.system.view' },
      { id: 'audit-logs', labelKey: 'auditLog', href: '/admin/audit-logs', icon: 'audit', permission: 'admin.audit.view' },
      { id: 'release-notes', labelKey: 'releaseNotes', href: '/admin/release-notes', icon: 'megaphone', permission: 'admin.system.view' },
      { id: 'settings', labelKey: 'settings', href: '/admin/settings', icon: 'settings', permission: 'admin.settings.view' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Organisation/Tenant Admin Navigation
// ---------------------------------------------------------------------------

const organisationAdminCategories: AdminNavCategory[] = [
  {
    id: 'org-overview',
    labelKey: 'overview',
    icon: 'dashboard',
    items: [
      { id: 'org-dashboard', labelKey: 'dashboard', href: '/admin/tenant/[tenantId]', icon: 'dashboard' },
      { id: 'org-analytics', labelKey: 'statistics', href: '/admin/tenant/[tenantId]/analytics', icon: 'analytics' },
    ],
  },
  {
    id: 'org-members',
    labelKey: 'members',
    icon: 'users',
    items: [
      { id: 'members-list', labelKey: 'allMembers', href: '/admin/tenant/[tenantId]/members', icon: 'users' },
      { id: 'roles', labelKey: 'rolesPermissions', href: '/admin/tenant/[tenantId]/roles', icon: 'moderation' },
      { id: 'invites', labelKey: 'invitations', href: '/admin/tenant/[tenantId]/invites', icon: 'notifications' },
    ],
  },
  {
    id: 'org-content',
    labelKey: 'content',
    icon: 'content',
    items: [
      { id: 'org-games', labelKey: 'games', href: '/admin/tenant/[tenantId]/games', icon: 'games' },
      { id: 'org-planner', labelKey: 'plans', href: '/admin/tenant/[tenantId]/planner', icon: 'content' },
      { id: 'org-media', labelKey: 'mediaFiles', href: '/admin/tenant/[tenantId]/media', icon: 'content' },
    ],
  },
  {
    id: 'org-participants',
    labelKey: 'participants',
    icon: 'participants',
    items: [
      { id: 'org-participants-list', labelKey: 'allParticipants', href: '/admin/tenant/[tenantId]/participants', icon: 'participants' },
      { id: 'org-sessions', labelKey: 'sessions', href: '/admin/tenant/[tenantId]/sessions', icon: 'sessions' },
    ],
  },
  {
    id: 'org-gamification',
    labelKey: 'gamification',
    icon: 'achievements',
    items: [
      { id: 'org-achievements', labelKey: 'awards', href: '/admin/tenant/[tenantId]/gamification/achievements', icon: 'achievements' },
    ],
  },
  {
    id: 'org-billing',
    labelKey: 'account',
    icon: 'billing',
    items: [
      { id: 'org-subscription', labelKey: 'subscription', href: '/admin/tenant/[tenantId]/subscription', icon: 'billing' },
      { id: 'org-invoices', labelKey: 'invoices', href: '/admin/tenant/[tenantId]/invoices', icon: 'billing' },
    ],
  },
  {
    id: 'org-settings',
    labelKey: 'settings',
    icon: 'settings',
    items: [
      { id: 'org-general', labelKey: 'general', href: '/admin/tenant/[tenantId]/settings', icon: 'settings' },
      { id: 'org-branding', labelKey: 'branding', href: '/admin/tenant/[tenantId]/branding', icon: 'personalization' },
      { id: 'org-domains', labelKey: 'domains', href: '/admin/tenant/[tenantId]/domains', icon: 'rss' },
      { id: 'org-legal', labelKey: 'legal', href: '/admin/tenant/[tenantId]/legal', icon: 'audit' },
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
