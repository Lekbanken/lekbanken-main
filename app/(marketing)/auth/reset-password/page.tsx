'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const { resetPassword, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    try {
      await resetPassword(email)
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          {success && (
            <div className="rounded-md border border-success/30 bg-success/10 p-4 text-success-foreground">
              <p className="text-sm font-medium">
                If an account exists with that email, you will receive a password reset link.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive-foreground">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
              placeholder="Email address"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/auth/login" className="font-medium text-primary hover:text-primary/90">
              Back to login
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-primary hover:text-primary/90">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
