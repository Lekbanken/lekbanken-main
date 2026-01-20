'use client';

import { useTenant } from '@/lib/context/TenantContext';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

interface ActingAsTenantBannerProps {
  /** Callback when user wants to exit tenant context */
  onExitTenantContext?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Banner shown when a system_admin is viewing admin as a specific tenant.
 * Helps prevent confusion about which context they're operating in.
 * 
 * @example
 * <ActingAsTenantBanner onExitTenantContext={() => clearTenantContext()} />
 */
export function ActingAsTenantBanner({ 
  onExitTenantContext,
  className = '' 
}: ActingAsTenantBannerProps) {
  const t = useTranslations('admin.nav.tenantContext');
  const { currentTenant } = useTenant();
  const { isSystemAdmin, currentTenantId } = useRbac();

  // Only show for system admins who have selected a tenant
  if (!isSystemAdmin || !currentTenantId || !currentTenant) {
    return null;
  }

  return (
    <div 
      className={`bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-500/20">
            <BuildingOfficeIcon className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-amber-700 dark:text-amber-400">
            <span className="font-medium">{t('actingAsLabel')}</span>{' '}
            <span className="font-semibold">{currentTenant.name}</span>
          </span>
        </div>
        
        {onExitTenantContext && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExitTenantContext}
            className="h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-500/20"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('exit')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for use in sidebar or topbar
 */
export function ActingAsTenantBadge() {
  const { currentTenant } = useTenant();
  const { isSystemAdmin, currentTenantId } = useRbac();

  if (!isSystemAdmin || !currentTenantId || !currentTenant) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
      <BuildingOfficeIcon className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-amber-600 dark:text-amber-400 font-medium truncate max-w-[120px]">
        {currentTenant.name}
      </span>
    </div>
  );
}
