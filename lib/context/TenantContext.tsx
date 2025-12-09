/**
 * Tenant Context Hook
 *
 * Manages tenant selection, user's tenant memberships, and tenant-specific state.
 * Provides access to current tenant and tenant switching functionality.
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useTransition, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { resolveCurrentTenant, selectTenant as selectTenantAction } from '@/app/actions/tenant'
import type { Database } from '@/types/supabase'

type Tenant = Database['public']['Tables']['tenants']['Row']
type UserTenantMembership = any & {
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

export const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const [currentTenant, setCurrentTenant] = useState<(Tenant & { membership: UserTenantMembership }) | null>(null)
  const [userTenants, setUserTenants] = useState<(Tenant & { membership: UserTenantMembership })[]>([])
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)
  const [hasTenants, setHasTenants] = useState(false)
  const [, startTransition] = useTransition()
  
  // Track previous userId to detect user changes
  const prevUserIdRef = useRef<string | null>(null)

  // Load user's tenants
  const loadTenants = useCallback(async () => {
    console.log('[TenantContext] loadTenants called, userId:', userId)
    if (!userId) {
      console.log('[TenantContext] No userId, clearing tenant state')
      setCurrentTenant(null)
      setUserTenants([])
      setHasTenants(false)
      setIsLoadingTenants(false)
      return
    }

    try {
      setIsLoadingTenants(true)
      console.log('[TenantContext] Calling resolveCurrentTenant...')
      const resolved = await resolveCurrentTenant()
      console.log('[TenantContext] resolveCurrentTenant result:', resolved)

      const tenantsWithMembership = (resolved.tenants || []) as (Tenant & { membership: UserTenantMembership })[]

      setUserTenants(tenantsWithMembership)
      setHasTenants(tenantsWithMembership.length > 0)
      setCurrentTenant((resolved.tenant as Tenant & { membership: UserTenantMembership }) ?? null)
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      console.log('[TenantContext] loadTenants done, setting isLoadingTenants=false')
      setIsLoadingTenants(false)
    }
  }, [userId])

  // Reload tenants when userId changes (including login/logout)
  useEffect(() => {
    const userChanged = prevUserIdRef.current !== userId
    prevUserIdRef.current = userId
    
    if (userChanged) {
      console.log('[TenantContext] User changed, reloading tenants', { prev: prevUserIdRef.current, new: userId })
    }
    
    loadTenants()
  }, [userId, loadTenants])
  
  // Listen to auth state changes to refresh tenants on SIGNED_IN
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('[TenantContext] SIGNED_IN detected, reloading tenants')
        loadTenants()
      } else if (event === 'SIGNED_OUT') {
        console.log('[TenantContext] SIGNED_OUT detected, clearing tenants')
        setCurrentTenant(null)
        setUserTenants([])
        setHasTenants(false)
      }
    })
    
    return () => subscription?.unsubscribe()
  }, [loadTenants])

  const selectTenant = useCallback(
    (tenantId: string) => {
      startTransition(async () => {
        const result = await selectTenantAction(tenantId)
        if (result.tenant) {
          setCurrentTenant(result.tenant as Tenant & { membership: UserTenantMembership })
          await loadTenants()
        }
      })
    },
    [loadTenants]
  )

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

      // Add user as owner via security definer function to satisfy RLS on fresh tenants
      const { error: membershipError } = await supabase.rpc('add_initial_tenant_owner', {
        target_tenant: tenant.id,
      })

      if (membershipError) throw membershipError

      await selectTenant(tenant.id)

      return tenant
    },
    [userId, selectTenant]
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
