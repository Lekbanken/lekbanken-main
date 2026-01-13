/**
 * Demo Feature Tracking API
 * POST /api/demo/track - Track feature usage in demo session
 *
 * Used by client-side to track which features are used during demo
 * Data used for analytics and optimization
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * POST /api/demo/track
 *
 * Track feature usage in demo session
 *
 * Body: {
 *   feature: string; // Feature name (e.g., 'browse_activities', 'create_session')
 *   metadata?: Record<string, any>; // Optional metadata
 * }
 *
 * Response: { success: boolean }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { feature, metadata } = body;

    if (!feature || typeof feature !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Feature name is required',
        },
        { status: 400 }
      );
    }

    // Get demo session ID from cookie
    const demoSessionId = cookies().get('demo_session_id')?.value;

    if (!demoSessionId) {
      // Not in demo mode - nothing to track
      return NextResponse.json({
        success: false,
        message: 'Not in demo mode',
      });
    }

    const supabase = createClient();

    // Use the database function to add feature usage
    const { error } = await supabase.rpc('add_demo_feature_usage', {
      session_id: demoSessionId,
      feature_name: feature,
    });

    if (error) {
      console.error('[POST /api/demo/track] Tracking failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to track feature',
      });
    }

    // Optionally update metadata if provided
    if (metadata && typeof metadata === 'object') {
      await supabase
        .from('demo_sessions')
        .update({
          metadata: supabase.rpc('jsonb_set', {
            target: 'metadata',
            path: `{${feature}}`,
            value: JSON.stringify(metadata),
          }),
        })
        .eq('id', demoSessionId);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[POST /api/demo/track] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal error',
      },
      { status: 500 }
    );
  }
}
