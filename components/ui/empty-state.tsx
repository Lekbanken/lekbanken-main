'use client'

import type { ReactNode } from 'react'
import { Button } from './button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Preset variants for common use cases
export function EmptySearchState({ 
  query,
  onClear,
}: { 
  query?: string
  onClear?: () => void 
}) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      }
      title="Inga resultat hittades"
      description={query ? `Inga resultat för "${query}". Prova ett annat sökord.` : 'Prova att justera din sökning eller filter.'}
      action={onClear ? { label: 'Rensa sökning', onClick: onClear } : undefined}
    />
  )
}

export function EmptyListState({ 
  itemName = 'objekt',
  onAdd,
}: { 
  itemName?: string
  onAdd?: () => void 
}) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      }
      title={`Inga ${itemName} än`}
      description={`Det finns inga ${itemName} att visa just nu.`}
      action={onAdd ? { label: `Lägg till ${itemName}`, onClick: onAdd } : undefined}
    />
  )
}

export function EmptyFavoritesState({ 
  onBrowse,
}: { 
  onBrowse?: () => void 
}) {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      }
      title="Inga favoriter"
      description="Du har inte lagt till några favoriter än. Utforska och spara dina favoritaktiviteter!"
      action={onBrowse ? { label: 'Utforska aktiviteter', onClick: onBrowse } : undefined}
    />
  )
}
