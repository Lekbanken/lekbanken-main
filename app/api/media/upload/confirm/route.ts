import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { bucket, path } = body

  if (!bucket || !path) {
    return NextResponse.json(
      { error: 'Missing bucket or path' },
      { status: 400 }
    )
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
  })
}
