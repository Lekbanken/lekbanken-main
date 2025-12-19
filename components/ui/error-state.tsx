'use client'

import type { ReactNode } from 'react'
import { Button } from './button'

interface ErrorStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  error?: Error | string
  onRetry?: () => void
  onGoBack?: () => void
  className?: string
}

export function ErrorState({
  icon,
  title = 'Något gick fel',
  description,
  error,
  onRetry,
  onGoBack,
  className = '',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon ? (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          {icon}
        </div>
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {(description || errorMessage) && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description || errorMessage}
        </p>
      )}
      {(onRetry || onGoBack) && (
        <div className="mt-6 flex gap-3">
          {onRetry && (
            <Button onClick={onRetry}>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Försök igen
            </Button>
          )}
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack}>
              Gå tillbaka
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Preset variants
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
      }
      title="Ingen anslutning"
      description="Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen."
      onRetry={onRetry}
    />
  )
}

export function NotFoundState({ 
  itemName = 'sidan',
  onGoBack,
}: { 
  itemName?: string
  onGoBack?: () => void 
}) {
  return (
    <ErrorState
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      }
      title="Hittades inte"
      description={`Vi kunde inte hitta ${itemName} du letade efter.`}
      onGoBack={onGoBack}
    />
  )
}

export function PermissionErrorState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <ErrorState
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      }
      title="Åtkomst nekad"
      description="Du har inte behörighet att visa denna sida."
      onGoBack={onGoBack}
    />
  )
}
