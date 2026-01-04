import type { ReactNode } from 'react'

import { navIcons } from './admin-nav-config'

export type AdminNavItem = {
  href: string
  label: string
  icon: ReactNode
  badge?: string
}

export type AdminNavGroup = {
  id: string
  title: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'overview',
    title: 'Översikt',
    items: [{ href: '/admin', label: 'Dashboard', icon: navIcons.dashboard }],
  },
  {
    id: 'organisation-users',
    title: 'Organisation & Användare',
    items: [
      { href: '/admin/organisations', label: 'Organisationer', icon: navIcons.organisations },
      { href: '/admin/users', label: 'Användare', icon: navIcons.users },
    ],
  },
  {
    id: 'products-content',
    title: 'Produkter & Innehåll',
    items: [
      { href: '/admin/products', label: 'Produkter', icon: navIcons.products },
      { href: '/admin/games', label: 'Lekhanteraren', icon: navIcons.games },
      { href: '/admin/planner', label: 'Planläggaren', icon: navIcons.content },
    ],
  },
  {
    id: 'library',
    title: 'Bibliotek',
    items: [
      { href: '/admin/library/badges', label: 'Badges', icon: navIcons.achievements },
      { href: '/admin/library/coach-diagrams', label: 'Coach Diagrams', icon: navIcons.achievements },
    ],
  },
  {
    id: 'toolbelt',
    title: 'Verktyg (Toolbelt)',
    items: [
      { href: '/admin/tools', label: 'Tärningssimulator', icon: navIcons.key },
      { href: '/admin/toolbelt/conversation-cards', label: 'Samtalskort', icon: navIcons.key },
    ],
  },
  {
    id: 'gamification',
    title: 'Gamification hub',
    items: [
      { href: '/admin/gamification', label: 'Översikt', icon: navIcons.leaderboard },
      { href: '/admin/gamification/dicecoin-xp', label: 'DiceCoin & XP', icon: navIcons.leaderboard },
      { href: '/admin/gamification/achievements', label: 'Achievements', icon: navIcons.achievements },
      { href: '/admin/gamification/shop-rewards', label: 'Shop & Rewards', icon: navIcons.marketplace },
      { href: '/admin/gamification/library-exports', label: 'Library Exports', icon: navIcons.content },
    ],
  },
  {
    id: 'operations',
    title: 'Operativt / Live',
    items: [
      { href: '/admin/sessions', label: 'Sessioner', icon: navIcons.sessions },
      { href: '/admin/participants', label: 'Deltagare', icon: navIcons.participants },
      { href: '/admin/moderation', label: 'Moderering', icon: navIcons.moderation },
      { href: '/admin/tickets', label: 'Ärenden', icon: navIcons.tickets },
    ],
  },
  {
    id: 'analytics',
    title: 'Analys',
    items: [{ href: '/admin/analytics', label: 'Analys', icon: navIcons.analytics }],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { href: '/admin/billing', label: 'Fakturering', icon: navIcons.billing },
      { href: '/admin/notifications', label: 'Notifikationer', icon: navIcons.notifications },
      { href: '/admin/system-health', label: 'System Health', icon: navIcons.systemHealth },
      { href: '/admin/audit-logs', label: 'Granskningslogg', icon: navIcons.audit },
      { href: '/admin/feature-flags', label: 'Feature Flags', icon: navIcons.flag },
      { href: '/admin/api-keys', label: 'API-nycklar', icon: navIcons.key },
      { href: '/admin/webhooks', label: 'Webhooks', icon: navIcons.rss },
      { href: '/admin/incidents', label: 'Incidenter', icon: navIcons.incident },
      { href: '/admin/release-notes', label: 'Release Notes', icon: navIcons.megaphone },
      { href: '/admin/settings', label: 'Inställningar', icon: navIcons.settings },
    ],
  },
]

export const allAdminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => group.items)
