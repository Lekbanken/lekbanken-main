'use client';

/**
 * GameCard Skeleton Component
 *
 * Loading states for each GameCard variant.
 */

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { GameCardVariant } from './types';

interface GameCardSkeletonProps {
  variant?: GameCardVariant;
  className?: string;
}

// =============================================================================
// SKELETON: GRID
// =============================================================================

function SkeletonGrid({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border/20 bg-card', className)}>
      {/* Image */}
      <Skeleton className="aspect-video w-full" />

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />

        {/* Description */}
        <div className="mt-2 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        {/* Tags */}
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Bottom meta */}
        <div className="mt-3 flex items-center gap-2 pt-3">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON: LIST
// =============================================================================

function SkeletonList({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-border/30 bg-card p-3', className)}>
      {/* Image - Compact square */}
      <Skeleton className="h-16 w-16 flex-shrink-0 rounded-lg" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title */}
        <Skeleton className="h-4 w-2/3" />

        {/* Category */}
        <Skeleton className="mt-1 h-3 w-24" />

        {/* Description */}
        <div className="mt-1.5 space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Meta row */}
        <div className="mt-2 flex gap-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>

      {/* Favorite */}
      <Skeleton className="h-6 w-6 rounded-full" />
    </div>
  );
}

// =============================================================================
// SKELETON: COMPACT
// =============================================================================

function SkeletonCompact({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 rounded-xl border border-border/30 bg-card p-3', className)}>
      {/* Thumbnail */}
      <Skeleton className="h-14 w-14 flex-shrink-0 rounded-lg" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-3 w-16" />
      </div>

      {/* Rating */}
      <Skeleton className="h-4 w-10" />
    </div>
  );
}

// =============================================================================
// SKELETON: PICKER
// =============================================================================

function SkeletonPicker({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-border/30 bg-card p-3', className)}>
      {/* Image */}
      <Skeleton className="h-14 w-14 flex-shrink-0 rounded-lg" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-1 space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      {/* Duration badge */}
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  );
}

// =============================================================================
// SKELETON: BLOCK
// =============================================================================

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3 py-2', className)}>
      {/* Drag handle */}
      <Skeleton className="h-5 w-5" />

      {/* Badge */}
      <Skeleton className="h-5 w-12 rounded-full" />

      {/* Title */}
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Energy */}
      <Skeleton className="h-3 w-8" />

      {/* Duration */}
      <Skeleton className="h-3 w-12" />

      {/* Actions */}
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-4" />
    </div>
  );
}

// =============================================================================
// SKELETON: MINI
// =============================================================================

function SkeletonMini({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border/30 bg-card p-4', className)}>
      <Skeleton className="h-5 w-3/4" />
      <div className="mt-2 space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="mt-2 h-5 w-16 rounded-lg" />
    </div>
  );
}

// =============================================================================
// SKELETON: FEATURED
// =============================================================================

function SkeletonFeatured({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border/20 bg-card shadow-lg', className)}>
      {/* Top badges */}
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Image */}
      <Skeleton className="aspect-[16/9] w-full" />

      {/* Content */}
      <div className="p-6">
        <Skeleton className="h-6 w-2/3" />
        <div className="mt-2 space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Categories */}
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-18 rounded-full" />
        </div>

        {/* Meta */}
        <div className="mt-4 flex items-center justify-between pt-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN SKELETON COMPONENT
// =============================================================================

/**
 * GameCard Skeleton
 *
 * Renderar en loading skeleton i vald variant.
 *
 * @example
 * <GameCardSkeleton variant="grid" />
 * <GameCardSkeleton variant="list" />
 */
export function GameCardSkeleton({ variant = 'grid', className }: GameCardSkeletonProps) {
  switch (variant) {
    case 'list':
      return <SkeletonList className={className} />;
    case 'compact':
      return <SkeletonCompact className={className} />;
    case 'picker':
      return <SkeletonPicker className={className} />;
    case 'block':
      return <SkeletonBlock className={className} />;
    case 'mini':
      return <SkeletonMini className={className} />;
    case 'featured':
      return <SkeletonFeatured className={className} />;
    case 'grid':
    default:
      return <SkeletonGrid className={className} />;
  }
}

// Export individual skeletons for special cases
export {
  SkeletonGrid,
  SkeletonList,
  SkeletonCompact,
  SkeletonPicker,
  SkeletonBlock,
  SkeletonMini,
  SkeletonFeatured,
};
