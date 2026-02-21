/**
 * Lobby Skeleton Components
 *
 * Lightweight placeholder UI shown while heavy lobby panels
 * (DirectorModeDrawer, ArtifactsPanel, SessionChatModal, etc.)
 * are being dynamically imported. These render instantly with
 * no data dependencies.
 */

import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// Director Mode Drawer skeleton (full-screen overlay placeholder)
// =============================================================================
export function DirectorModeSkeleton() {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-500/5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex border-b">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center justify-center py-3.5">
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 p-5">
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-7 w-56 mx-auto" />
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-14 rounded-lg" />
            <Skeleton className="flex-1 h-14 rounded-lg" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Artifacts Panel skeleton
// =============================================================================
export function ArtifactsPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Chat Modal skeleton
// =============================================================================
export function ChatModalSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-24" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className={`h-10 rounded-lg ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

// =============================================================================
// Storyline Modal skeleton
// =============================================================================
export function StorylineModalSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-7 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Leave Session Modal skeleton
// =============================================================================
export function LeaveSessionModalSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}
