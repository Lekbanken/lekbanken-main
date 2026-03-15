import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

interface PasswordChangeBody {
  current_password?: string
  new_password?: string
}

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async ({ auth, req }) => {
    const user = auth!.user!
    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as PasswordChangeBody

    if (!body.current_password) {
      return NextResponse.json(
        { error: 'Current password is required', errorCode: 'MISSING_FIELD', field: 'current_password' },
        { status: 400 },
      )
    }

    if (!body.new_password) {
      return NextResponse.json(
        { error: 'New password is required', errorCode: 'MISSING_FIELD', field: 'new_password' },
        { status: 400 },
      )
    }

    if (body.new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters', errorCode: 'WEAK_PASSWORD', field: 'new_password' },
        { status: 400 },
      )
    }

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: body.current_password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Current password is incorrect', errorCode: 'INVALID_PASSWORD', field: 'current_password' },
        { status: 400 },
      )
    }

    // Update password
    const { error } = await supabase.auth.updateUser({ password: body.new_password })

    if (error) {
      console.error('[auth/password/change] Failed to update password', error)
      return NextResponse.json(
        { error: 'Password update failed', errorCode: 'UPDATE_FAILED' },
        { status: 400 },
      )
    }

    return NextResponse.json({ ok: true })
  },
})
