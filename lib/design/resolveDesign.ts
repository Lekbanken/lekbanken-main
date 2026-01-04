import type {
  EffectiveDesign,
  SystemDesignConfig,
  TenantDesignOverrides,
  BrandConfig,
  MediaConfig,
} from '@/types/design'
import { TENANT_OVERRIDE_WHITELIST } from '@/types/design'

/**
 * Merge system design with tenant overrides.
 * Only whitelisted fields from tenant config are applied.
 * Typography and tokens are never overridden by tenant.
 */
export function resolveDesign(
  systemDesign: SystemDesignConfig,
  tenantOverrides: TenantDesignOverrides | null,
  tenantId?: string
): EffectiveDesign {
  // If no tenant overrides, return system design
  if (!tenantOverrides || Object.keys(tenantOverrides).length === 0) {
    return {
      brand: systemDesign.brand,
      media: systemDesign.media,
      typography: systemDesign.typography,
      tokens: systemDesign.tokens,
      source: 'system',
    }
  }

  // Apply whitelisted brand overrides
  const mergedBrand = applyWhitelistedOverrides(
    systemDesign.brand as Record<string, unknown>,
    tenantOverrides.brand as Record<string, unknown> | undefined,
    TENANT_OVERRIDE_WHITELIST.brand as unknown as string[]
  )

  // Apply whitelisted media overrides
  const mergedMedia = applyWhitelistedOverrides(
    systemDesign.media as Record<string, unknown>,
    tenantOverrides.media as Record<string, unknown> | undefined,
    TENANT_OVERRIDE_WHITELIST.media as unknown as string[]
  )

  return {
    brand: mergedBrand as BrandConfig,
    media: mergedMedia as MediaConfig,
    typography: systemDesign.typography, // Never overridden
    tokens: systemDesign.tokens, // Never overridden
    source: 'tenant-merged',
    tenantId,
  }
}

/**
 * Apply only whitelisted fields from overrides to base config
 */
function applyWhitelistedOverrides<T extends Record<string, unknown>>(
  base: T,
  overrides: Partial<T> | undefined,
  whitelist: string[]
): T {
  if (!overrides) return base

  const result = { ...base }

  for (const key of whitelist) {
    const value = overrides[key as keyof T]
    if (value !== undefined && value !== null) {
      result[key as keyof T] = value as T[keyof T]
    }
  }

  return result
}
