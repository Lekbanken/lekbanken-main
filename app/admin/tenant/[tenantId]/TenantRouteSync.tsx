'use client'

import { useEffect } from 'react'
import { useTenant } from '@/lib/context/TenantContext'

export function TenantRouteSync({ tenantId, enabled = true }: { tenantId: string; enabled?: boolean }) {
  const { currentTenant, selectTenant, isLoadingTenants } = useTenant()

  useEffect(() => {
    if (!enabled) return
    if (!tenantId) return
    if (isLoadingTenants) return

    const currentId = currentTenant?.id ?? null
    if (currentId && currentId === tenantId) return

    selectTenant(tenantId)
  }, [enabled, tenantId, currentTenant?.id, isLoadingTenants, selectTenant])

  return null
}
