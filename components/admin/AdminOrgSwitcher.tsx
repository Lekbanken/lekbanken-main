'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/lib/context/TenantContext'
import { selectTenant } from '@/app/actions/tenant'
import { ChevronUpDownIcon, CheckIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface AdminOrgSwitcherProps {
  /** Whether to show in compact mode (icon only) */
  compact?: boolean
  /** Callback after switching organisation */
  onSwitch?: (tenantId: string) => void
  /** Additional className */
  className?: string
}

/**
 * Organisation switcher for tenant admin context.
 * Allows switching between organisations user has admin access to.
 * 
 * Only shown in organisation/tenant admin mode.
 */
export function AdminOrgSwitcher({ compact = false, onSwitch, className = '' }: AdminOrgSwitcherProps) {
  const router = useRouter()
  const { currentTenant, userTenants, isLoadingTenants } = useTenant()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Filter to tenants where user has admin-level access
  const adminTenants = userTenants.filter((t) => {
    const role = t.membership?.role
    return role === 'owner' || role === 'admin' || role === 'editor'
  })

  const handleSelect = useCallback(
    async (tenantId: string) => {
      if (tenantId === currentTenant?.id) {
        setIsOpen(false)
        return
      }

      setIsSwitching(true)
      try {
        await selectTenant(tenantId)
        onSwitch?.(tenantId)
        // Navigate to the new tenant's admin dashboard
        router.push(`/admin/tenant/${tenantId}`)
      } catch (error) {
        console.error('Failed to switch tenant:', error)
      } finally {
        setIsSwitching(false)
        setIsOpen(false)
      }
    },
    [currentTenant?.id, onSwitch, router]
  )

  // Don't render if no tenants to show
  if (adminTenants.length === 0) {
    return null
  }

  // Single tenant - just show the name, no dropdown
  if (adminTenants.length === 1 && currentTenant) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 text-sm ${className}`}>
        <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground" />
        {!compact && (
          <span className="font-medium text-foreground truncate max-w-[160px]">
            {currentTenant.name}
          </span>
        )}
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isSwitching || isLoadingTenants}>
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 gap-2 px-3 ${compact ? 'w-9 p-0' : ''} ${className}`}
        >
          <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {!compact && (
            <>
              <span className="font-medium truncate max-w-[140px]">
                {currentTenant?.name ?? 'Välj organisation'}
              </span>
              <ChevronUpDownIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Byt organisation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {adminTenants.map((tenant) => {
          const isActive = tenant.id === currentTenant?.id
          return (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => handleSelect(tenant.id)}
              className="flex items-center gap-3 py-2 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                {tenant.name?.charAt(0).toUpperCase() ?? 'O'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tenant.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {tenant.membership?.role ?? 'member'}
                </p>
              </div>
              {isActive && <CheckIcon className="h-4 w-4 text-primary flex-shrink-0" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
