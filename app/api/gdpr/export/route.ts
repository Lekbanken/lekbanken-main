/**
 * GDPR Data Export API
 *
 * Implements GDPR Article 15 (Right of Access) and Article 20 (Data Portability)
 *
 * POST /api/gdpr/export
 * - Creates a data export request and returns the export data
 * - Requires authenticated user
 * - Logs the access for accountability
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { exportUserData, createGDPRRequest } from '@/lib/gdpr/user-rights'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerRlsClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to export your data' },
        { status: 401 }
      )
    }

    // Parse request body (optional format preference)
    let format: 'json' | 'csv' = 'json'
    try {
      const body = await request.json()
      if (body.format === 'csv') {
        format = 'csv'
      }
    } catch {
      // Default to JSON if no body
    }

    // Create GDPR request record for audit trail
    await createGDPRRequest(user.id, 'access', {
      format,
      requestedAt: new Date().toISOString(),
      source: 'self_service',
    })

    // Export user data
    const exportData = await exportUserData(user.id)

    // Return as JSON (can be extended for CSV)
    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="lekbanken-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }

    // For CSV, we'd need to flatten the data structure
    // This is a placeholder for future CSV support
    return NextResponse.json(exportData)
  } catch (error) {
    console.error('[GDPR Export] Error:', error)

    return NextResponse.json(
      {
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'An error occurred during data export',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to request a data export',
    },
    { status: 405 }
  )
}
