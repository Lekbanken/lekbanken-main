'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('app.profile')

  useEffect(() => {
    // Log för monitoring/debugging
    console.error('[profile error boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <ExclamationTriangleIcon className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{t('errorBoundary.title')}</h2>
      <p className="text-muted-foreground text-center max-w-md">
        {t('errorBoundary.description')}
      </p>
      <Button onClick={reset} variant="default">
        {t('errorBoundary.retry')}
      </Button>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="text-xs text-muted-foreground bg-muted p-3 rounded max-w-md overflow-auto mt-4">
          {error.message}
        </pre>
      )}
    </div>
  )
}
