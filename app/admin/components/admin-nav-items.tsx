import type { ReactNode } from 'react'

import { navIcons } from './admin-nav-config'

export type AdminNavItem = {
  href: string
  labelKey: string
  icon: ReactNode
  badge?: string
}

export type AdminNavGroup = {
  id: string
  titleKey: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'overview',
    titleKey: 'admin.nav.groups.overview',
    items: [{ href: '/admin', labelKey: 'admin.nav.items.dashboard', icon: navIcons.dashboard }],
  },
  {
    id: 'organisation-users',
    titleKey: 'admin.nav.groups.organisationUsers',
    items: [
      { href: '/admin/organisations', labelKey: 'admin.nav.items.organisations', icon: navIcons.organisations },
      { href: '/admin/users', labelKey: 'admin.nav.items.users', icon: navIcons.users },
    ],
  },
  {
    id: 'products-content',
    titleKey: 'admin.nav.groups.productsContent',
    items: [
      { href: '/admin/products', labelKey: 'admin.nav.items.products', icon: navIcons.products },
      { href: '/admin/games', labelKey: 'admin.nav.items.games', icon: navIcons.games },
      { href: '/admin/planner', labelKey: 'admin.nav.items.planner', icon: navIcons.content },
    ],
  },
  {
    id: 'library',
    titleKey: 'admin.nav.groups.library',
    items: [
      { href: '/admin/library/badges', labelKey: 'admin.nav.items.badges', icon: navIcons.achievements },
      { href: '/admin/library/coach-diagrams', labelKey: 'admin.nav.items.coachDiagrams', icon: navIcons.achievements },
    ],
  },
  {
    id: 'toolbelt',
    titleKey: 'admin.nav.groups.toolbelt',
    items: [
      { href: '/admin/tools', labelKey: 'admin.nav.items.diceSimulator', icon: navIcons.key },
      { href: '/admin/toolbelt/conversation-cards', labelKey: 'admin.nav.items.conversationCards', icon: navIcons.key },
    ],
  },
  {
    id: 'gamification',
    titleKey: 'admin.nav.groups.gamification',
    items: [
      { href: '/admin/gamification', labelKey: 'admin.nav.items.overview', icon: navIcons.leaderboard },
      { href: '/admin/gamification/dicecoin-xp', labelKey: 'admin.nav.items.dicecoinXp', icon: navIcons.leaderboard },
      { href: '/admin/gamification/achievements', labelKey: 'admin.nav.items.achievements', icon: navIcons.achievements },
      { href: '/admin/gamification/shop-rewards', labelKey: 'admin.nav.items.shopRewards', icon: navIcons.marketplace },
      { href: '/admin/gamification/library-exports', labelKey: 'admin.nav.items.libraryExports', icon: navIcons.content },
    ],
  },
  {
    id: 'learning',
    titleKey: 'admin.nav.groups.learning',
    items: [
      { href: '/admin/learning', labelKey: 'admin.nav.items.overview', icon: navIcons.learning },
      { href: '/admin/learning/courses', labelKey: 'admin.nav.items.courses', icon: navIcons.learning },
      { href: '/admin/learning/paths', labelKey: 'admin.nav.items.learningPaths', icon: navIcons.learning },
      { href: '/admin/learning/requirements', labelKey: 'admin.nav.items.requirements', icon: navIcons.learning },
    ],
  },
  {
    id: 'operations',
    titleKey: 'admin.nav.groups.operations',
    items: [
      { href: '/admin/sessions', labelKey: 'admin.nav.items.sessions', icon: navIcons.sessions },
      { href: '/admin/participants', labelKey: 'admin.nav.items.participants', icon: navIcons.participants },
      { href: '/admin/moderation', labelKey: 'admin.nav.items.moderation', icon: navIcons.moderation },
      { href: '/admin/tickets', labelKey: 'admin.nav.items.tickets', icon: navIcons.tickets },
    ],
  },
  {
    id: 'analytics',
    titleKey: 'admin.nav.groups.analytics',
    items: [{ href: '/admin/analytics', labelKey: 'admin.nav.items.analytics', icon: navIcons.analytics }],
  },
  {
    id: 'system',
    titleKey: 'admin.nav.groups.system',
    items: [
      { href: '/admin/billing', labelKey: 'admin.nav.items.billing', icon: navIcons.billing },
      { href: '/admin/notifications', labelKey: 'admin.nav.items.notifications', icon: navIcons.notifications },
      { href: '/admin/system-health', labelKey: 'admin.nav.items.systemHealth', icon: navIcons.systemHealth },
      { href: '/admin/audit-logs', labelKey: 'admin.nav.items.auditLogs', icon: navIcons.audit },
      { href: '/admin/feature-flags', labelKey: 'admin.nav.items.featureFlags', icon: navIcons.flag },
      { href: '/admin/api-keys', labelKey: 'admin.nav.items.apiKeys', icon: navIcons.key },
      { href: '/admin/webhooks', labelKey: 'admin.nav.items.webhooks', icon: navIcons.rss },
      { href: '/admin/incidents', labelKey: 'admin.nav.items.incidents', icon: navIcons.incident },
      { href: '/admin/release-notes', labelKey: 'admin.nav.items.releaseNotes', icon: navIcons.megaphone },
      { href: '/admin/settings', labelKey: 'admin.nav.items.settings', icon: navIcons.settings },
    ],
  },
]

export const allAdminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => group.items)
