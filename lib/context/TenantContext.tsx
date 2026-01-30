/**
 * Tenant Context Hook
 *
 * Manages tenant selection, user's tenant memberships, and tenant-specific state.
 * Supports server-hydrated initial state.
 */

'use client'

import type {
  ReactNode} from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useTransition,
  useRef,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import { resolveCurrentTenant, selectTenant as selectTenantAction } from '@/app/actions/tenant'
import type { Tenant, TenantMembership, TenantRole, TenantWithMembership } from '@/types/tenant'
import {
  isPrivateTenant,
  getPersonalTenantForUser,
  getOrganizationTenants,
  getTenantContextMode,
  shouldShowTenantSelector,
  type TenantContextMode,
} from '@/lib/tenant/helpers'

interface TenantContextType {
  currentTenant: TenantWithMembership | null
  userTenants: TenantWithMembership[]
  tenantRole: TenantRole | null
  isLoadingTenants: boolean
  hasTenants: boolean
  isSystemAdmin: boolean
  selectTenant: (tenantId: string) => void
  createTenant: (name: string, type: string) => Promise<Tenant>
  reloadTenants: () => Promise<void>
  // Personal license helpers
  personalTenant: TenantWithMembership | null
  organizationTenants: TenantWithMembership[]
  isCurrentTenantPrivate: boolean
  contextMode: TenantContextMode
  showTenantSelector: boolean
}

type TenantProviderProps = {
  children: ReactNode
  userId: string | null
  initialTenant?: TenantWithMembership | null
  initialRole?: TenantRole | null
  initialMemberships?: TenantMembership[]
  isSystemAdmin?: boolean
}

function mapMembershipsToTenants(memberships: TenantMembership[]): TenantWithMembership[] {
  return memberships
    .filter((m) => m.tenant && m.tenant_id)
    .map((m) => ({
      ...m.tenant!,
      membership: {
        tenant_id: m.tenant_id!,
        role: (m.role ?? 'member') as TenantRole,
        is_primary: m.is_primary,
        status: m.status ?? null,
      },
    }))
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({
  children,
  userId,
  initialTenant,
  initialRole,
  initialMemberships,
  isSystemAdmin = false,
}: TenantProviderProps) {
  const hasInitial = initialTenant !== undefined || initialMemberships !== undefined

  const [currentTenant, setCurrentTenant] = useState<TenantWithMembership | null>(() => {
    if (initialTenant) {
      return initialTenant
    }
    return null
  })
  const [userTenants, setUserTenants] = useState<TenantWithMembership[]>(() =>
    initialMemberships ? mapMembershipsToTenants(initialMemberships) : []
  )
  const [isLoadingTenants, setIsLoadingTenants] = useState(!hasInitial)
  const [hasTenants, setHasTenants] = useState(
    initialMemberships ? initialMemberships.length > 0 : false
  )
  const [, startTransition] = useTransition()

  const prevUserIdRef = useRef<string | null>(null)

  const tenantRole = currentTenant?.membership?.role ?? initialRole ?? null

  const loadTenants = useCallback(async () => {
    if (!userId) {
      setCurrentTenant(null)
      setUserTenants([])
      setHasTenants(false)
      setIsLoadingTenants(false)
      return
    }

    try {
      setIsLoadingTenants(true)
      const resolved = await resolveCurrentTenant()
      const tenantsWithMembership = (resolved.tenants as TenantWithMembership[]) || []

      setUserTenants(tenantsWithMembership)
      setHasTenants(tenantsWithMembership.length > 0)
      setCurrentTenant((resolved.tenant as TenantWithMembership) ?? null)
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setIsLoadingTenants(false)
    }
  }, [userId])

  useEffect(() => {
    const userChanged = prevUserIdRef.current !== userId
    prevUserIdRef.current = userId

    if (userChanged || !hasInitial) {
      loadTenants()
    }
  }, [hasInitial, loadTenants, userId])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadTenants()
      } else if (event === 'SIGNED_OUT') {
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
          setCurrentTenant(result.tenant as TenantWithMembership)
          await loadTenants()
        }
      })
    },
    [loadTenants]
  )

  const createTenant = useCallback(
    async (name: string, type: string): Promise<Tenant> => {
      if (!userId) throw new Error('No user logged in')

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

      const { error: membershipError } = await supabase.rpc('add_initial_tenant_owner', {
        target_tenant: tenant.id,
      })

      if (membershipError) throw membershipError

      await selectTenant(tenant.id)

      return tenant
    },
    [selectTenant, userId]
  )

  const reloadTenants = useCallback(async () => {
    await loadTenants()
  }, [loadTenants])

  // Derived values for personal license support
  const personalTenant = getPersonalTenantForUser(userTenants)
  const organizationTenants = getOrganizationTenants(userTenants)
  const isCurrentTenantPrivate = isPrivateTenant(currentTenant)
  const contextMode = getTenantContextMode(userTenants)
  const showTenantSelector = shouldShowTenantSelector(userTenants)

  const value: TenantContextType = {
    currentTenant,
    userTenants,
    tenantRole,
    isLoadingTenants,
    hasTenants,
    isSystemAdmin,
    selectTenant,
    createTenant,
    reloadTenants,
    // Personal license helpers
    personalTenant,
    organizationTenants,
    isCurrentTenantPrivate,
    contextMode,
    showTenantSelector,
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
