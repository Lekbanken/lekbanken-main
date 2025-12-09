import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'

export async function GET() {
  const supabase = await createServerRlsClient()
  type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
  const loose = supabase as unknown as LooseSupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id,email,full_name,language,avatar_url,preferred_theme,show_theme_toggle_in_header,global_role')
    .eq('id', user.id)
    .maybeSingle()

  if (userError) {
    console.error('[accounts/profile] users select error', userError)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }

  const { data: profileRow } = await loose
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ user: userRow, profile: profileRow ?? null })
}

export async function PATCH(request: Request) {
  const supabase = await createServerRlsClient()
  type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
  const loose = supabase as unknown as LooseSupabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    full_name?: string
    language?: string
    avatar_url?: string | null
    preferred_theme?: string
    show_theme_toggle_in_header?: boolean
    display_name?: string
    phone?: string
    job_title?: string
    organisation?: string
    timezone?: string
    locale?: string
    metadata?: Record<string, unknown>
  }

  const userUpdate: Record<string, unknown> = {}
  if (body.full_name !== undefined) userUpdate.full_name = body.full_name
  if (body.language !== undefined) userUpdate.language = body.language
  if (body.avatar_url !== undefined) userUpdate.avatar_url = body.avatar_url
  if (body.preferred_theme !== undefined) userUpdate.preferred_theme = body.preferred_theme
  if (body.show_theme_toggle_in_header !== undefined)
    userUpdate.show_theme_toggle_in_header = body.show_theme_toggle_in_header

  const profileUpdate: Record<string, unknown> = {}
  if (body.display_name !== undefined) profileUpdate.display_name = body.display_name
  if (body.phone !== undefined) profileUpdate.phone = body.phone
  if (body.job_title !== undefined) profileUpdate.job_title = body.job_title
  if (body.organisation !== undefined) profileUpdate.organisation = body.organisation
  if (body.timezone !== undefined) profileUpdate.timezone = body.timezone
  if (body.locale !== undefined) profileUpdate.locale = body.locale
  if (body.metadata !== undefined) profileUpdate.metadata = body.metadata
  if (body.avatar_url !== undefined) profileUpdate.avatar_url = body.avatar_url

  const authMetadata: Record<string, unknown> = {}
  if (body.full_name !== undefined) authMetadata.full_name = body.full_name
  if (body.avatar_url !== undefined) authMetadata.avatar_url = body.avatar_url
  if (body.language !== undefined) authMetadata.language = body.language
  if (body.preferred_theme !== undefined) authMetadata.preferred_theme = body.preferred_theme
  if (body.show_theme_toggle_in_header !== undefined)
    authMetadata.show_theme_toggle_in_header = body.show_theme_toggle_in_header

  if (Object.keys(userUpdate).length > 0) {
    const { error } = await supabase
      .from('users')
      .update(userUpdate)
      .eq('id', user.id)
      .select()
      .maybeSingle()
    if (error) {
      console.error('[accounts/profile] users update error', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await loose
      .from('user_profiles')
      .upsert({ user_id: user.id, ...profileUpdate }, { onConflict: 'user_id' })
    if (error) {
      console.error('[accounts/profile] profiles upsert error', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
  }

  if (Object.keys(authMetadata).length > 0) {
    const { error: authError } = await supabase.auth.updateUser({ data: authMetadata })
    if (authError) {
      console.error('[accounts/profile] auth metadata update error', authError)
      return NextResponse.json({ error: 'Failed to update auth profile' }, { status: 500 })
    }
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id,email,full_name,language,avatar_url,preferred_theme,show_theme_toggle_in_header,global_role')
    .eq('id', user.id)
    .maybeSingle()

  if (userError || !userRow) {
    console.error('[accounts/profile] users reload error', userError)
    return NextResponse.json({ error: 'Failed to load updated user' }, { status: 500 })
  }

  const { data: profileRow, error: profileError } = await loose
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[accounts/profile] profiles reload error', profileError)
  }

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: 'profile_updated',
    payload: { userUpdate, profileUpdate, authMetadata },
  })

  return NextResponse.json({ user: userRow, profile: profileRow ?? null })
}
