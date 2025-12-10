import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
  tenantId: z.string().uuid().optional().nullable(),
  bucket: z.enum(['game-media', 'custom_utmarkelser', 'tenant-media']).default('tenant-media'),
})

export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = uploadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { fileName, fileType, tenantId, bucket } = parsed.data

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
      userId: user.id
    })
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
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
}
