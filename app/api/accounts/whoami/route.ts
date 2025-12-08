import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'
import { isSystemAdmin } from '@/lib/utils/authRoles'
import type { Database } from '@/types/supabase'

export async function GET() {
  const supabase = await createServerRlsClient()
  const cookieStore = await cookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabase
    .from('users')
    .select('id,email,full_name,language,avatar_url,preferred_theme,show_theme_toggle_in_header,global_role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: memberships } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role, status, is_primary')
    .eq('user_id', user.id)

  const activeTenantId = await readTenantIdFromCookies(cookieStore)

  const globalRole =
    (userRow as { global_role?: Database['public']['Enums']['global_role_enum'] | null } | null)?.global_role ??
    null

  return NextResponse.json({
    user: userRow,
    auth_user: user,
    memberships: memberships ?? [],
    active_tenant_id: activeTenantId,
    is_system_admin: isSystemAdmin(user, globalRole),
  })
}
