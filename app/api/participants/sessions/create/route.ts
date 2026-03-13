/**
 * POST /api/participants/sessions/create
 * 
 * Create a new participant session with a unique 6-character code.
 * Requires authentication (host must be logged in).
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { ApiError } from '@/lib/api/errors';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { logger } from '@/lib/utils/logger';
import { errorTracker } from '@/lib/utils/error-tracker';
import { z } from 'zod';

const createSessionSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100, 'Display name must be 100 characters or less').trim(),
  description: z.string().max(500).trim().optional(),
  planId: z.string().optional(),
  gameId: z.string().optional(),
  settings: z.object({
    allowRejoin: z.boolean().optional(),
    maxParticipants: z.number().int().min(1).max(1000).optional(),
    requireApproval: z.boolean().optional(),
    tokenExpiryHours: z.number().min(0.5).max(720).nullable().optional(),
    enableChat: z.boolean().optional(),
    enableProgressTracking: z.boolean().optional(),
  }).optional(),
  expiresInHours: z.number().min(0.5).max(720).optional(),
});

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'api',
  handler: async ({ auth, req }) => {
    const userId = auth!.user!.id

    try {
      const supabase = await createServerRlsClient();

      // Get user's tenant
      const { data: membership } = await supabase
        .from('user_tenant_memberships')
        .select('tenant_id, role')
        .eq('user_id', userId)
        .single();

      if (!membership || !membership.tenant_id) {
        return NextResponse.json(
          { error: 'No tenant membership found' },
          { status: 403 }
        );
      }

      // Parse and validate request body
      const rawBody = await req.json();
      const parsed = createSessionSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw ApiError.badRequest('Invalid payload', 'VALIDATION_ERROR', parsed.error.flatten());
      }
      const body = parsed.data;
    
    // Calculate expiry if provided
    let expiresAt: Date | undefined;
    if (body.expiresInHours) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + body.expiresInHours);
    }
    
    // Create session
    const session = await ParticipantSessionService.createSession({
      tenantId: membership.tenant_id,
      hostUserId: userId,
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
      userId: userId,
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
      // Track error to Supabase
      await errorTracker.api(
        '/api/participants/sessions/create',
        'POST',
        error
      );

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
  },
})
