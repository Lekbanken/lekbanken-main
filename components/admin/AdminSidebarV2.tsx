'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'
import { useAdminMode } from '@/components/admin/useAdminMode'
import { AdminOrgSwitcher } from '@/components/admin/AdminOrgSwitcher'
import {
  ADMIN_NAV,
  resolveNavHref,
  getExpandedCategoriesFromRoute,
  type AdminNavCategory,
} from '@/lib/admin/nav'
import { navIcons } from '@/app/admin/components/admin-nav-config'
import {
  ChevronDownIcon,
  ChevronDoubleLeftIcon,
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminSidebarV2Props {
  variant?: 'desktop' | 'mobile'
  open?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const EXPANDED_KEY = 'lekbanken_admin_expanded_categories'

function _getStoredExpandedCategories(userId: string): Set<string> {
  try {
    const stored = localStorage.getItem(`${EXPANDED_KEY}_${userId}`)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // ignore
  }
  return new Set()
}

function storeExpandedCategories(userId: string, categories: Set<string>) {
  try {
    localStorage.setItem(`${EXPANDED_KEY}_${userId}`, JSON.stringify([...categories]))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function NavCategory({
  category,
  isExpanded,
  onToggle,
  currentPath,
  tenantId,
  collapsed,
  onNavigate,
  checkPermission,
  isSystemAdmin,
}: {
  category: AdminNavCategory
  isExpanded: boolean
  onToggle: () => void
  currentPath: string
  tenantId: string | null
  collapsed: boolean
  onNavigate?: () => void
  checkPermission: (permission: string) => boolean
  isSystemAdmin: boolean
}) {
  // Filter items based on permissions
  const visibleItems = useMemo(() => {
    return category.items.filter((item) => {
      if (item.systemAdminOnly && !isSystemAdmin) return false
      if (item.tenantOnly && !tenantId) return false
      if (item.permission && !checkPermission(item.permission)) return false
      return true
    })
  }, [category.items, isSystemAdmin, tenantId, checkPermission])

  if (visibleItems.length === 0) return null

  const hasActiveItem = visibleItems.some((item) => {
    const href = resolveNavHref(item.href, tenantId)
    return currentPath === href || (href !== '/admin' && currentPath.startsWith(href))
  })

  const iconElement = navIcons[category.icon as keyof typeof navIcons] || null

  if (collapsed) {
    // In collapsed mode, show only the category icon with a tooltip
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={onToggle}
          title={category.label}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            hasActiveItem
              ? 'bg-primary/15 text-primary'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
          }`}
        >
          <span className="h-5 w-5">{iconElement}</span>
        </button>
        
        {/* Flyout menu on hover */}
        <div className="absolute left-full top-0 z-50 ml-2 hidden min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl group-hover:block">
          <p className="mb-2 px-2 text-xs font-semibold text-slate-400">{category.label}</p>
          {visibleItems.map((item) => {
            const href = resolveNavHref(item.href, tenantId)
            const isActive = currentPath === href || (href !== '/admin' && currentPath.startsWith(href))
            return (
              <Link
                key={item.id}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  isActive ? 'bg-primary/15 text-primary' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          hasActiveItem
            ? 'bg-primary/10 text-primary'
            : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
        }`}
      >
        <span className={`h-5 w-5 flex-shrink-0 ${hasActiveItem ? 'text-primary' : 'text-slate-400'}`}>
          {iconElement}
        </span>
        <span className="flex-1 text-left">{category.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="mt-1 ml-4 space-y-0.5 border-l border-slate-800 pl-4">
          {visibleItems.map((item) => {
            const href = resolveNavHref(item.href, tenantId)
            const isActive = currentPath === href || (href !== '/admin' && currentPath.startsWith(href))
            const itemIcon = navIcons[item.icon as keyof typeof navIcons]

            return (
              <Link
                key={item.id}
                href={href}
                onClick={onNavigate}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute -left-4 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                )}
                {itemIcon && (
                  <span className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {itemIcon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge variant="error" size="sm" className="bg-red-500 text-white text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSystemAdmin, currentTenantId, can } = useRbac()
  const { mode, setMode, canSwitchMode, isHydrated } = useAdminMode({ isSystemAdmin })

  // Get categories based on current mode
  const categories = mode === 'system' ? ADMIN_NAV.system : ADMIN_NAV.organisation

  // Expanded categories state with localStorage persistence
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Initialize with active category expanded
    return getExpandedCategoriesFromRoute(categories, pathname, currentTenantId)
  })

  // Persist expanded state
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Use a generic key since we don't have userId easily here
    storeExpandedCategories('default', expandedCategories)
  }, [expandedCategories])

  // When route changes, ensure the active category is expanded
  // Use useMemo to calculate which categories should be expanded instead of setState in effect
  const activeCategories = useMemo(() => {
    return getExpandedCategoriesFromRoute(categories, pathname, currentTenantId)
  }, [pathname, categories, currentTenantId])

  // Merge active categories with stored state on mount and route change
  useEffect(() => {
    if (activeCategories.size > 0) {
      // Use functional update to avoid direct setState in effect warning
      setExpandedCategories((prev) => {
        const next = new Set(prev)
        activeCategories.forEach((cat) => next.add(cat))
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]) // Only trigger on pathname change

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const handleSwitchToSystem = useCallback(() => {
    setMode('system')
    router.push('/admin')
    onNavigate?.()
  }, [setMode, router, onNavigate])

  const handleSwitchToTenant = useCallback(() => {
    setMode('tenant')
    if (currentTenantId) {
      router.push(`/admin/tenant/${currentTenantId}`)
    } else {
      router.push('/app/select-tenant')
    }
    onNavigate?.()
  }, [setMode, currentTenantId, router, onNavigate])

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Logo area */}
      <div className={`flex h-16 items-center border-b border-slate-800 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          {/* Lekbanken brand mark */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 shadow-lg shadow-primary/25">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white tracking-tight">Lekbanken</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Admin</p>
            </div>
          )}
        </Link>
      </div>

      {/* Mode toggle - System vs Organisation */}
      {isSystemAdmin && (
        <div className={`border-b border-slate-800 ${collapsed ? 'p-2' : 'p-3'}`}>
          <div
            className={
              collapsed
                ? 'flex flex-col gap-1.5'
                : 'flex items-center gap-1 rounded-lg bg-slate-800/50 p-1'
            }
          >
            <button
              type="button"
              onClick={handleSwitchToSystem}
              disabled={!canSwitchMode || !isHydrated}
              title={collapsed ? 'System' : undefined}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                mode === 'system'
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              } ${collapsed ? 'h-9 w-full' : 'flex-1'} ${!canSwitchMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Cog6ToothIcon className="h-4 w-4" />
              {!collapsed && <span>System</span>}
            </button>

            <button
              type="button"
              onClick={handleSwitchToTenant}
              disabled={!isHydrated}
              title={collapsed ? 'Organisation' : undefined}
              className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                mode === 'tenant'
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              } ${collapsed ? 'h-9 w-full' : 'flex-1'}`}
            >
              <BuildingOffice2Icon className="h-4 w-4" />
              {!collapsed && <span>Organisation</span>}
            </button>
          </div>
        </div>
      )}

      {/* Organisation switcher (only in tenant mode) */}
      {mode === 'tenant' && !collapsed && (
        <div className="border-b border-slate-800 p-3">
          <AdminOrgSwitcher compact={collapsed} />
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className={`space-y-1 ${collapsed ? 'p-2' : 'p-3'}`}>
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-xs text-slate-500 text-center">
              {mode === 'tenant' ? 'Välj en organisation för att se menyn.' : 'Inga sidor tillgängliga.'}
            </p>
          ) : (
            categories.map((category) => (
              <NavCategory
                key={category.id}
                category={category}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={() => toggleCategory(category.id)}
                currentPath={pathname}
                tenantId={currentTenantId}
                collapsed={collapsed}
                onNavigate={onNavigate}
                checkPermission={(p) => can(p as Parameters<typeof can>[0])}
                isSystemAdmin={isSystemAdmin}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3">
        <Link
          href="/app"
          onClick={onNavigate}
          title={collapsed ? 'Tillbaka till appen' : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          {!collapsed && <span>Tillbaka till appen</span>}
        </Link>

        {/* Collapse toggle (desktop only) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-slate-300 ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <ChevronDoubleLeftIcon
              className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && <span className="text-xs">Minimera</span>}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function AdminSidebarV2({
  variant = 'desktop',
  open = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarV2Props) {
  if (variant === 'mobile') {
    return (
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <SheetContent side="left" className="w-72 border-slate-800 bg-slate-900 p-0">
          <SidebarContent onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={`hidden h-screen flex-shrink-0 transition-all duration-200 ease-in-out lg:block ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="sticky top-0 h-screen">
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </div>
    </aside>
  )
}
