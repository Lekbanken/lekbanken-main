import { cn } from "@/lib/utils";

type UserListSkeletonProps = {
  count?: number;
  className?: string;
};

export function UserListSkeleton({ count = 6, className }: UserListSkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <UserListItemSkeleton key={index} />
      ))}
    </div>
  );
}

function UserListItemSkeleton() {
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors">
      {/* Header */}
      <div className="mb-4 flex items-start gap-4">
        {/* Avatar skeleton */}
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />

        {/* User info skeleton */}
        <div className="flex-1 space-y-2">
          {/* Name */}
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          {/* Email */}
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>

        {/* Actions button skeleton */}
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Badges skeleton */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      </div>

      {/* Memberships preview skeleton */}
      <div className="mb-4 rounded-lg border border-border/40 bg-muted/30 p-3">
        <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Footer grid skeleton */}
      <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
