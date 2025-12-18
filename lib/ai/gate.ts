import 'server-only'

import { NextResponse } from 'next/server'
import { isFeatureEnabled } from '@/lib/config/env'

type FeatureKey = Parameters<typeof isFeatureEnabled>[0]

/**
 * Convention for user-facing AI endpoints:
 * - Always gate behind FEATURE_AI (master) and optionally a specific sub-flag.
 * - Return 404 when disabled to avoid advertising unfinished functionality.
 */
export function gateAi(feature?: FeatureKey): NextResponse | null {
  if (!isFeatureEnabled('ai')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (feature && feature !== 'ai' && !isFeatureEnabled(feature)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return null
}

/**
 * Same as gateAi, but returns 403 for authenticated writes (more explicit).
 * Use when the client is already inside a protected surface (admin UI) and
 * you want a clearer error.
 */
export function forbidAiIfDisabled(feature?: FeatureKey): NextResponse | null {
  if (!isFeatureEnabled('ai')) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 })
  }

  if (feature && feature !== 'ai' && !isFeatureEnabled(feature)) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 })
  }

  return null
}
