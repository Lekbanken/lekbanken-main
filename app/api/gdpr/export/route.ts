/**
 * GDPR Data Export API
 *
 * Implements GDPR Article 15 (Right of Access) and Article 20 (Data Portability)
 *
 * DISABLED: Self-service export is temporarily disabled while the
 * implementation is being expanded to cover all user data categories.
 * Users should contact privacy@lekbanken.se for data access requests (DSAR).
 *
 * POST /api/gdpr/export — Returns 503 with DSAR instructions
 */

import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async () => {
    return NextResponse.json(
      {
        status: 'service_unavailable',
        message:
          'Self-service data export is temporarily unavailable. Please contact our data protection officer to exercise your right of access.',
        contact: 'privacy@lekbanken.se',
        sla: 'We will process your request within 30 days as required by GDPR Article 12(3).',
      },
      { status: 503 }
    )
  },
})

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to request a data export',
    },
    { status: 405 }
  )
}
