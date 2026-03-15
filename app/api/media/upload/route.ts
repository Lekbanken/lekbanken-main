import { NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { assertTenantMembership } from '@/lib/planner/require-plan-access'
import { getQuotaLimit, parseTenantFeatureConfig } from '@/lib/features/tenant-features'
import type { SubscriptionTier } from '@/lib/features/tenant-features'

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
  // Video
  'video/mp4', 'video/webm',
  // Documents
  'application/pdf',
])

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).refine(
    (v) => ALLOWED_MIME_TYPES.has(v),
    { message: 'File type not allowed' }
  ),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
  tenantId: z.string().uuid().optional().nullable(),
  bucket: z
    .enum(['game-media', 'custom_utmarkelser', 'tenant-media', 'media-images', 'media-audio'])
    .default('tenant-media'),
})

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'api',
  handler: async ({ auth, req }) => {
    const userId = auth!.user!.id
    const supabase = await createServerRlsClient()

    const body = await req.json().catch(() => ({}))
    const parsed = uploadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { fileName, fileType, fileSize, tenantId, bucket } = parsed.data

  // Verify tenant membership when tenant-scoped upload
  if (tenantId) {
    const tenantCheck = await assertTenantMembership(supabase, auth!.user!, tenantId)
    if (!tenantCheck.allowed) return tenantCheck.response

    // Enforce storage quota
    const serviceClient = await createServiceRoleClient()
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('subscription_tier, metadata')
      .eq('id', tenantId)
      .single()

    if (tenant) {
      const tier = (tenant.subscription_tier ?? 'free') as SubscriptionTier
      const config = parseTenantFeatureConfig(tenant.metadata as Record<string, unknown> | null)
      const quotaMb = getQuotaLimit('max_storage_mb', tier, config)

      if (quotaMb !== -1) {
        // Get current storage usage from all buckets for this tenant
        const { data: files } = await serviceClient.storage
          .from(bucket)
          .list(tenantId, { limit: 10000 })

        const currentUsageBytes = (files ?? []).reduce(
          (sum, f) => sum + ((f as { metadata?: { size?: number } }).metadata?.size ?? 0),
          0
        )
        const quotaBytes = quotaMb * 1024 * 1024

        if (currentUsageBytes + fileSize > quotaBytes) {
          return NextResponse.json(
            { error: 'Storage quota exceeded', quotaMb, usedMb: Math.round(currentUsageBytes / 1024 / 1024) },
            { status: 403 }
          )
        }
      }
    }
  }

  // Generate unique file path
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = tenantId
    ? `${tenantId}/${timestamp}-${sanitizedFileName}`
    : `public/${timestamp}-${sanitizedFileName}`

  // Create signed upload URL (valid for 5 minutes)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(filePath)

  if (signedError || !signedData) {
    logger.error('Failed to generate signed upload URL', signedError ?? undefined, {
      endpoint: '/api/media/upload',
      bucket,
      filePath,
      userId
    })

    const debug = process.env.NODE_ENV !== 'production'
      ? {
          message: signedError?.message,
          name: (signedError as unknown as { name?: string } | undefined)?.name,
          status: (signedError as unknown as { status?: number } | undefined)?.status,
        }
      : undefined

    return NextResponse.json(
      { error: 'Failed to generate upload URL', debug },
      { status: 500 }
    )
  }

  // Return upload URL and metadata
  return NextResponse.json({
    uploadUrl: signedData.signedUrl,
    token: signedData.token,
    path: signedData.path,
    bucket,
    expiresIn: 300, // 5 minutes
    fileType,
    instructions: {
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
        'x-upsert': 'true',
      },
    },
  })
  },
})
