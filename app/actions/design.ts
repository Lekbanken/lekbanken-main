'use server'

import { revalidatePath } from 'next/cache'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'
import type {
  SystemDesignConfig,
  BrandConfig,
  MediaConfig,
  TypographyConfig,
  TokensConfig,
  SystemAssetType,
  TenantAssetType,
  TenantDesignOverrides,
} from '@/types/design'
import {
  SYSTEM_ASSETS_BUCKET,
  TENANT_ASSETS_BUCKET,
  getSystemAssetPath,
  getTenantAssetPath,
  ALLOWED_IMAGE_TYPES,
  MAX_ASSET_SIZE_BYTES,
} from '@/types/design'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ---------------------------------------------------------------------------
// System Admin Check
// ---------------------------------------------------------------------------

async function requireSystemAdmin(): Promise<{ supabase: Awaited<ReturnType<typeof createServerRlsClient>>; userId: string } | null> {
  const supabase = await createServerRlsClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Check if system admin
  const { data: userData } = await supabase
    .from('users')
    .select('global_role')
    .eq('id', user.id)
    .single()
  
  if (userData?.global_role !== 'system_admin') {
    return null
  }
  
  return { supabase, userId: user.id }
}

// ---------------------------------------------------------------------------
// Get System Design Config
// ---------------------------------------------------------------------------

export async function getSystemDesignConfig(): Promise<ActionResult<SystemDesignConfig>> {
  const auth = await requireSystemAdmin()
  if (!auth) {
    return { success: false, error: 'Åtkomst nekad. Endast systemadministratörer.' }
  }
  
  const { supabase } = auth
  
  const { data, error } = await supabase
    .from('system_design_config')
    .select('*')
    .limit(1)
    .single()
  
  if (error) {
    console.error('[getSystemDesignConfig] Error:', error)
    return { success: false, error: 'Kunde inte hämta designkonfiguration.' }
  }
  
  return {
    success: true,
    data: {
      id: data.id,
      brand: data.brand as BrandConfig || {},
      media: data.media as MediaConfig || {},
      typography: data.typography as TypographyConfig || {},
      tokens: data.tokens as TokensConfig || {},
      updatedAt: data.updated_at,
    },
  }
}

// ---------------------------------------------------------------------------
// Update System Design Config
// ---------------------------------------------------------------------------

export async function updateSystemDesignConfig(
  updates: Partial<Pick<SystemDesignConfig, 'brand' | 'media' | 'typography' | 'tokens'>>
): Promise<ActionResult> {
  const auth = await requireSystemAdmin()
  if (!auth) {
    return { success: false, error: 'Åtkomst nekad. Endast systemadministratörer.' }
  }
  
  const { supabase } = auth
  
  // Get current config
  const { data: current, error: fetchError } = await supabase
    .from('system_design_config')
    .select('id, brand, media, typography, tokens')
    .limit(1)
    .single()
  
  if (fetchError) {
    console.error('[updateSystemDesignConfig] Fetch error:', fetchError)
    return { success: false, error: 'Kunde inte hämta nuvarande konfiguration.' }
  }
  
  // Merge updates
  const currentBrand = (current.brand as Record<string, unknown>) || {}
  const currentMedia = (current.media as Record<string, unknown>) || {}
  const currentTypography = (current.typography as Record<string, unknown>) || {}
  const currentTokens = (current.tokens as Record<string, unknown>) || {}
  
  const merged = {
    brand: (updates.brand ? { ...currentBrand, ...updates.brand } : currentBrand) as Json,
    media: (updates.media ? { ...currentMedia, ...updates.media } : currentMedia) as Json,
    typography: (updates.typography ? { ...currentTypography, ...updates.typography } : currentTypography) as Json,
    tokens: (updates.tokens ? { ...currentTokens, ...updates.tokens } : currentTokens) as Json,
  }
  
  const { error: updateError } = await supabase
    .from('system_design_config')
    .update(merged)
    .eq('id', current.id)
  
  if (updateError) {
    console.error('[updateSystemDesignConfig] Update error:', updateError)
    return { success: false, error: 'Kunde inte uppdatera konfiguration.' }
  }
  
  revalidatePath('/admin/design')
  revalidatePath('/admin')
  revalidatePath('/app')
  
  return { success: true }
}

// ---------------------------------------------------------------------------
// Upload System Asset
// ---------------------------------------------------------------------------

export async function uploadSystemAsset(
  type: SystemAssetType,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const auth = await requireSystemAdmin()
  if (!auth) {
    return { success: false, error: 'Åtkomst nekad. Endast systemadministratörer.' }
  }
  
  const { supabase } = auth
  
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false, error: 'Ingen fil vald.' }
  }
  
  // Validate file
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: 'Ogiltig filtyp. Tillåtna: PNG, JPEG, SVG, WebP, ICO.' }
  }
  
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    return { success: false, error: 'Filen är för stor. Max 5 MB.' }
  }
  
  // Get file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = getSystemAssetPath(type, ext)
  
  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(SYSTEM_ASSETS_BUCKET)
    .upload(path, file, { upsert: true })
  
  if (uploadError) {
    console.error('[uploadSystemAsset] Upload error:', uploadError)
    return { success: false, error: `Uppladdning misslyckades: ${uploadError.message}` }
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(SYSTEM_ASSETS_BUCKET)
    .getPublicUrl(path)
  
  const url = urlData.publicUrl
  
  // Update config with new URL
  const brandFieldMap: Record<string, keyof BrandConfig> = {
    'logo-light': 'logoLightUrl',
    'logo-dark': 'logoDarkUrl',
    'icon': 'iconUrl',
    'favicon-light': 'faviconLightUrl',
    'favicon-dark': 'faviconDarkUrl',
  }
  
  if (brandFieldMap[type]) {
    await updateSystemDesignConfig({
      brand: { [brandFieldMap[type]]: url },
    })
  } else if (type === 'default-profile') {
    // Add to default profile images array
    const { data: current } = await supabase
      .from('system_design_config')
      .select('media')
      .limit(1)
      .single()
    
    const media = (current?.media as MediaConfig) || {}
    const images = media.defaultProfileImages || []
    
    await updateSystemDesignConfig({
      media: { defaultProfileImages: [...images, url] },
    })
  } else if (type === 'default-cover') {
    // Add to default cover images array
    const { data: current } = await supabase
      .from('system_design_config')
      .select('media')
      .limit(1)
      .single()
    
    const media = (current?.media as MediaConfig) || {}
    const images = media.defaultCoverImages || []
    
    await updateSystemDesignConfig({
      media: { defaultCoverImages: [...images, url] },
    })
  }
  
  revalidatePath('/admin/design')
  
  return { success: true, data: { url } }
}

// ---------------------------------------------------------------------------
// Delete System Asset
// ---------------------------------------------------------------------------

export async function deleteSystemAsset(
  type: SystemAssetType,
  url?: string
): Promise<ActionResult> {
  const auth = await requireSystemAdmin()
  if (!auth) {
    return { success: false, error: 'Åtkomst nekad. Endast systemadministratörer.' }
  }
  
  const { supabase } = auth
  
  const brandFieldMap: Record<string, keyof BrandConfig> = {
    'logo-light': 'logoLightUrl',
    'logo-dark': 'logoDarkUrl',
    'icon': 'iconUrl',
    'favicon-light': 'faviconLightUrl',
    'favicon-dark': 'faviconDarkUrl',
  }
  
  if (brandFieldMap[type]) {
    // Clear the URL in config
    await updateSystemDesignConfig({
      brand: { [brandFieldMap[type]]: undefined },
    })
  } else if ((type === 'default-profile' || type === 'default-cover') && url) {
    // Remove from array
    const { data: current } = await supabase
      .from('system_design_config')
      .select('media')
      .limit(1)
      .single()
    
    const media = (current?.media as MediaConfig) || {}
    
    if (type === 'default-profile') {
      const images = (media.defaultProfileImages || []).filter((u: string) => u !== url)
      await updateSystemDesignConfig({
        media: { defaultProfileImages: images },
      })
    } else {
      const images = (media.defaultCoverImages || []).filter((u: string) => u !== url)
      await updateSystemDesignConfig({
        media: { defaultCoverImages: images },
      })
    }
  }
  
  // Optionally delete from storage (skip for now - might want to keep files)
  
  revalidatePath('/admin/design')
  
  return { success: true }
}

// ---------------------------------------------------------------------------
// Tenant Branding Toggle
// ---------------------------------------------------------------------------

export async function setTenantBrandingEnabled(
  tenantId: string,
  enabled: boolean
): Promise<ActionResult> {
  const auth = await requireSystemAdmin()
  if (!auth) {
    return { success: false, error: 'Åtkomst nekad. Endast systemadministratörer.' }
  }
  
  const { supabase } = auth
  
  const { error } = await supabase
    .from('tenants')
    .update({ tenant_branding_enabled: enabled })
    .eq('id', tenantId)
  
  if (error) {
    console.error('[setTenantBrandingEnabled] Error:', error)
    return { success: false, error: 'Kunde inte uppdatera inställning.' }
  }
  
  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/tenant/${tenantId}`)
  
  return { success: true }
}

// ---------------------------------------------------------------------------
// Tenant Design Config (for tenant admins when enabled)
// ---------------------------------------------------------------------------

export async function updateTenantDesignConfig(
  tenantId: string,
  overrides: TenantDesignOverrides
): Promise<ActionResult> {
  const supabase = await createServerRlsClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Inte inloggad.' }
  }
  
  // Check if branding is enabled for this tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('tenant_branding_enabled')
    .eq('id', tenantId)
    .single()
  
  if (!tenant?.tenant_branding_enabled) {
    return { success: false, error: 'Organisationsbranding är inte aktiverad.' }
  }
  
  // Upsert tenant design config
  const { error } = await supabase
    .from('tenant_design_config')
    .upsert({
      tenant_id: tenantId,
      overrides: overrides as unknown as Json,
    }, {
      onConflict: 'tenant_id',
    })
  
  if (error) {
    console.error('[updateTenantDesignConfig] Error:', error)
    return { success: false, error: 'Kunde inte uppdatera designkonfiguration.' }
  }
  
  revalidatePath(`/admin/tenant/${tenantId}`)
  revalidatePath('/app')
  
  return { success: true }
}

// ---------------------------------------------------------------------------
// Upload Tenant Asset
// ---------------------------------------------------------------------------

export async function uploadTenantAsset(
  tenantId: string,
  type: TenantAssetType,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createServerRlsClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Inte inloggad.' }
  }
  
  // Check if branding is enabled
  const { data: tenant } = await supabase
    .from('tenants')
    .select('tenant_branding_enabled')
    .eq('id', tenantId)
    .single()
  
  if (!tenant?.tenant_branding_enabled) {
    return { success: false, error: 'Organisationsbranding är inte aktiverad.' }
  }
  
  const file = formData.get('file') as File | null
  if (!file) {
    return { success: false, error: 'Ingen fil vald.' }
  }
  
  // Validate
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: 'Ogiltig filtyp.' }
  }
  
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    return { success: false, error: 'Filen är för stor. Max 5 MB.' }
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = getTenantAssetPath(tenantId, type, ext)
  
  const { error: uploadError } = await supabase.storage
    .from(TENANT_ASSETS_BUCKET)
    .upload(path, file, { upsert: true })
  
  if (uploadError) {
    console.error('[uploadTenantAsset] Upload error:', uploadError)
    return { success: false, error: `Uppladdning misslyckades: ${uploadError.message}` }
  }
  
  const { data: urlData } = supabase.storage
    .from(TENANT_ASSETS_BUCKET)
    .getPublicUrl(path)
  
  const url = urlData.publicUrl
  
  // Update tenant config
  const brandFieldMap: Record<TenantAssetType, string> = {
    'logo-light': 'logoLightUrl',
    'logo-dark': 'logoDarkUrl',
    'icon': 'iconUrl',
    'favicon-light': 'faviconLightUrl',
    'favicon-dark': 'faviconDarkUrl',
  }
  
  // Get current overrides
  const { data: currentConfig } = await supabase
    .from('tenant_design_config')
    .select('overrides')
    .eq('tenant_id', tenantId)
    .single()
  
  const currentOverrides = (currentConfig?.overrides as TenantDesignOverrides) || {}
  const newOverrides: TenantDesignOverrides = {
    ...currentOverrides,
    brand: {
      ...currentOverrides.brand,
      [brandFieldMap[type]]: url,
    },
  }
  
  await updateTenantDesignConfig(tenantId, newOverrides)
  
  return { success: true, data: { url } }
}
