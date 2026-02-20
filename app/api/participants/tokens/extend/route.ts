/**
 * Token Extension API
 * 
 * POST /api/participants/tokens/extend
 * Extends token expiry for a participant
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireSessionHost, AuthError } from '@/lib/api/auth-guard';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';

interface ExtendTokenRequest {
  participant_token: string;
  extension_hours?: number; // Default: 24 hours
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendTokenRequest = await request.json();
    const { participant_token, extension_hours = 24 } = body;

    if (!participant_token) {
      return NextResponse.json(
        { error: 'participant_token is required' },
        { status: 400 }
      );
    }

    // Validate extension hours (max 168 hours = 7 days)
    if (extension_hours < 1 || extension_hours > 168) {
      return NextResponse.json(
        { error: 'extension_hours must be between 1 and 168' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get participant by token with session data
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*, participant_sessions!inner(tenant_id)')
      .eq('participant_token', participant_token)
      .single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Invalid participant token' },
        { status: 401 }
      );
    }

    // Check if participant is blocked or kicked
    if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
      return NextResponse.json(
        { error: 'Cannot extend token for blocked or kicked participant' },
        { status: 403 }
      );
    }

    // Auth: session host or system_admin
    await requireSessionHost(participant.session_id);

    // Extract tenant_id from joined session data
    const tenantId = (participant.participant_sessions as { tenant_id: string }).tenant_id;

    // Calculate new expiry time
    const newExpiryTime = new Date();
    newExpiryTime.setHours(newExpiryTime.getHours() + extension_hours);

    // Update token expiry
    const { data: updated, error: updateError } = await supabase
      .from('participants')
      .update({
        token_expires_at: newExpiryTime.toISOString(),
      })
      .eq('id', participant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error extending token:', updateError);
      return NextResponse.json(
        { error: 'Failed to extend token' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('participant_activity_log').insert({
      tenant_id: tenantId,
      session_id: participant.session_id,
      participant_id: participant.id,
      event_type: 'token_extended',
      event_data: {
        extension_hours,
        new_expiry: newExpiryTime.toISOString(),
        old_expiry: participant.token_expires_at,
      },
    });

    return NextResponse.json({
      success: true,
      participant: updated,
      new_expiry: newExpiryTime.toISOString(),
      message: `Token extended by ${extension_hours} hours`,
    });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in token extension:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
