/**
 * Tenant MFA Users API
 * GET - Retrieve users with MFA status for tenant
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { getServerAuthContext } from '@/lib/auth/server-context';
import type { SupabaseClient } from '@supabase/supabase-js';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

interface MFAUserRow {
  user_id: string;
  role: string;
  profiles: {
    email: string;
    display_name: string | null;
  }[] | {
    email: string;
    display_name: string | null;
  } | null;
}

// Helper to extract first profile from joined data
function getProfile(profiles: MFAUserRow['profiles']): { email: string; display_name: string | null } | null {
  if (!profiles) return null;
  if (Array.isArray(profiles)) return profiles[0] || null;
  return profiles;
}

/**
 * GET /api/admin/tenant/[tenantId]/mfa/users
 * Get paginated list of users with MFA status
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
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const search = searchParams.get('search') ?? '';
    const statusFilter = searchParams.get('status') ?? 'all';

    const offset = (page - 1) * pageSize;

    // Get tenant MFA policy to determine requirements
    const { data: policy } = await db
      .from('tenant_mfa_policies')
      .select('is_enforced, enforcement_level, grace_period_days')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    // Build base query
    let query = db
      .from('user_tenant_memberships')
      .select(`
        user_id,
        role,
        profiles!inner(email, display_name)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply search filter
    if (search) {
      // Search by email or display_name
      query = query.or(`profiles.email.ilike.%${search}%,profiles.display_name.ilike.%${search}%`);
    }

    // Get all matching members first (for MFA status joining)
    const { data: members, count, error } = await query
      .order('role', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('[MFA Users] Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({
        users: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    // Cast to avoid TS issues with Supabase joins
    const typedMembers = members as unknown as MFAUserRow[];
    const userIds = typedMembers.map((m) => m.user_id);

    // Get MFA status for these users
    const { data: mfaSettings } = await db
      .from('user_mfa')
      .select('user_id, enrolled_at, grace_period_end')
      .in('user_id', userIds);

    // Get trusted devices count
    const { data: trustedDevices } = await db
      .from('mfa_trusted_devices')
      .select('user_id')
      .in('user_id', userIds)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    // Count trusted devices per user
    const deviceCounts: Record<string, number> = {};
    trustedDevices?.forEach(d => {
      deviceCounts[d.user_id] = (deviceCounts[d.user_id] || 0) + 1;
    });

    // Build user MFA map
    const mfaMap: Record<string, {
      enrolled_at: string | null;
      grace_period_end: string | null;
    }> = {};
    mfaSettings?.forEach(s => {
      mfaMap[s.user_id] = {
        enrolled_at: s.enrolled_at,
        grace_period_end: s.grace_period_end,
      };
    });

    // Determine MFA status for each user
    const now = new Date();
    const users = typedMembers.map((member) => {
      const mfa = mfaMap[member.user_id];
      const isEnrolled = !!mfa?.enrolled_at;
      const isInGracePeriod = mfa?.grace_period_end 
        ? new Date(mfa.grace_period_end) > now 
        : false;

      // Determine if MFA is required for this user
      let isRequired = false;
      if (policy?.is_enforced) {
        if (policy.enforcement_level === 'all_users') {
          isRequired = true;
        } else if (policy.enforcement_level === 'admins_required') {
          isRequired = member.role === 'owner' || member.role === 'admin';
        }
      }

      // Calculate status
      let mfa_status: 'enabled' | 'required' | 'grace_period' | 'disabled';
      if (isEnrolled) {
        mfa_status = 'enabled';
      } else if (isRequired && isInGracePeriod) {
        mfa_status = 'grace_period';
      } else if (isRequired) {
        mfa_status = 'required';
      } else {
        mfa_status = 'disabled';
      }

      const profile = getProfile(member.profiles);
      return {
        user_id: member.user_id,
        email: profile?.email ?? '',
        display_name: profile?.display_name ?? null,
        role: member.role,
        mfa_status,
        enrolled_at: mfa?.enrolled_at ?? null,
        grace_period_end: mfa?.grace_period_end ?? null,
        trusted_devices_count: deviceCounts[member.user_id] ?? 0,
      };
    });

    // Filter by status if needed
    let filteredUsers = users;
    if (statusFilter && statusFilter !== 'all') {
      filteredUsers = users.filter(u => u.mfa_status === statusFilter);
    }

    const totalCount = statusFilter !== 'all' 
      ? filteredUsers.length 
      : (count ?? 0);

    return NextResponse.json({
      users: filteredUsers,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (err) {
    console.error('[MFA Users] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
