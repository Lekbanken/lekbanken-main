import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

export default function GameDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Header skeleton: cover image + title */}
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>

      {/* Badges skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: content sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* About section */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <SkeletonText lines={4} />
          </div>

          {/* Steps section */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Materials section */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <SkeletonText lines={2} />
          </div>
        </div>

        {/* Right column: sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border p-6 space-y-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
