/**
 * Demo Status API
 * GET /api/demo/status - Get current demo session status
 *
 * Used by client-side components to check demo mode and display banners
 */

import { NextResponse } from 'next/server';
import { getDemoSession } from '@/lib/utils/demo-detection';
import { createServerRlsClient } from '@/lib/supabase/server';

/**
 * GET /api/demo/status
 *
 * Returns current demo session status
 *
 * Response: {
 *   isDemoMode: boolean;
 *   tier?: 'free' | 'premium';
 *   expiresAt?: string;
 *   timeRemaining?: number;
 *   tenantName?: string;
 *   userName?: string;
 * }
 */
export async function GET() {
  try {
    const supabase = await createServerRlsClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        isDemoMode: false,
      });
    }

    // Get demo session
    const demoSession = await getDemoSession();

    if (!demoSession) {
      return NextResponse.json({
        isDemoMode: false,
      });
    }

    // Get tenant name
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', demoSession.tenantId)
      .single();

    // Get user profile - use 'users' view which includes profile data
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      isDemoMode: true,
      tier: demoSession.tier,
      expiresAt: demoSession.expiresAt,
      timeRemaining: demoSession.timeRemaining,
      tenantName: tenant?.name || 'Lekbanken Demo',
      userName: profile?.full_name || profile?.email || 'Demo User',
      sessionId: demoSession.id,
    });
  } catch (error) {
    console.error('[GET /api/demo/status] Error:', error);

    return NextResponse.json(
      {
        isDemoMode: false,
        error: 'Failed to get demo status',
      },
      { status: 500 }
    );
  }
}
