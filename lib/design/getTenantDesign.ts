import { createServerRlsClient } from '@/lib/supabase/server'
import type { TenantDesignConfig, TenantDesignOverrides } from '@/types/design'

export interface TenantDesignResult {
  config: TenantDesignConfig | null
  brandingEnabled: boolean
}

/**
 * Get tenant-specific design overrides.
 * Returns null if tenant doesn't have a config or branding is not enabled.
 */
export async function getTenantDesign(tenantId: string): Promise<TenantDesignResult> {
  const supabase = await createServerRlsClient()
  
  // First check if branding is enabled for this tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('tenant_branding_enabled')
    .eq('id', tenantId)
    .single()
  
  if (tenantError || !tenant) {
    return { config: null, brandingEnabled: false }
  }
  
  const brandingEnabled = tenant.tenant_branding_enabled ?? false
  
  if (!brandingEnabled) {
    return { config: null, brandingEnabled: false }
  }
  
  // Get tenant design config
  const { data, error } = await supabase
    .from('tenant_design_config')
    .select('tenant_id, overrides, updated_at')
    .eq('tenant_id', tenantId)
    .single()
  
  if (error || !data) {
    return { config: null, brandingEnabled: true }
  }
  
  return {
    config: {
      tenantId: data.tenant_id,
      overrides: (data.overrides as TenantDesignOverrides) || {},
      updatedAt: data.updated_at,
    },
    brandingEnabled: true,
  }
}

/**
 * Check if a tenant has branding enabled
 */
export async function isTenantBrandingEnabled(tenantId: string): Promise<boolean> {
  const supabase = await createServerRlsClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('tenant_branding_enabled')
    .eq('id', tenantId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  return data.tenant_branding_enabled ?? false
}
