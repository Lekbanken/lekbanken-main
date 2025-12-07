'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = usePreferences()
  const copy = useMemo(() => getUiCopy(language), [language])
  const { signIn, signInWithGoogle, isLoading, isAuthenticated, userRole } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const redirectParam = searchParams.get('redirect')
  const redirectTo = redirectParam || (userRole === 'admin' ? '/admin' : '/app')

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo)
    }
  }, [isAuthenticated, isLoading, redirectTo, router])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await signIn(email, password)
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
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
            <CardTitle className="text-center text-3xl font-extrabold text-foreground">{copy.auth.loginTitle}</CardTitle>
            <p className="mt-2 text-center text-sm text-muted-foreground">{copy.auth.loginDescription}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              {error && <Alert variant="error">{error}</Alert>}

              <div className="space-y-4">
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
                    className="rounded-t-md"
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
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={copy.auth.password}
                    className="rounded-b-md"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Signing in...' : copy.auth.loginAction}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              {copy.auth.googleAction}
            </Button>

            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>
                {copy.auth.signupPrompt}{' '}
                <Link href="/auth/signup" className="font-medium text-primary hover:text-primary/80">
                  {copy.auth.signupAction}
                </Link>
              </p>
              <p>
                <Link href="/auth/reset-password" className="font-medium text-primary hover:text-primary/80">
                  {copy.auth.forgotPassword}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
