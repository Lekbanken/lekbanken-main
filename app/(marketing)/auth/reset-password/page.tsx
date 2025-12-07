'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Link from 'next/link'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/lib/context/PreferencesContext'
import { getUiCopy } from '@/lib/i18n/ui'
import { useAuth } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const { resetPassword, isLoading } = useAuth()
  const { language } = usePreferences()
  const copy = useMemo(() => getUiCopy(language), [language])
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
    <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-card">
            <span className="text-sm font-semibold text-foreground">Lekbanken</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-center text-2xl font-bold text-foreground">{copy.auth.passwordResetTitle}</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">{copy.auth.passwordResetDescription}</p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
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
                {copy.auth.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder={copy.auth.email}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Sending...' : copy.auth.passwordResetAction}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              <Link href="/auth/login" className="font-medium text-primary hover:text-primary/90">
                {copy.auth.backToLogin}
              </Link>
            </p>
            <p>
              {copy.auth.signupPrompt}{' '}
              <Link href="/auth/signup" className="font-medium text-primary hover:text-primary/90">
                {copy.auth.signupAction}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
