/**
 * Tenant Queries
 *
 * Database queries for managing tenants and user-tenant relationships.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Tenant = Database['public']['Tables']['tenants']['Row']
type TenantInsert = Database['public']['Tables']['tenants']['Insert']
type TenantUpdate = Database['public']['Tables']['tenants']['Update']
type UserTenantMembership = Database['public']['Tables']['user_tenant_memberships']['Row']

/**
 * Get a single tenant by ID
 */
export async function getTenantById(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows
    throw error
  }

  return data
}

/**
 * Get all tenants for the current user
 */
export async function getUserTenants(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<(UserTenantMembership & { tenant: Tenant })[]> {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get user's primary tenant (first/default tenant)
 */
export async function getUserPrimaryTenant(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select(`
      *,
      tenant:tenants(*)
    `)
    .eq('user_id', userId)
    .eq('is_primary', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No primary tenant
    throw error
  }

  return data?.tenant || null
}

/**
 * Create a new tenant (typically after successful payment)
 */
export async function createTenant(
  supabase: SupabaseClient<Database>,
  tenant: TenantInsert
): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a tenant
 */
export async function updateTenant(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  updates: TenantUpdate
): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Add a user to a tenant with a specific role
 */
export async function addUserToTenant(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string,
  role: string = 'member',
  isPrimary: boolean = false
): Promise<UserTenantMembership> {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      role,
      is_primary: isPrimary,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get user's role in a specific tenant
 */
export async function getUserRoleInTenant(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data?.role || null
}

/**
 * Check if user is admin in tenant
 */
export async function isUserTenantAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const role = await getUserRoleInTenant(supabase, userId, tenantId)
  return role === 'admin' || role === 'owner'
}

/**
 * Update user's role in a tenant
 */
export async function updateUserTenantRole(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string,
  newRole: string
): Promise<UserTenantMembership> {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove user from tenant
 */
export async function removeUserFromTenant(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_tenant_memberships')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  if (error) throw error
}

/**
 * Get all members of a tenant
 */
export async function getTenantMembers(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<(UserTenantMembership & { user: Database['public']['Tables']['users']['Row'] })[]> {
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select(`
      *,
      user:users(*)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
