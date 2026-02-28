import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading boundary for the /app layout.
 *
 * Shown during RSC soft navigation when app/app/layout.tsx is
 * executing server-side (getServerAuthContext, legal checks, etc.).
 * Without this, users see no feedback while transitioning admin → app.
 */
export default function AppLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar skeleton */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-4">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-5 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 p-6 lg:p-8 space-y-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-6 space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
