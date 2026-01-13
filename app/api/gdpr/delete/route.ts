/**
 * GDPR Data Deletion API
 *
 * Implements GDPR Article 17 (Right to Erasure / Right to be Forgotten)
 *
 * POST /api/gdpr/delete
 * - Initiates account deletion process
 * - Requires authenticated user
 * - Requires confirmation
 * - Logs the action for accountability
 *
 * DELETE /api/gdpr/delete
 * - Confirms and executes the deletion
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { deleteUserData, createGDPRRequest } from '@/lib/gdpr/user-rights'

// POST: Initiate deletion request
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
        { error: 'Unauthorized', message: 'You must be logged in to delete your account' },
        { status: 401 }
      )
    }

    // Parse request body
    let reason = 'user_request'
    let confirmed = false

    try {
      const body = await request.json()
      reason = body.reason || 'user_request'
      confirmed = body.confirmed === true
    } catch {
      // Default values if no body
    }

    // If not confirmed, create a pending request
    if (!confirmed) {
      const gdprRequest = await createGDPRRequest(user.id, 'erasure', {
        reason,
        requestedAt: new Date().toISOString(),
        source: 'self_service',
        status: 'awaiting_confirmation',
      })

      return NextResponse.json({
        status: 'pending_confirmation',
        requestId: gdprRequest.id,
        message:
          'Please confirm your account deletion request by sending a DELETE request with the confirmation token',
        warning:
          'This action is irreversible. Your personal data will be deleted or anonymized.',
        retainedData: [
          {
            category: 'Legal acceptances',
            reason: 'Required for legal compliance and audit trail',
            retentionPeriod: '7 years',
          },
          {
            category: 'Payment records',
            reason: 'Swedish accounting law (Bokföringslagen)',
            retentionPeriod: '7 years',
          },
          {
            category: 'GDPR requests',
            reason: 'Documentation of GDPR compliance',
            retentionPeriod: '7 years',
          },
        ],
      })
    }

    // If confirmed, proceed with deletion
    const result = await deleteUserData(
      user.id,
      reason as 'user_request' | 'consent_withdrawal' | 'retention_expired'
    )

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({
      status: 'completed',
      message: 'Your account has been deleted',
      result,
    })
  } catch (error) {
    console.error('[GDPR Delete] Error:', error)

    return NextResponse.json(
      {
        error: 'Deletion failed',
        message:
          error instanceof Error ? error.message : 'An error occurred during account deletion',
      },
      { status: 500 }
    )
  }
}

// DELETE: Confirm and execute deletion
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerRlsClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to delete your account' },
        { status: 401 }
      )
    }

    // Parse confirmation
    let confirmation = ''
    try {
      const body = await request.json()
      confirmation = body.confirmation || ''
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Please provide confirmation: { "confirmation": "DELETE MY ACCOUNT" }',
        },
        { status: 400 }
      )
    }

    // Verify confirmation text
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: 'Please send { "confirmation": "DELETE MY ACCOUNT" } to confirm deletion',
        },
        { status: 400 }
      )
    }

    // Execute deletion
    const result = await deleteUserData(user.id, 'user_request')

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({
      status: 'completed',
      message: 'Your account and personal data have been deleted',
      result,
    })
  } catch (error) {
    console.error('[GDPR Delete] Error:', error)

    return NextResponse.json(
      {
        error: 'Deletion failed',
        message:
          error instanceof Error ? error.message : 'An error occurred during account deletion',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Use POST to initiate deletion, DELETE to confirm',
    },
    { status: 405 }
  )
}
