'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ProfileMenu } from '@/components/navigation/ProfileMenu'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'
import { useAdminMode } from './useAdminMode'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'
import { useTenant } from '@/lib/context/TenantContext'
import { Bars3Icon, ChevronRightIcon, HomeIcon, Cog6ToothIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminTopbarV2Props {
  onToggleSidebar?: () => void
}

// ---------------------------------------------------------------------------
// Route labels for breadcrumbs
// ---------------------------------------------------------------------------

const routeLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Användare',
  '/admin/organisations': 'Organisationer',
  '/admin/products': 'Produkter',
  '/admin/games': 'Lekhanteraren',
  '/admin/planner': 'Planläggaren',
  '/admin/library': 'Bibliotek',
  '/admin/library/badges': 'Badges',
  '/admin/library/coach-diagrams': 'Coach Diagrams',
  '/admin/gamification': 'Gamification',
  '/admin/gamification/achievements': 'Achievements',
  '/admin/gamification/dicecoin-xp': 'DiceCoin & XP',
  '/admin/gamification/shop-rewards': 'Shop & Rewards',
  '/admin/learning': 'Utbildning',
  '/admin/learning/courses': 'Kurser',
  '/admin/learning/paths': 'Lärstigar',
  '/admin/sessions': 'Sessioner',
  '/admin/participants': 'Deltagare',
  '/admin/moderation': 'Moderering',
  '/admin/tickets': 'Ärenden',
  '/admin/analytics': 'Analys',
  '/admin/notifications': 'Notifikationer',
  '/admin/settings': 'Inställningar',
  '/admin/billing': 'Fakturering',
  '/admin/licenses': 'Licenser',
  '/admin/media': 'Mediefiler',
  '/admin/tenant': 'Organisation',
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items
  const items = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    
    // Check for UUID (tenant ID) and skip or label appropriately
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
    if (isUuid) {
      return null // Skip UUID segments in breadcrumb display
    }

    const label = routeLabels[path] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    const isLast = index === segments.length - 1

    return { path, label, isLast }
  }).filter(Boolean)

  return (
    <nav className="hidden items-center gap-1.5 text-sm md:flex">
      <HomeIcon className="h-4 w-4 text-muted-foreground" />
      {items.map((item, i) => (
        <span key={item?.path ?? i} className="flex items-center gap-1.5">
          <ChevronRightIcon className="h-3 w-3 text-muted-foreground/40" />
          <span
            className={
              item?.isLast
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            }
          >
            {item?.label}
          </span>
        </span>
      ))}
    </nav>
  )
}

function ModeIndicator() {
  const { isSystemAdmin } = useRbac()
  const { mode } = useAdminMode({ isSystemAdmin })
  const { currentTenant } = useTenant()

  if (mode === 'system') {
    return (
      <div className="hidden items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 md:flex">
        <Cog6ToothIcon className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">System Admin</span>
      </div>
    )
  }

  if (mode === 'tenant' && currentTenant) {
    return (
      <div className="hidden items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 md:flex">
        <BuildingOffice2Icon className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary truncate max-w-[160px]">
          {currentTenant.name}
        </span>
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function AdminTopbarV2({ onToggleSidebar }: AdminTopbarV2Props) {
  const t = useTranslations('admin.nav')

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-sm lg:px-6">
      {/* Left side: Mobile menu + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label={t('openNavigation')}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right side: Mode indicator + Actions */}
      <div className="flex items-center gap-3">
        <ModeIndicator />

        <div className="flex items-center gap-1.5">
          {/* Notifications removed from admin - admin only creates, app consumes */}
          
          <ThemeToggle />
          
          <div className="ml-1">
            <ProfileMenu context="admin" />
          </div>
        </div>
      </div>
    </header>
  )
}
