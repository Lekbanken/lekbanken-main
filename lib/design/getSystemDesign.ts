import { createServerRlsClient } from '@/lib/supabase/server'
import type { SystemDesignConfig, BrandConfig, MediaConfig, TypographyConfig, TokensConfig } from '@/types/design'
import { DEFAULT_SYSTEM_DESIGN } from './defaults'

/**
 * Get the system-wide design configuration.
 * Returns default values if not configured.
 */
export async function getSystemDesign(): Promise<SystemDesignConfig> {
  const supabase = await createServerRlsClient()
  
  const { data, error } = await supabase
    .from('system_design_config')
    .select('id, brand, media, typography, tokens, updated_at')
    .limit(1)
    .single()
  
  if (error || !data) {
    // Return defaults if not configured
    return DEFAULT_SYSTEM_DESIGN
  }
  
  // Merge with defaults to ensure all fields are present
  return {
    id: data.id,
    brand: { ...DEFAULT_SYSTEM_DESIGN.brand, ...(data.brand as BrandConfig || {}) },
    media: { ...DEFAULT_SYSTEM_DESIGN.media, ...(data.media as MediaConfig || {}) },
    typography: { ...DEFAULT_SYSTEM_DESIGN.typography, ...(data.typography as TypographyConfig || {}) },
    tokens: { ...DEFAULT_SYSTEM_DESIGN.tokens, ...(data.tokens as TokensConfig || {}) },
    updatedAt: data.updated_at,
  }
}
