/**
 * Token Revocation API
 * 
 * POST /api/participants/tokens/revoke
 * Revokes a participant token immediately (sets expiry to now)
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireSessionHost } from '@/lib/api/auth-guard';
import { apiHandler } from '@/lib/api/route-handler';

interface RevokeTokenRequest {
  participant_token?: string;
  participant_id?: string;
  session_id?: string;
  reason?: string;
}

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const body: RevokeTokenRequest = await req.json();
    const { participant_token, participant_id, session_id, reason = 'Token revoked by host' } = body;

    if (!participant_token && !participant_id) {
      return NextResponse.json(
        { error: 'Either participant_token or participant_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Build query based on provided identifier — first look up to get session_id for auth
    let query = supabase
      .from('participants')
      .select('*, participant_sessions!inner(tenant_id, host_user_id)');

    if (participant_token) {
      query = query.eq('participant_token', participant_token);
    } else if (participant_id) {
      query = query.eq('id', participant_id);
      if (session_id) {
        query = query.eq('session_id', session_id);
      }
    }

    const { data: participant, error: participantError } = await query.single();

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Auth: session host or system_admin (wrapper already verified user, this checks host ownership)
    await requireSessionHost(participant.session_id);

    // Extract tenant_id from joined session data
    const tenantId = (participant.participant_sessions as { tenant_id: string }).tenant_id;

    // Set token expiry to now (effectively revoking it)
    const revokedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('participants')
      .update({
        token_expires_at: revokedAt,
        status: 'disconnected',
        disconnected_at: revokedAt,
      })
      .eq('id', participant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error revoking token:', updateError);
      return NextResponse.json(
        { error: 'Failed to revoke token' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('participant_activity_log').insert({
      tenant_id: tenantId,
      session_id: participant.session_id,
      participant_id: participant.id,
      event_type: 'token_revoked',
      event_data: {
        reason,
        revoked_at: revokedAt,
        old_expiry: participant.token_expires_at,
      },
    });

    return NextResponse.json({
      success: true,
      participant: updated,
      revoked_at: revokedAt,
      message: 'Token revoked successfully',
    });
  },
});
