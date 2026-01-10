/**
 * Achievement Unlock API for Authenticated Users
 * 
 * POST /api/gamification/achievements/unlock
 * 
 * Programmatically unlock achievements for the current user.
 * Used by game completion logic to award achievements.
 * 
 * SECURITY NOTES:
 * - Uses RLS client for reads, service role for inserts (matches RLS policies)
 * - Tenant resolved from user_tenant_memberships, not user_progress
 * - tenant_id on insert is set server-side, never from client
 * - Race-safe idempotency via unique constraint + duplicate handling
 * 
 * HARDENED in Phase 4.1:
 * - Metadata size limits enforced
 * - Insert-first pattern with duplicate violation handling
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Constants for metadata limits
const MAX_METADATA_KEYS = 25;
const MAX_METADATA_STRING_LENGTH = 200;
const MAX_METADATA_SERIALIZED_SIZE = 8192; // 8KB

/**
 * Validate metadata size and structure
 */
function validateMetadata(metadata: Record<string, unknown> | undefined): 
  { valid: true } | { valid: false; error: string } {
  if (!metadata) return { valid: true };
  
  const keys = Object.keys(metadata);
  if (keys.length > MAX_METADATA_KEYS) {
    return { valid: false, error: `Metadata exceeds ${MAX_METADATA_KEYS} keys limit` };
  }
  
  // Check string values length
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && value.length > MAX_METADATA_STRING_LENGTH) {
      return { valid: false, error: `Metadata key "${key}" exceeds ${MAX_METADATA_STRING_LENGTH} character limit` };
    }
  }
  
  // Check total serialized size
  const serialized = JSON.stringify(metadata);
  if (serialized.length > MAX_METADATA_SERIALIZED_SIZE) {
    return { valid: false, error: `Metadata exceeds ${MAX_METADATA_SERIALIZED_SIZE / 1024}KB size limit` };
  }
  
  return { valid: true };
}

const unlockRequestSchema = z.object({
  achievementId: z.string().uuid('Achievement ID must be a valid UUID'),
  // Context is for audit only - ignored for security-sensitive fields
  context: z
    .object({
      gameId: z.string().uuid().optional(),
      sessionId: z.string().uuid().optional(),
      // Metadata validated separately for size limits
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
});

/**
 * Resolve user's active tenant from memberships
 * Priority: primary > single membership > null
 */
async function resolveUserTenant(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<string | null> {
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, is_primary, status')
    .eq('user_id', userId)
    .in('status', ['active', null]);

  if (!memberships || memberships.length === 0) {
    return null;
  }

  // Prefer primary membership
  const primary = memberships.find((m) => m.is_primary);
  if (primary) {
    return primary.tenant_id;
  }

  // Single membership
  if (memberships.length === 1) {
    return memberships[0].tenant_id;
  }

  // Multiple memberships, no primary - use first (or could return null)
  return memberships[0].tenant_id;
}

export async function POST(request: NextRequest) {
  try {
    // RLS client for auth check and reads
    const rlsClient = await createServerRlsClient();
    // Service role client for inserts (RLS blocks user inserts)
    const serviceClient = createServiceRoleClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await rlsClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = unlockRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { achievementId, context } = parsed.data;

    // Validate metadata size limits (P1.2 hardening)
    if (context?.metadata) {
      const metadataValidation = validateMetadata(context.metadata);
      if (!metadataValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid metadata', details: metadataValidation.error },
          { status: 400 }
        );
      }
    }

    // Resolve user's tenant from memberships (not user_progress)
    const userTenantId = await resolveUserTenant(serviceClient, user.id);

    // Check if achievement exists and is active
    const { data: achievement, error: achievementError } = await rlsClient
      .from('achievements')
      .select('id, name, description, icon_url, condition_type, condition_value, status, tenant_id')
      .eq('id', achievementId)
      .single();

    if (achievementError || !achievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    if (achievement.status !== 'active') {
      return NextResponse.json(
        { error: 'Achievement is not active' },
        { status: 400 }
      );
    }

    // Verify user can access this achievement (global or their tenant)
    if (achievement.tenant_id !== null && achievement.tenant_id !== userTenantId) {
      return NextResponse.json(
        { error: 'Achievement not available for your account' },
        { status: 403 }
      );
    }

    // RACE-SAFE IDEMPOTENCY (P1.1 hardening):
    // Use insert-first pattern. If duplicate violation occurs, fetch existing record.
    // This prevents race conditions between concurrent requests.
    const { data: unlock, error: unlockError } = await serviceClient
      .from('user_achievements')
      .insert({
        user_id: user.id,
        achievement_id: achievementId,
        // Server-side tenant binding - never from client
        tenant_id: userTenantId,
      })
      .select('id, unlocked_at')
      .single();

    // Handle duplicate violation (unique constraint on user_id, achievement_id, tenant_id)
    if (unlockError) {
      // Check if it's a duplicate key error (code 23505 in PostgreSQL)
      const isDuplicate = unlockError.code === '23505' || 
        unlockError.message?.includes('duplicate') ||
        unlockError.message?.includes('unique');

      if (isDuplicate) {
        // Fetch the existing unlock record
        const { data: existingUnlock } = await serviceClient
          .from('user_achievements')
          .select('id, unlocked_at')
          .eq('user_id', user.id)
          .eq('achievement_id', achievementId)
          .single();

        return NextResponse.json({
          success: true,
          alreadyUnlocked: true,
          achievement: {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            iconUrl: achievement.icon_url,
          },
          unlockedAt: existingUnlock?.unlocked_at ?? new Date().toISOString(),
        });
      }

      // Other insert errors
      console.error('Error unlocking achievement:', unlockError);
      return NextResponse.json(
        { error: 'Failed to unlock achievement' },
        { status: 500 }
      );
    }

    // Log context for audit (do not trust for security decisions)
    if (context) {
      console.log(`[AUDIT] Achievement ${achievementId} unlocked for user ${user.id}`, {
        tenantId: userTenantId,
        context,
      });
    }

    return NextResponse.json({
      success: true,
      alreadyUnlocked: false,
      achievement: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        iconUrl: achievement.icon_url,
        points: achievement.condition_value,
      },
      unlockedAt: unlock.unlocked_at,
    });
  } catch (err) {
    console.error('Error in achievement unlock API:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
