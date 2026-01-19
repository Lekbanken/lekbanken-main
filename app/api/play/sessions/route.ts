import { NextResponse, type NextRequest } from 'next/server';
import { createServerRlsClient, getRequestTenantId } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { applyRateLimitMiddleware } from '@/lib/utils/rate-limiter';
import type { CreateSessionOptions } from '@/lib/services/participants/session-service';

export async function GET() {
  const supabase = await createServerRlsClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('participant_sessions')
    .select('*')
    .eq('host_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions', details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sessions: (data || []).map((s) => ({
      id: s.id,
      sessionCode: s.session_code,
      displayName: s.display_name,
      status: s.status,
      participantCount: s.participant_count,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      expiresAt: s.expires_at,
      gameId: s.game_id,
      planId: s.plan_id,
    })),
  });
}

export async function POST(request: NextRequest) {
  const rate = applyRateLimitMiddleware(request, 'api');
  if (rate) return rate;

  const supabase = await createServerRlsClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get tenant ID from header (set by proxy) or fall back to membership lookup
  let tenantId = await getRequestTenantId();
  
  if (!tenantId) {
    // Fall back to user's membership (use limit 1 to handle multiple memberships)
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    
    tenantId = membership?.tenant_id ?? null;
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    displayName,
    description,
    gameId,
    planId,
    settings,
    expiresInHours,
  } = body as {
    displayName?: string;
    description?: string;
    gameId?: string;
    planId?: string;
    settings?: Record<string, unknown>;
    expiresInHours?: number;
  };

  if (!displayName || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
  }

  let expiresAt: Date | undefined;
  if (expiresInHours && Number.isFinite(expiresInHours)) {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  }

  const session = await ParticipantSessionService.createSession({
    tenantId,
    hostUserId: user.id,
    displayName: displayName.trim(),
    description: description?.trim(),
    gameId,
    planId,
    settings: settings as CreateSessionOptions['settings'],
    expiresAt,
  });

  return NextResponse.json({
    session: {
      id: session.id,
      sessionCode: session.session_code,
      displayName: session.display_name,
      status: session.status,
      participantCount: session.participant_count,
      expiresAt: session.expires_at,
    },
  });
}
