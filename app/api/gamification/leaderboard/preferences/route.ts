import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getLeaderboardPreferences,
  setLeaderboardVisibility,
} from '@/lib/services/gamification-leaderboard.server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { assertTenantMembership } from '@/lib/planner/require-plan-access'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  tenantId: z.string().uuid(),
  visible: z.boolean(),
})

/**
 * GET /api/gamification/leaderboard/preferences
 *
 * Get current user's leaderboard preferences for a tenant.
 * Query params: tenantId (UUID, required)
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req, auth }) => {
    const tenantId = req.nextUrl.searchParams.get('tenantId')

    if (!tenantId || !UUID_RE.test(tenantId)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'tenantId must be a valid UUID' } },
        { status: 400 },
      )
    }

    const supabase = await createServerRlsClient()
    const tenantCheck = await assertTenantMembership(supabase, auth!.user!, tenantId)
    if (!tenantCheck.allowed) return tenantCheck.response

    const prefs = await getLeaderboardPreferences(tenantId)

    return NextResponse.json({
      visible: prefs.leaderboardVisible,
      optedOutAt: prefs.optedOutAt,
      notificationsEnabled: prefs.notificationsEnabled,
    })
  },
})

/**
 * POST /api/gamification/leaderboard/preferences
 *
 * Update current user's leaderboard visibility.
 * Body: { tenantId: UUID, visible: boolean }
 */
export const POST = apiHandler({
  auth: 'user',
  input: postSchema,
  handler: async ({ auth, body }) => {
    const { tenantId, visible } = body!

    // Validate tenant membership — never trust client tenant input
    const supabase = await createServerRlsClient()
    const tenantCheck = await assertTenantMembership(supabase, auth!.user!, tenantId)
    if (!tenantCheck.allowed) return tenantCheck.response

    const result = await setLeaderboardVisibility(tenantId, visible)

    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: result.error ?? 'Failed to update preferences' } },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      visible,
    })
  },
})
