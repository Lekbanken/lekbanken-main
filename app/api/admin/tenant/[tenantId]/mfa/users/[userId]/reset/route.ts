/**
 * Admin MFA Reset API
 * POST - Reset MFA for a specific user (admin action)
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { logMFADisabledByAdmin } from '@/lib/services/mfa/mfaAudit.server';

/**
 * POST /api/admin/tenant/[tenantId]/mfa/users/[userId]/reset
 * Reset MFA for a user - clears enrollment but keeps grace period if applicable
 */
export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, params, req }) => {
  const tenantId = params.tenantId;
  const userId = params.userId;

  const adminUserId = auth!.user!.id;
  const isSystemAdmin = auth!.effectiveGlobalRole === 'system_admin';
  const membership = auth!.memberships?.find(m => m.tenant_id === tenantId);
  const tenantRole = membership?.role as string | null;
  
  // Only owner/admin can reset MFA for users
  const hasAccess = isSystemAdmin || tenantRole === 'owner' || tenantRole === 'admin';
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden - Only owners and admins can reset MFA' }, { status: 403 });
  }

  // Prevent self-reset through admin endpoint
  if (userId === adminUserId) {
    return NextResponse.json({ error: 'Cannot reset your own MFA through admin endpoint' }, { status: 400 });
  }

  const supabase = await createServerRlsClient();

  try {
    // Verify target user is a member of this tenant
    const { data: targetMembership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .select('user_id, role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[admin/mfa/reset] membership check error', membershipError);
      return NextResponse.json({ error: 'Failed to verify user membership' }, { status: 500 });
    }

    if (!targetMembership) {
      return NextResponse.json({ error: 'User is not a member of this tenant' }, { status: 404 });
    }

    // Get optional reason from request body (for future logging enhancement)
    let _reason = 'Admin-initiated reset';
    try {
      const body = await req.json();
      if (body.reason && typeof body.reason === 'string') {
        _reason = body.reason;
      }
    } catch {
      // No body or invalid JSON - use default reason
    }

    // Use service role client to unenroll MFA factors via Supabase Auth Admin API
    const serviceClient = createServiceRoleClient();
    
    // Get user's MFA factors
    const { data: factorsData, error: factorsError } = await serviceClient.auth.admin.mfa.listFactors({
      userId,
    });

    if (factorsError) {
      console.error('[admin/mfa/reset] list factors error', factorsError);
      return NextResponse.json({ error: 'Failed to list MFA factors' }, { status: 500 });
    }

    const factors = factorsData?.factors || [];
    let unenrolledCount = 0;

    // Unenroll all verified TOTP factors
    for (const factor of factors) {
      if (factor.factor_type === 'totp' && factor.status === 'verified') {
        const { error: unenrollError } = await serviceClient.auth.admin.mfa.deleteFactor({
          userId,
          id: factor.id,
        });

        if (unenrollError) {
          console.error('[admin/mfa/reset] unenroll error', factor.id, unenrollError);
        } else {
          unenrolledCount++;
        }
      }
    }

    // Clear user_mfa record — MFA-004: use correct column names from schema
    const { error: clearError } = await supabase
      .from('user_mfa')
      .update({
        enrolled_at: null,
        last_verified_at: null,
        methods: null,
        recovery_codes_hashed: null,
        recovery_codes_count: 0,
        recovery_codes_used: 0,
        recovery_codes_generated_at: null,
        // Reset clears grace period — if policy requires re-enrollment with grace,
        // the MFA enforcement flow will set a new grace_period_end
        grace_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (clearError) {
      console.error('[admin/mfa/reset] clear user_mfa error', clearError);
      return NextResponse.json({ error: 'Failed to reset MFA enrollment state' }, { status: 500 });
    }

    // Revoke all trusted devices for this user in this tenant
    const { error: devicesError } = await supabase
      .from('mfa_trusted_devices')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (devicesError) {
      console.error('[admin/mfa/reset] revoke devices error', devicesError);
    }

    // Log the admin action
    await logMFADisabledByAdmin(userId, adminUserId, tenantId);

    return NextResponse.json({
      success: true,
      message: 'MFA has been reset for the user',
      factors_removed: unenrolledCount,
      user_id: userId,
    });

  } catch (err) {
    console.error('[admin/mfa/reset] unexpected error', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
  },
});
