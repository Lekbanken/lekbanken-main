import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { apiHandler } from '@/lib/api/route-handler'
import { assertTenantMembership } from '@/lib/planner/require-plan-access'

const confirmSchema = z.object({
  bucket: z.enum(['game-media', 'custom_utmarkelser', 'tenant-media', 'media-images', 'media-audio']),
  path: z.string().min(1).max(1024),
})

const privateBuckets = new Set(['media-images', 'media-audio'])

export const POST = apiHandler({
  auth: 'user',
  input: confirmSchema,
  handler: async ({ auth, body }) => {
    const supabase = await createServerRlsClient()
    const { bucket, path } = body

    // Validate path ownership — path must start with a tenant UUID the user belongs to, or "public/"
    const pathTenantId = path.split('/')[0]
    if (pathTenantId && pathTenantId !== 'public') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(pathTenantId)) {
        const tenantCheck = await assertTenantMembership(supabase, auth!.user!, pathTenantId)
        if (!tenantCheck.allowed) return tenantCheck.response
      }
    }

    // For private buckets, return a signed URL for preview/consumption.
    // NOTE: This does not enforce bucket privacy; that is configured in Supabase.
    if (privateBuckets.has(bucket)) {
      const expiresIn = 300
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (signedError || !signedData?.signedUrl) {
        const debug = process.env.NODE_ENV !== 'production'
          ? {
              message: signedError?.message,
              name: (signedError as unknown as { name?: string } | undefined)?.name,
              status: (signedError as unknown as { status?: number } | undefined)?.status,
            }
          : undefined

        return NextResponse.json(
          { error: 'Failed to get signed URL', debug },
          { status: 500 }
        )
      }

      return NextResponse.json({
        url: signedData.signedUrl,
        bucket,
        path,
        expiresIn,
        isSigned: true,
      })
    }

    // Get public URL for the uploaded file
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)

    if (!publicData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get public URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: publicData.publicUrl,
      bucket,
      path,
      isSigned: false,
    })
  },
})
