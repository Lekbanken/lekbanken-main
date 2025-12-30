import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'

const confirmSchema = z.object({
  bucket: z.enum(['game-media', 'custom_utmarkelser', 'tenant-media', 'media-images', 'media-audio']),
  path: z.string().min(1).max(1024),
})

const privateBuckets = new Set(['media-images', 'media-audio'])

export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { bucket, path } = parsed.data

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
}
