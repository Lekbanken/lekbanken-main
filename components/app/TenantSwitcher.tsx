'use client'

/**
 * TenantSwitcher Component
 * Allows users to switch between their tenant memberships
 * Used in Profile page and other places where tenant switching is needed
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BuildingOffice2Icon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { selectTenant } from '@/app/actions/tenant'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface TenantMembership {
  tenant_id: string
  role: string | null
  is_primary: boolean
  tenant: {
    id: string
    name: string
    slug?: string | null
  } | null
}

interface TenantSwitcherProps {
  memberships: TenantMembership[]
  currentTenantId: string | null
  variant?: 'default' | 'compact' | 'card'
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function TenantSwitcher({ 
  memberships, 
  currentTenantId, 
  variant = 'default',
  className 
}: TenantSwitcherProps) {
  const t = useTranslations('app.profile.tenant')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const currentTenant = memberships.find(m => m.tenant_id === currentTenantId)
  const hasMultipleTenants = memberships.length > 1

  const handleSelectTenant = (tenantId: string) => {
    if (tenantId === currentTenantId) {
      setIsOpen(false)
      return
    }

    startTransition(async () => {
      await selectTenant(tenantId)
      router.refresh()
      setIsOpen(false)
    })
  }

  // Card variant - full list display
  if (variant === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        {memberships.map((membership) => {
          const isActive = membership.tenant_id === currentTenantId
          return (
            <button
              key={membership.tenant_id}
              type="button"
              disabled={isPending}
              onClick={() => handleSelectTenant(membership.tenant_id)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition',
                isActive 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                  : 'border-border hover:border-primary/60 hover:bg-muted',
                isPending && 'opacity-50 cursor-wait'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isActive ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <BuildingOffice2Icon className={cn(
                    'h-5 w-5',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {membership.tenant?.name ?? t('unknownName')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {membership.role ?? 'member'}
                    {membership.is_primary && ` • ${t('primary')}`}
                  </p>
                </div>
              </div>
              {isActive && (
                <CheckIcon className="h-5 w-5 text-primary" />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // If only one tenant, show static display
  if (!hasMultipleTenants) {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg border border-border px-3 py-2',
        className
      )}>
        <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {currentTenant?.tenant?.name ?? t('noTenant')}
        </span>
      </div>
    )
  }

  // Dropdown variant (default and compact)
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === 'compact' ? 'sm' : 'md'}
          className={cn('justify-between', className)}
          disabled={isPending}
        >
          <span className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-4 w-4" />
            <span className={cn(variant === 'compact' && 'max-w-[120px] truncate')}>
              {currentTenant?.tenant?.name ?? t('selectTenant')}
            </span>
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {memberships.map((membership) => {
          const isActive = membership.tenant_id === currentTenantId
          return (
            <DropdownMenuItem
              key={membership.tenant_id}
              onClick={() => handleSelectTenant(membership.tenant_id)}
              className={cn(isActive && 'bg-primary/5')}
            >
              <div className="flex w-full items-center justify-between">
                <div>
                  <p className="font-medium">
                    {membership.tenant?.name ?? t('unknownName')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {membership.role ?? 'member'}
                  </p>
                </div>
                {isActive && <CheckIcon className="h-4 w-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
