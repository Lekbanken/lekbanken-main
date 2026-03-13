/**
 * GDPR Data Deletion API
 *
 * Implements GDPR Article 17 (Right to Erasure / Right to be Forgotten)
 *
 * DISABLED: Self-service deletion is temporarily disabled while the
 * implementation is being expanded to cover all user data tables.
 * Users should contact privacy@lekbanken.se for deletion requests (DSAR).
 *
 * POST /api/gdpr/delete — Returns 503 with DSAR instructions
 * DELETE /api/gdpr/delete — Returns 503 with DSAR instructions
 */

import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'

const DSAR_RESPONSE = {
  status: 'service_unavailable',
  message:
    'Self-service account deletion is temporarily unavailable. Please contact our data protection officer to exercise your right to erasure.',
  contact: 'privacy@lekbanken.se',
  sla: 'We will process your request within 30 days as required by GDPR Article 12(3).',
} as const

// POST: Disabled — redirect to manual DSAR
export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async () => {
    return NextResponse.json(DSAR_RESPONSE, { status: 503 })
  },
})

// DELETE: Disabled — redirect to manual DSAR
export const DELETE = apiHandler({
  auth: 'user',
  handler: async () => {
    return NextResponse.json(DSAR_RESPONSE, { status: 503 })
  },
})

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to initiate deletion, DELETE to confirm',
    },
    { status: 405 }
  )
}
