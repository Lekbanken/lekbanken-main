export type ProfileSurfaceActionId = 'profile' | 'security' | 'dashboard' | 'admin' | 'marketing'

export type ProfileSurfaceAction = {
  id: ProfileSurfaceActionId
  href: string
  labelKey: string
  descriptionKey?: string
  adminOnly?: boolean
  hideInMarketingContext?: boolean
}

const PROFILE_SURFACE_ACTIONS: ProfileSurfaceAction[] = [
  {
    id: 'profile',
    href: '/app/profile',
    labelKey: 'app.nav.profile',
  },
  {
    id: 'security',
    href: '/app/profile/security',
    labelKey: 'app.profile.security',
  },
  {
    id: 'dashboard',
    href: '/app',
    labelKey: 'app.nav.dashboard',
    descriptionKey: 'app.nav.goToDashboard',
  },
  {
    id: 'admin',
    href: '/admin',
    labelKey: 'app.nav.admin',
    descriptionKey: 'app.nav.manageApp',
    adminOnly: true,
  },
  {
    id: 'marketing',
    href: '/',
    labelKey: 'app.nav.marketing',
    descriptionKey: 'app.nav.visitWebsite',
    hideInMarketingContext: true,
  },
]

export function getProfileSurfaceActions(options?: {
  isAdmin?: boolean
  context?: 'marketing' | 'app' | 'admin'
}) {
  const isAdmin = options?.isAdmin ?? false
  const context = options?.context ?? 'app'

  return PROFILE_SURFACE_ACTIONS.filter((action) => {
    if (action.adminOnly && !isAdmin) return false
    if (action.hideInMarketingContext && context === 'marketing') return false
    return true
  })
}
