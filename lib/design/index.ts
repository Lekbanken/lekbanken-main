import type { EffectiveDesign } from '@/types/design'
import { getSystemDesign } from './getSystemDesign'
import { getTenantDesign } from './getTenantDesign'
import { resolveDesign } from './resolveDesign'
import { DEFAULT_EFFECTIVE_DESIGN } from './defaults'

/**
 * Get the effective design configuration for a given context.
 * 
 * - If tenantId is provided and branding is enabled, merges tenant overrides.
 * - Otherwise returns system design.
 * - Falls back to hardcoded defaults if nothing is configured.
 */
export async function getEffectiveDesign(tenantId?: string | null): Promise<EffectiveDesign> {
  try {
    const systemDesign = await getSystemDesign()
    
    // If no tenant specified, return system design
    if (!tenantId) {
      return {
        brand: systemDesign.brand,
        media: systemDesign.media,
        typography: systemDesign.typography,
        tokens: systemDesign.tokens,
        source: 'system',
      }
    }
    
    // Get tenant overrides
    const { config: tenantConfig, brandingEnabled } = await getTenantDesign(tenantId)
    
    // If branding not enabled or no config, return system design
    if (!brandingEnabled || !tenantConfig) {
      return {
        brand: systemDesign.brand,
        media: systemDesign.media,
        typography: systemDesign.typography,
        tokens: systemDesign.tokens,
        source: 'system',
      }
    }
    
    // Merge system + tenant
    return resolveDesign(systemDesign, tenantConfig.overrides, tenantId)
  } catch (error) {
    console.error('[getEffectiveDesign] Error fetching design config:', error)
    return DEFAULT_EFFECTIVE_DESIGN
  }
}

/**
 * Re-export for convenience
 */
export { getSystemDesign } from './getSystemDesign'
export { getTenantDesign, isTenantBrandingEnabled } from './getTenantDesign'
export { resolveDesign } from './resolveDesign'
export { DEFAULT_EFFECTIVE_DESIGN, DEFAULT_SYSTEM_DESIGN } from './defaults'
