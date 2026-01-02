import type { ReactNode } from 'react'

export type AdminNavItem = {
  href: string
  label: string
  icon: ReactNode
  badge?: string
}

const iconBase = 'h-5 w-5'

// Dashboard
const iconDashboard = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </svg>
)

// Organisationer
const iconOrganisations = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 21V8l-6-4-6 4v13" />
    <path d="M2 21h20" />
    <path d="M9 12h6m-6 4h6" />
  </svg>
)

// Användare
const iconUsers = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 20c0-2.8 2.7-5 6-5s6 2.2 6 5" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M21 20c0-2 -1.8-3.5-4-3.5" />
  </svg>
)

// Licenser
const iconLicenses = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 7h6m-6 4h6m-6 4h4" />
  </svg>
)

// Innehåll
const iconContent = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
)

// Analys
const iconAnalytics = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20V10m6 10V4m6 16v-8m6 8v-4" />
  </svg>
)

// Inställningar
const iconSettings = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-5.07-1.41 1.41M8.34 15.66l-1.41 1.41m10.14 0-1.41-1.41M8.34 8.34 6.93 6.93" />
  </svg>
)

// Fakturering
const iconBilling = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
)

// Moderering
const iconModeration = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3 4 7v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

// Notifikationer
const iconNotifications = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

// Leaderboard
const iconLeaderboard = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M8 21V11m8 10V7m-4 14v-6" />
    <path d="M4 21h16" />
  </svg>
)

// Achievements
const iconAchievements = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="6" />
    <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
  </svg>
)

// Personalization
const iconPersonalization = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a7 7 0 0 0 0 14" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

// Marketplace (Butik)
const iconMarketplace = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 9h18v12H3V9Z" />
    <path d="M3 9 5 3h14l2 6" />
    <path d="M12 9v12" />
  </svg>
)

// Ärenden (Tickets)
const iconTickets = (
  <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 4h16v16H4z" />
    <path d="M4 9h16M9 4v16" />
  </svg>
)

// Main navigation items
export const adminMainNavItems: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: iconDashboard },
  { href: '/admin/organisations', label: 'Organisationer', icon: iconOrganisations },
  { href: '/admin/users', label: 'Användare', icon: iconUsers },
  { href: '/admin/licenses', label: 'Licenser', icon: iconLicenses },
  { href: '/admin/content', label: 'Innehåll', icon: iconContent },
]

// Secondary navigation items (Verktyg)
export const adminSecondaryNavItems: AdminNavItem[] = [
  { href: '/admin/analytics', label: 'Analys', icon: iconAnalytics },
  { href: '/admin/billing', label: 'Fakturering', icon: iconBilling },
  { href: '/admin/moderation', label: 'Moderering', icon: iconModeration, badge: '3' },
  { href: '/admin/notifications', label: 'Notifikationer', icon: iconNotifications },
  { href: '/admin/tickets', label: 'Ärenden', icon: iconTickets, badge: '5' },
]

// Settings/System navigation items  
export const adminSettingsNavItems: AdminNavItem[] = [
  { href: '/admin/leaderboard', label: 'Leaderboard', icon: iconLeaderboard },
  { href: '/admin/library/badges', label: 'Bibliotek', icon: iconAchievements },
  { href: '/admin/library/coach-diagrams', label: 'Coach Diagrams', icon: iconAchievements },
  { href: '/admin/achievements-advanced', label: 'Achievements Advanced', icon: iconAchievements },
  { href: '/admin/gamification/awards', label: 'Belöningar', icon: iconAchievements },
  { href: '/admin/gamification/analytics', label: 'Gamification-analys', icon: iconAnalytics },
  { href: '/admin/gamification/campaigns', label: 'Kampanjer', icon: iconAnalytics },
  { href: '/admin/gamification/automation', label: 'Automation', icon: iconSettings },
  { href: '/admin/gamification/levels', label: 'Levels', icon: iconSettings },
  { href: '/admin/personalization', label: 'Personalisering', icon: iconPersonalization },
  { href: '/admin/marketplace', label: 'Butik', icon: iconMarketplace },
  { href: '/admin/settings', label: 'Inställningar', icon: iconSettings },
]

// Combined for easy access
export const allAdminNavItems: AdminNavItem[] = [
  ...adminMainNavItems,
  ...adminSecondaryNavItems,
  ...adminSettingsNavItems,
]
