import { type NextRequest, NextResponse } from 'next/server';
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { GrantPersonalLicensePayload, GrantPersonalLicenseResponse } from '@/features/admin/licenses';

/**
 * POST /api/admin/licenses/grant-personal
 * 
 * Grant a personal license to a user.
 * Creates: private tenant + membership + entitlement + seat assignment
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireSystemAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json() as GrantPersonalLicensePayload;
    const { userEmail, productId, quantitySeats = 1, validUntil = null, notes = '' } = body;

    // Validate required fields
    if (!userEmail || !productId) {
      return NextResponse.json(
        { error: 'userEmail and productId are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createServerRlsClient();

    // 1. Find user by email in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail.toLowerCase())
      .maybeSingle();

    const userId = existingUser?.id;

    if (!userId) {
      // User doesn't exist - we can't create auth users via Supabase client
      // Return error asking admin to invite user first
      return NextResponse.json(
        { error: `User with email "${userEmail}" not found. Please invite them first.` },
        { status: 404 }
      );
    }

    // 2. Check if user already has a private tenant
    const { data: existingMembership } = await supabase
      .from('user_tenant_memberships')
      .select(`
        tenant_id,
        tenant:tenants!inner(id, type)
      `)
      .eq('user_id', userId)
      .eq('tenant.type', 'private')
      .maybeSingle();

    let tenantId: string;

    if (existingMembership?.tenant_id) {
      tenantId = existingMembership.tenant_id;
    } else {
      // 3. Create private tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: `Privat (${userEmail})`,
          slug: `private-${userId.slice(0, 8)}`,
          type: 'private',
          settings: {},
          metadata: { created_via: 'admin_grant', notes },
        })
        .select('id')
        .single();

      if (tenantError || !newTenant) {
        console.error('[grant-personal] Failed to create tenant:', tenantError);
        return NextResponse.json(
          { error: 'Failed to create private tenant' },
          { status: 500 }
        );
      }

      tenantId = newTenant.id;

      // 4. Create membership (owner role)
      const { error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          role: 'owner',
          is_primary: false, // Don't override their existing primary
        });

      if (membershipError) {
        console.error('[grant-personal] Failed to create membership:', membershipError);
        // Try to clean up tenant
        await supabase.from('tenants').delete().eq('id', tenantId);
        return NextResponse.json(
          { error: 'Failed to create membership' },
          { status: 500 }
        );
      }
    }

    // 5. Check if entitlement already exists for this product
    const { data: existingEntitlement } = await supabase
      .from('tenant_product_entitlements')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('product_id', productId)
      .maybeSingle();

    let entitlementId: string;

    if (existingEntitlement) {
      // Reactivate if inactive
      if (existingEntitlement.status !== 'active') {
        await supabase
          .from('tenant_product_entitlements')
          .update({ 
            status: 'active', 
            quantity_seats: quantitySeats,
            valid_until: validUntil,
            metadata: { reactivated_via: 'admin_grant', notes },
          })
          .eq('id', existingEntitlement.id);
      }
      entitlementId = existingEntitlement.id;
    } else {
      // 6. Create entitlement
      const { data: newEntitlement, error: entitlementError } = await supabase
        .from('tenant_product_entitlements')
        .insert({
          tenant_id: tenantId,
          product_id: productId,
          status: 'active',
          quantity_seats: quantitySeats,
          valid_from: new Date().toISOString(),
          valid_until: validUntil,
          source: 'admin_grant',
          metadata: { created_via: 'admin_grant', notes },
        })
        .select('id')
        .single();

      if (entitlementError || !newEntitlement) {
        console.error('[grant-personal] Failed to create entitlement:', entitlementError);
        return NextResponse.json(
          { error: 'Failed to create entitlement' },
          { status: 500 }
        );
      }

      entitlementId = newEntitlement.id;
    }

    // 7. Check if seat assignment exists
    const { data: existingSeat } = await supabase
      .from('tenant_entitlement_seat_assignments')
      .select('id, status')
      .eq('entitlement_id', entitlementId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSeat) {
      // Reactivate if inactive
      if (existingSeat.status !== 'active') {
        await supabase
          .from('tenant_entitlement_seat_assignments')
          .update({ status: 'active' })
          .eq('id', existingSeat.id);
      }
    } else {
      // 8. Create seat assignment
      const { error: seatError } = await supabase
        .from('tenant_entitlement_seat_assignments')
        .insert({
          entitlement_id: entitlementId,
          user_id: userId,
          tenant_id: tenantId,
          status: 'active',
        });

      if (seatError) {
        console.error('[grant-personal] Failed to create seat:', seatError);
        // Don't fail the whole operation - entitlement is created
      }
    }

    const response: GrantPersonalLicenseResponse = {
      success: true,
      tenantId,
      entitlementId,
      message: `Personal license granted to ${userEmail}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST /api/admin/licenses/grant-personal] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
