import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { deriveEffectiveGlobalRole, isSystemAdminRole } from '@/lib/auth/role'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'
import { apiHandler } from '@/lib/api/route-handler'
import { withCanonicalAvatarUrl } from '@/lib/profile/avatar'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth }) => {
    const user = auth!.user!
    const supabase = await createServerRlsClient()
    const cookieStore = await cookies()

    const { data: userRow } = await supabase
      .from('users')
      .select(
        'id,email,full_name,language,avatar_url,preferred_theme,show_theme_toggle_in_header,global_role,role'
      )
      .eq('id', user.id)
      .maybeSingle()

    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id, role, status, is_primary')
      .eq('user_id', user.id)

    const { data: profileRow } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    const activeTenantId = await readTenantIdFromCookies(cookieStore)

    const effectiveGlobalRole = deriveEffectiveGlobalRole(userRow, user)

    return NextResponse.json({
      user: withCanonicalAvatarUrl(userRow, profileRow?.avatar_url),
      auth_user: user,
      memberships: memberships ?? [],
      active_tenant_id: activeTenantId,
      is_system_admin: isSystemAdminRole(effectiveGlobalRole),
    })
  },
})
