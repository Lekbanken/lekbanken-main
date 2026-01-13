/**
 * Tenant MFA Policy API
 * GET - Retrieve current MFA policy for tenant
 * PUT - Update MFA policy for tenant (owner/admin only)
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { getServerAuthContext } from '@/lib/auth/server-context';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TenantMFAPolicy } from '@/types/mfa';

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/admin/tenant/[tenantId]/mfa/policy
 * Get tenant MFA policy
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
    // Get or create policy
    const { data: policy, error } = await db
      .from('tenant_mfa_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('[MFA Policy] Error fetching policy:', error);
      return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
    }

    // Return default policy if none exists
    if (!policy) {
      const defaultPolicy: Partial<TenantMFAPolicy> = {
        tenant_id: tenantId,
        is_enforced: false,
        enforcement_level: 'admins_required',
        grace_period_days: 7,
        allow_totp: true,
        allow_sms: false,
        allow_webauthn: false,
        require_backup_email: false,
        recovery_codes_required: true,
        allow_trusted_devices: true,
        trusted_device_duration_days: 30,
      };
      return NextResponse.json({ policy: defaultPolicy, isDefault: true });
    }

    return NextResponse.json({ policy, isDefault: false });
  } catch (err) {
    console.error('[MFA Policy] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/tenant/[tenantId]/mfa/policy
 * Update tenant MFA policy
 */
export async function PUT(request: Request, context: RouteContext) {
  const { tenantId } = await context.params;
  
  const authContext = await getServerAuthContext('/admin');
  if (!authContext.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
  const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
  const tenantRole = membership?.role as string | null;
  
  // Only owner and admin can modify policy
  const canModify = isSystemAdmin || tenantRole === 'owner' || tenantRole === 'admin';
  if (!canModify) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createServerRlsClient();
  const db = supabase as unknown as SupabaseClient;

  try {
    const body = await request.json();
    
    // Validate input
    const {
      is_enforced,
      enforcement_level,
      grace_period_days,
      allow_trusted_devices,
      trusted_device_duration_days,
    } = body;

    // Validate enforcement_level
    if (enforcement_level && !['optional', 'admins_required', 'all_users'].includes(enforcement_level)) {
      return NextResponse.json({ error: 'Invalid enforcement_level' }, { status: 400 });
    }

    // Validate grace_period_days
    if (grace_period_days !== undefined && (grace_period_days < 0 || grace_period_days > 90)) {
      return NextResponse.json({ error: 'grace_period_days must be between 0 and 90' }, { status: 400 });
    }

    // Validate trusted_device_duration_days
    if (trusted_device_duration_days !== undefined && (trusted_device_duration_days < 1 || trusted_device_duration_days > 365)) {
      return NextResponse.json({ error: 'trusted_device_duration_days must be between 1 and 365' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_enforced === 'boolean') {
      updateData.is_enforced = is_enforced;
      // Set enforced_at and enforced_by if enabling enforcement
      if (is_enforced) {
        updateData.enforced_at = new Date().toISOString();
        updateData.enforced_by = authContext.user.id;
      } else {
        updateData.enforced_at = null;
        updateData.enforced_by = null;
      }
    }

    if (enforcement_level) {
      updateData.enforcement_level = enforcement_level;
    }

    if (grace_period_days !== undefined) {
      updateData.grace_period_days = grace_period_days;
    }

    if (typeof allow_trusted_devices === 'boolean') {
      updateData.allow_trusted_devices = allow_trusted_devices;
    }

    if (trusted_device_duration_days !== undefined) {
      updateData.trusted_device_duration_days = trusted_device_duration_days;
    }

    // Upsert policy
    const { data: policy, error } = await db
      .from('tenant_mfa_policies')
      .upsert({
        tenant_id: tenantId,
        ...updateData,
      }, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) {
      console.error('[MFA Policy] Error updating policy:', error);
      return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
    }

    return NextResponse.json({ policy });
  } catch (err) {
    console.error('[MFA Policy] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
