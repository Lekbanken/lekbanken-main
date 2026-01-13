import { Skeleton } from '@/components/ui/skeleton';

/**
 * Demo Loading State
 * Shown while demo pages are loading
 */
export default function DemoLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Hero Section Skeleton */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <Skeleton className="mx-auto h-8 w-48 rounded-full" />
          
          {/* Title */}
          <Skeleton className="mx-auto mt-8 h-12 w-full max-w-lg" />
          <Skeleton className="mx-auto mt-2 h-12 w-3/4" />
          
          {/* Description */}
          <Skeleton className="mx-auto mt-6 h-6 w-full max-w-md" />
          <Skeleton className="mx-auto mt-2 h-6 w-2/3" />
          
          {/* Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-36" />
          </div>
        </div>
      </section>

      {/* Feature Comparison Skeleton */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <Skeleton className="mx-auto mb-12 h-8 w-48" />
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Free Tier Card */}
          <div className="rounded-xl border-2 border-muted p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 mb-6" />
            <Skeleton className="h-10 w-24 mb-6" />
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                </div>
              ))}
            </div>
            
            <Skeleton className="mt-8 h-10 w-full" />
          </div>

          {/* Premium Tier Card */}
          <div className="rounded-xl border-2 border-muted p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 mb-6" />
            <Skeleton className="h-10 w-24 mb-6" />
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                </div>
              ))}
            </div>
            
            <Skeleton className="mt-8 h-10 w-full" />
          </div>
        </div>
      </section>

      {/* Privacy Notice Skeleton */}
      <section className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <Skeleton className="mx-auto h-6 w-48 mb-4" />
          <Skeleton className="mx-auto h-4 w-full max-w-lg" />
          <Skeleton className="mx-auto mt-2 h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}
