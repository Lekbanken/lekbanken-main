/**
 * Achievement Unlock API — ADMIN/SYSTEM ONLY
 *
 * POST /api/gamification/achievements/unlock
 *
 * Directly unlock an achievement for a target user.
 * Restricted to system_admin to prevent condition-bypass exploits.
 *
 * SECURITY HARDENING (launch-scope, 2026-03-14):
 * - Changed from user-callable to system_admin-only.
 * - Regular users must go through `/api/gamification/achievements/check`,
 *   which evaluates conditions server-side before unlocking.
 * - This prevents users from unlocking arbitrary achievements by ID
 *   without meeting the achievement's conditions.
 * - See GAM-001 in launch-control.md.
 *
 * PRESERVED:
 * - Race-safe idempotency via unique constraint + duplicate handling
 * - tenant_id resolved server-side, never from client
 * - Metadata size limits enforced
 * - Cosmetic grants on unlock
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkAndGrantCosmetics } from '@/lib/journey/cosmetic-grants';
import { z } from 'zod';
import { apiHandler } from '@/lib/api/route-handler';

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
  targetUserId: z.string().uuid('Target user ID must be a valid UUID'),
  context: z
    .object({
      gameId: z.string().uuid().optional(),
      sessionId: z.string().uuid().optional(),
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

export const POST = apiHandler({
  auth: 'system_admin',
  rateLimit: 'api',
  input: unlockRequestSchema,
  handler: async ({ body }) => {
    const serviceClient = createServiceRoleClient();

    const { achievementId, targetUserId, context } = body;

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

    // Resolve target user's tenant from memberships
    const userTenantId = await resolveUserTenant(serviceClient, targetUserId);

    // Check if achievement exists and is active
    const { data: achievement, error: achievementError } = await serviceClient
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

    // Verify target user can access this achievement (global or their tenant)
    if (achievement.tenant_id !== null && achievement.tenant_id !== userTenantId) {
      return NextResponse.json(
        { error: 'Achievement not available for target user' },
        { status: 403 }
      );
    }

    // RACE-SAFE IDEMPOTENCY (P1.1 hardening):
    // Use insert-first pattern. If duplicate violation occurs, fetch existing record.
    // This prevents race conditions between concurrent requests.
    const { data: unlock, error: unlockError } = await serviceClient
      .from('user_achievements')
      .insert({
        user_id: targetUserId,
        achievement_id: achievementId,
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
          .eq('user_id', targetUserId)
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

    // Log context for audit
    if (context) {
      console.log(`[AUDIT] Achievement ${achievementId} unlocked for user ${targetUserId}`, {
        tenantId: userTenantId,
        context,
      });
    }

    // Journey v2.0 — grant cosmetics linked to this achievement
    await checkAndGrantCosmetics(serviceClient, targetUserId, {
      type: 'achievement',
      achievementId,
    });

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
  },
});
