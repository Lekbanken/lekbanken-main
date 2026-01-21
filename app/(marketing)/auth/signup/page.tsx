'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { ThemeToggle } from '@/components/navigation/ThemeToggle'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePreferences } from '@/lib/context/PreferencesContext'
import { getUiCopy } from '@/lib/i18n/ui'
import { useAuth } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()
  const { language } = usePreferences()
  const copy = useMemo(() => getUiCopy(language), [language])
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const allowlist = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_REGISTRATION_ALLOWLIST || ''
    return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  }, [])

  const isAllowed = allowlist.length === 0 || allowlist.includes(email.trim().toLowerCase())
  const registrationClosed = allowlist.length > 0 && !isAllowed
  const betaMessage = 'Vi är i beta - registrering är stängd. Kontakta oss för access.'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (registrationClosed) {
        throw new Error(betaMessage)
      }

      await signUp(email, password, fullName)

      alert('Sign up successful! Please log in with your credentials.')
      setTimeout(() => router.push('/auth/login'), 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed'
      setError(errorMessage)
      console.error('Signup error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-muted">
            <span className="text-sm font-semibold text-foreground">Lekbanken</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center text-3xl font-extrabold text-foreground">
              {copy.auth.signupTitle}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={handleSignup}>
              {error && <Alert variant="error">{error}</Alert>}
              {registrationClosed && !error && <Alert variant="warning">{betaMessage}</Alert>}

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="sr-only">
                    Full name
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">
                    {copy.auth.email}
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.auth.email}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    {copy.auth.password}
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={copy.auth.password}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Organisationer skapas efter genomfört köp (Stripe-bekräftelse). Se{' '}
                <Link href="/pricing" className="font-medium text-primary hover:text-primary/80">
                  priser
                </Link>{' '}
                för att köpa en licens.
              </div>

              <Button type="submit" disabled={isLoading || registrationClosed} className="w-full">
                {isLoading ? 'Creating account...' : copy.auth.signupAction}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                {copy.auth.loginDescription}{' '}
                <Link href="/auth/login" className="font-medium text-primary hover:text-primary/80">
                  {copy.auth.loginAction}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
