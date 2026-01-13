/**
 * Demo Conversion Tracking API
 * POST /api/demo/convert - Mark demo session as converted
 *
 * Called when user clicks "Create Account" or "Contact Sales" from demo
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/demo/convert
 *
 * Mark demo session as successfully converted
 *
 * Body: {
 *   type: 'signup' | 'contact_sales'; // Conversion type
 *   plan?: string; // Selected plan (for signup)
 *   metadata?: Record<string, any>; // Optional metadata
 * }
 *
 * Response: { success: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, plan, metadata } = body;

    // Validate conversion type
    if (type !== 'signup' && type !== 'contact_sales') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid conversion type. Must be "signup" or "contact_sales"',
        },
        { status: 400 }
      );
    }

    // Get demo session ID from cookie
    const cookieStore = await cookies();
    const demoSessionId = cookieStore.get('demo_session_id')?.value;

    if (!demoSessionId) {
      return NextResponse.json({
        success: false,
        message: 'No demo session found',
      });
    }

    const supabase = await createServerRlsClient();

    // Mark session as converted using database function
    const { error } = await supabase.rpc('mark_demo_session_converted', {
      session_id: demoSessionId,
      conversion_type_param: type,
      conversion_plan_param: plan || null,
    });

    if (error) {
      console.error('[POST /api/demo/convert] Conversion tracking failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to track conversion',
      });
    }

    // Optionally add metadata
    if (metadata && typeof metadata === 'object') {
      await supabase
        .from('demo_sessions')
        .update({
          metadata: { conversion_metadata: metadata },
        })
        .eq('id', demoSessionId);
    }

    console.log(`[POST /api/demo/convert] Demo session converted: ${demoSessionId} (${type})`);

    // Clear demo session cookie (user is converting to real account)
    cookieStore.delete('demo_session_id');

    return NextResponse.json({
      success: true,
      message: 'Demo session marked as converted',
    });
  } catch (error) {
    console.error('[POST /api/demo/convert] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/demo/convert
 *
 * Check if current demo session has been converted
 *
 * Response: { converted: boolean, type?: string }
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const demoSessionId = cookieStore.get('demo_session_id')?.value;

    if (!demoSessionId) {
      return NextResponse.json({
        converted: false,
      });
    }

    const supabase = await createServerRlsClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: demoSession } = await (supabase as any)
      .from('demo_sessions')
      .select('converted, conversion_type')
      .eq('id', demoSessionId)
      .single() as { data: { converted: boolean; conversion_type: string | null } | null };

    if (!demoSession) {
      return NextResponse.json({
        converted: false,
      });
    }

    return NextResponse.json({
      converted: demoSession.converted,
      type: demoSession.conversion_type || undefined,
    });
  } catch (error) {
    console.error('[GET /api/demo/convert] Error:', error);

    return NextResponse.json(
      {
        converted: false,
        error: 'Failed to check conversion status',
      },
      { status: 500 }
    );
  }
}
