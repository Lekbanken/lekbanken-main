'use client'

import { useTranslations } from 'next-intl'
import { CheckIcon, ChevronDownIcon, UserIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { useTenant } from '@/lib/context/TenantContext'
import { cn } from '@/lib/utils'

interface TenantSelectorProps {
  /** Additional class names */
  className?: string
  /** Compact mode for mobile/sidebar */
  compact?: boolean
  /** Display variant: 'default' for dropdown, 'full' for full-width inline */
  variant?: 'default' | 'full'
  /** Callback when tenant is changed */
  onTenantChange?: (tenantId: string) => void
}

/**
 * TenantSelector - Dropdown for switching between personal and organization tenants.
 *
 * Features:
 * - Two sections: "Personligt" (personal) and "Organisationer" (organizations)
 * - Hidden when user has only one tenant option
 * - Personal tenants show as "Mitt konto" with user icon
 * - Org tenants show with building icon
 */
export function TenantSelector({ className, compact = false, variant = 'default', onTenantChange }: TenantSelectorProps) {
  const t = useTranslations('common.tenant')
  const {
    currentTenant,
    personalTenant,
    organizationTenants,
    isCurrentTenantPrivate,
    showTenantSelector,
    selectTenant,
    isLoadingTenants,
  } = useTenant()

  // Don't render if there's nothing to select
  if (!showTenantSelector || isLoadingTenants) {
    return null
  }

  const handleSelect = (tenantId: string) => {
    selectTenant(tenantId)
    onTenantChange?.(tenantId)
  }

  // Current tenant display
  const currentLabel = isCurrentTenantPrivate
    ? t('personal')
    : currentTenant?.name || t('selectTenant')

  const CurrentIcon = isCurrentTenantPrivate ? UserIcon : BuildingOffice2Icon

  // Full variant - inline list of buttons (for mobile profile page)
  if (variant === 'full') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Personal Section */}
        {personalTenant && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" />
              {t('sectionPersonal')}
            </div>
            <button
              onClick={() => handleSelect(personalTenant.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2 p-3 rounded-lg border transition-colors',
                currentTenant?.id === personalTenant.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar
                  name={t('personal')}
                  size="sm"
                  className="bg-primary/10"
                />
                <span className="font-medium">{t('personal')}</span>
              </div>
              {currentTenant?.id === personalTenant.id && (
                <CheckIcon className="h-4 w-4 text-primary" />
              )}
            </button>
          </div>
        )}

        {/* Organizations Section */}
        {organizationTenants.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BuildingOffice2Icon className="h-3.5 w-3.5" />
              {t('sectionOrganizations')}
            </div>
            <div className="space-y-2">
              {organizationTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelect(tenant.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 p-3 rounded-lg border transition-colors',
                    currentTenant?.id === tenant.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={tenant.name}
                      src={tenant.logo_url ?? undefined}
                      size="sm"
                    />
                    <div className="flex flex-col items-start">
                      <span className="font-medium truncate max-w-[200px]">{tenant.name}</span>
                      {tenant.membership?.role && (
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {tenant.membership.role}
                        </span>
                      )}
                    </div>
                  </div>
                  {currentTenant?.id === tenant.id && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default variant - dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'flex items-center gap-2 font-normal',
            compact ? 'h-9 px-2' : 'h-10 px-3',
            className
          )}
        >
          <CurrentIcon className="h-4 w-4 text-muted-foreground" />
          {!compact && (
            <span className="max-w-[150px] truncate">{currentLabel}</span>
          )}
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {/* Personal Section */}
        {personalTenant && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <UserIcon className="h-3.5 w-3.5" />
              {t('sectionPersonal')}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleSelect(personalTenant.id)}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Avatar
                  name={t('personal')}
                  size="sm"
                  className="bg-primary/10"
                />
                <span>{t('personal')}</span>
              </div>
              {currentTenant?.id === personalTenant.id && (
                <CheckIcon className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          </>
        )}

        {/* Separator if we have both */}
        {personalTenant && organizationTenants.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {/* Organizations Section */}
        {organizationTenants.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BuildingOffice2Icon className="h-3.5 w-3.5" />
              {t('sectionOrganizations')}
            </DropdownMenuLabel>
            {organizationTenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => handleSelect(tenant.id)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    name={tenant.name}
                    src={tenant.logo_url ?? undefined}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="truncate max-w-[160px]">{tenant.name}</span>
                    {tenant.membership?.role && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {tenant.membership.role}
                      </span>
                    )}
                  </div>
                </div>
                {currentTenant?.id === tenant.id && (
                  <CheckIcon className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default TenantSelector
