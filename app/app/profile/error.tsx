'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log för monitoring/debugging
    console.error('[profile error boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="rounded-full bg-destructive/10 p-4">
        <ExclamationTriangleIcon className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Något gick fel</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Vi kunde inte ladda din profilsida. Försök igen eller kontakta support om problemet kvarstår.
      </p>
      <Button onClick={reset} variant="default">
        Försök igen
      </Button>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="text-xs text-muted-foreground bg-muted p-3 rounded max-w-md overflow-auto mt-4">
          {error.message}
        </pre>
      )}
    </div>
  )
}
