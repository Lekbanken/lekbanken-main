/**
 * Tenant Context Hook
 *
 * Manages tenant selection, user's tenant memberships, and tenant-specific state.
 * Provides access to current tenant and tenant switching functionality.
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'

type Tenant = Database['public']['Tables']['tenants']['Row']
type UserTenantMembership = Database['public']['Tables']['user_tenant_memberships']['Row'] & {
  tenant: Tenant
}

interface TenantContextType {
  currentTenant: (Tenant & { membership: UserTenantMembership }) | null
  userTenants: (Tenant & { membership: UserTenantMembership })[]
  isLoadingTenants: boolean
  hasTenants: boolean
  selectTenant: (tenantId: string) => void
  createTenant: (name: string, type: string) => Promise<Tenant>
  reloadTenants: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [currentTenant, setCurrentTenant] = useState<(Tenant & { membership: UserTenantMembership }) | null>(null)
  const [userTenants, setUserTenants] = useState<(Tenant & { membership: UserTenantMembership })[]>([])
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)
  const [hasTenants, setHasTenants] = useState(false)

  // Load user's tenants
  const loadTenants = useCallback(async () => {
    if (!userId) {
      setIsLoadingTenants(false)
      setHasTenants(false)
      return
    }

    try {
      setIsLoadingTenants(true)

      // Get user's tenant memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_tenant_memberships')
        .select('*,tenant:tenants(*)')
        .eq('user_id', userId)

      if (membershipsError) throw membershipsError

      const tenantsWithMembership = (memberships || [])
        .filter(
          (m): m is typeof m & { tenant: Tenant } => m.tenant !== null
        )
        .map((m) => ({
          ...m.tenant,
          membership: m as UserTenantMembership,
        }))

      setUserTenants(tenantsWithMembership)
      setHasTenants(tenantsWithMembership.length > 0)

      // Set current tenant from saved preference or first tenant
      const savedTenantId = localStorage.getItem('selectedTenantId')
      const primaryOrFirst =
        tenantsWithMembership.find((t) => t.membership.is_primary) ||
        tenantsWithMembership.find((t) => t.id === savedTenantId) ||
        tenantsWithMembership[0]

      if (primaryOrFirst) {
        setCurrentTenant(primaryOrFirst)
        localStorage.setItem('selectedTenantId', primaryOrFirst.id)
      }
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setIsLoadingTenants(false)
    }
  }, [userId])

  useEffect(() => {
    loadTenants()
  }, [userId, loadTenants])

  const selectTenant = useCallback((tenantId: string) => {
    const tenant = userTenants.find((t) => t.id === tenantId)
    if (tenant) {
      setCurrentTenant(tenant)
      localStorage.setItem('selectedTenantId', tenantId)
    }
  }, [userTenants])

  const createTenant = useCallback(
    async (name: string, type: string): Promise<Tenant> => {
      if (!userId) throw new Error('No user logged in')

      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([
          {
            name,
            type,
            status: 'active',
            main_language: 'NO',
          },
        ])
        .select()
        .single()

      if (tenantError) throw tenantError

      // Add user as owner
      const { error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .insert([
          {
            user_id: userId,
            tenant_id: tenant.id,
            role: 'admin',
            is_primary: true,
          },
        ])

      if (membershipError) throw membershipError

      // Reload tenants to refresh the list
      await loadTenants()

      return tenant
    },
    [userId, loadTenants]
  )

  const reloadTenants = useCallback(async () => {
    await loadTenants()
  }, [loadTenants])

  const value: TenantContextType = {
    currentTenant,
    userTenants,
    isLoadingTenants,
    hasTenants,
    selectTenant,
    createTenant,
    reloadTenants,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}
