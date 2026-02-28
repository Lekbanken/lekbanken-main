'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

/**
 * Error boundary for the /app layout.
 *
 * Catches errors thrown by server components (getServerAuthContext,
 * getPendingLegalDocuments, etc.) that sit OUTSIDE nested error.tsx
 * boundaries (e.g. app/app/profile/error.tsx).
 *
 * Without this file, a throw in app/app/layout.tsx results in a
 * blank screen (no error UI) during RSC soft navigation.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('app.errorBoundary')

  useEffect(() => {
    console.error('[app error boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <ExclamationTriangleIcon className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        {t('title')}
      </h2>
      <p className="text-muted-foreground text-center max-w-md">
        {t('description')}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          {t('retry')}
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          {t('reload')}
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="text-xs text-muted-foreground bg-muted p-3 rounded max-w-lg overflow-auto mt-4">
          {error.message}
          {error.digest && `\nDigest: ${error.digest}`}
        </pre>
      )}
    </div>
  )
}
