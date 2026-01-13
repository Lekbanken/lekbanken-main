/**
 * Tenant MFA Stats API
 * GET - Retrieve MFA statistics for tenant
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { getServerAuthContext } from '@/lib/auth/server-context';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/admin/tenant/[tenantId]/mfa/stats
 * Get MFA statistics for tenant
 */
export async function GET(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  
  const authContext = await getServerAuthContext('/admin');
  if (!authContext.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
  const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
  const tenantRole = membership?.role as string | null;
  
  // Check access
  const hasAccess = isSystemAdmin || tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createServerRlsClient();
  const db = supabase as unknown as SupabaseClient;

  try {
    // Get total users in tenant
    const { count: totalUsers, error: countError } = await db
      .from('user_tenant_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (countError) {
      console.error('[MFA Stats] Error counting users:', countError);
    }

    // Get users with MFA enabled
    const { data: mfaUsers, error: mfaError } = await db
      .from('user_tenant_memberships')
      .select('user_id')
      .eq('tenant_id', tenantId);

    if (mfaError) {
      console.error('[MFA Stats] Error getting MFA users:', mfaError);
    }

    let mfaEnabledUsers = 0;
    let usersInGracePeriod = 0;
    
    if (mfaUsers && mfaUsers.length > 0) {
      const userIds = mfaUsers.map(u => u.user_id);
      
      // Get MFA enrollment status for these users
      const { data: mfaSettings, error: settingsError } = await db
        .from('user_mfa')
        .select('user_id, enrolled_at, grace_period_end')
        .in('user_id', userIds);

      if (settingsError) {
        console.error('[MFA Stats] Error getting MFA settings:', settingsError);
      } else if (mfaSettings) {
        const now = new Date();
        mfaSettings.forEach(setting => {
          if (setting.enrolled_at) {
            mfaEnabledUsers++;
          }
          if (setting.grace_period_end && new Date(setting.grace_period_end) > now) {
            usersInGracePeriod++;
          }
        });
      }
    }

    // Get users who require MFA based on role
    const { data: adminMembers, error: adminError } = await db
      .from('user_tenant_memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .in('role', ['owner', 'admin']);

    if (adminError) {
      console.error('[MFA Stats] Error counting admin users:', adminError);
    }

    const mfaRequiredUsers = adminMembers?.length ?? 0;

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      mfaEnabledUsers,
      mfaRequiredUsers,
      usersInGracePeriod,
    });
  } catch (err) {
    console.error('[MFA Stats] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
