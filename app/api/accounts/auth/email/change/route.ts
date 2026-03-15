import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

interface EmailChangeBody {
  new_email?: string
  password?: string
}

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async ({ auth, req }) => {
    const user = auth!.user!
    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as EmailChangeBody

    if (!body.new_email) {
      return NextResponse.json(
        { error: 'New email is required', errorCode: 'MISSING_FIELD', field: 'new_email' },
        { status: 400 },
      )
    }

    if (!body.password) {
      return NextResponse.json(
        { error: 'Password is required', errorCode: 'MISSING_FIELD', field: 'password' },
        { status: 400 },
      )
    }

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: body.password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Invalid password', errorCode: 'INVALID_PASSWORD', field: 'password' },
        { status: 400 },
      )
    }

    // Request email change — Supabase sends a confirmation email to the new address
    const { error } = await supabase.auth.updateUser({ email: body.new_email })

    if (error) {
      console.error('[auth/email/change] Failed to update email', error)
      return NextResponse.json(
        { error: 'Email update failed', errorCode: 'UPDATE_FAILED', field: 'new_email' },
        { status: 400 },
      )
    }

    return NextResponse.json({ ok: true })
  },
})
