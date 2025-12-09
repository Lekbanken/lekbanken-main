import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { randomBytes, createHash } from 'crypto'

function generateCodes(count = 10) {
  return Array.from({ length: count }).map(() => randomBytes(5).toString('hex'))
}

function hashCodes(codes: string[]) {
  return codes.map((code) => createHash('sha256').update(code).digest('hex'))
}

export async function POST() {
  const supabase = await createServerRlsClient()
  type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const codes = generateCodes()
  const hashed = hashCodes(codes)

  const loose = supabase as unknown as LooseSupabase
  const { error } = await loose
    .from('user_mfa')
    .upsert(
      {
        user_id: user.id,
        recovery_codes_hashed: hashed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[mfa/recovery-codes] upsert error', error)
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
  }

  return NextResponse.json({ recovery_codes: codes })
}
