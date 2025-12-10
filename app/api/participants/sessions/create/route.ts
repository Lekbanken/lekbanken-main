/**
 * POST /api/participants/sessions/create
 * 
 * Create a new participant session with a unique 6-character code.
 * Requires authentication (host must be logged in).
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { logger } from '@/lib/utils/logger';

interface CreateSessionRequest {
  displayName: string;
  description?: string;
  planId?: string;
  gameId?: string;
  settings?: {
    allowRejoin?: boolean;
    maxParticipants?: number;
    requireApproval?: boolean;
    tokenExpiryHours?: number | null; // null = no expiry
    enableChat?: boolean;
    enableProgressTracking?: boolean;
  };
  expiresInHours?: number; // Auto-close session after X hours
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerRlsClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }
    
    // Get user's tenant
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!membership || !membership.tenant_id) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body: CreateSessionRequest = await request.json();
    
    // Validate required fields
    if (!body.displayName || body.displayName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }
    
    if (body.displayName.length > 100) {
      return NextResponse.json(
        { error: 'Display name must be 100 characters or less' },
        { status: 400 }
      );
    }
    
    // Calculate expiry if provided
    let expiresAt: Date | undefined;
    if (body.expiresInHours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + body.expiresInHours);
    }
    
    // Create session
    const session = await ParticipantSessionService.createSession({
      tenantId: membership.tenant_id,
      hostUserId: user.id,
      displayName: body.displayName.trim(),
      description: body.description?.trim(),
      planId: body.planId,
      gameId: body.gameId,
      settings: body.settings,
      expiresAt,
    });
    
    logger.info('Participant session created', {
      sessionId: session.id,
      sessionCode: session.session_code,
      userId: user.id,
      tenantId: membership.tenant_id,
    });
    
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionCode: session.session_code,
        displayName: session.display_name,
        description: session.description,
        status: session.status,
        participantCount: session.participant_count,
        settings: session.settings,
        expiresAt: session.expires_at,
        createdAt: session.created_at,
      },
    });
    
  } catch (error) {
    logger.error('Failed to create participant session', error as Error, {
      endpoint: '/api/participants/sessions/create',
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for quota error
    if (errorMessage.includes('quota exceeded')) {
      return NextResponse.json(
        { 
          error: 'No-expiry token quota exceeded',
          details: 'Your tenant has reached the limit of no-expiry sessions. Use 24h expiry or contact support.',
        },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create session', details: errorMessage },
      { status: 500 }
    );
  }
}
