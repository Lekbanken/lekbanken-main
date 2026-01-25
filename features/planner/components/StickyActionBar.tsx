'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Sticky Action Bar
// =============================================================================

interface StickyActionBarProps {
  /** Left-side content (usually back button) */
  left?: ReactNode;
  /** Right-side content (usually primary action) */
  right?: ReactNode;
  /** Center content (optional) */
  center?: ReactNode;
  /** Position: bottom (default) or top */
  position?: 'bottom' | 'top';
  /** Whether to show border */
  showBorder?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Sticky action bar for wizard navigation.
 * Fixed to bottom of screen on mobile, provides easy thumb access.
 * 
 * @example
 * <StickyActionBar
 *   left={<Button variant="ghost" onClick={onBack}>Tillbaka</Button>}
 *   right={<Button onClick={onNext}>Fortsätt</Button>}
 * />
 */
export function StickyActionBar({
  left,
  right,
  center,
  position = 'bottom',
  showBorder = true,
  className,
}: StickyActionBarProps) {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-sm',
        'px-4 py-3 sm:px-6',
        // Safe area for iOS
        position === 'bottom' && 'bottom-0 pb-[env(safe-area-inset-bottom,12px)]',
        position === 'top' && 'top-0 pt-[env(safe-area-inset-top,12px)]',
        showBorder && position === 'bottom' && 'border-t border-border',
        showBorder && position === 'top' && 'border-b border-border',
        className
      )}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        {/* Left slot */}
        <div className="flex min-w-0 flex-1 items-center justify-start">
          {left}
        </div>

        {/* Center slot */}
        {center && (
          <div className="flex items-center justify-center">
            {center}
          </div>
        )}

        {/* Right slot */}
        <div className="flex min-w-0 flex-1 items-center justify-end">
          {right}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sticky Action Bar Spacer
// =============================================================================

interface StickyActionBarSpacerProps {
  /** Height of the spacer (should match action bar height) */
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const heightClasses = {
  sm: 'h-14',
  md: 'h-16',
  lg: 'h-20',
};

/**
 * Spacer to prevent content from being hidden behind sticky action bar.
 * Place at the bottom of your scrollable content.
 * 
 * @example
 * <div className="space-y-4">
 *   <YourContent />
 *   <StickyActionBarSpacer />
 * </div>
 * <StickyActionBar ... />
 */
export function StickyActionBarSpacer({
  height = 'md',
  className,
}: StickyActionBarSpacerProps) {
  return (
    <div 
      className={cn(
        heightClasses[height],
        // Extra space for iOS safe area
        'pb-[env(safe-area-inset-bottom,0px)]',
        className
      )} 
      aria-hidden="true" 
    />
  );
}

// =============================================================================
// Wizard Action Bar (Specialized version)
// =============================================================================

interface WizardActionBarProps {
  /** Show back button */
  showBack?: boolean;
  /** Back button click handler */
  onBack?: () => void;
  /** Back button label */
  backLabel?: string;
  /** Back button loading state */
  isBackLoading?: boolean;
  
  /** Primary action button content */
  primaryAction?: ReactNode;
  /** Primary action click handler */
  onPrimaryAction?: () => void;
  /** Primary action label */
  primaryLabel?: string;
  /** Primary action loading state */
  isPrimaryLoading?: boolean;
  /** Primary action disabled state */
  isPrimaryDisabled?: boolean;
  
  /** Secondary action button content */
  secondaryAction?: ReactNode;
  
  /** Additional className */
  className?: string;
}

/**
 * Pre-configured action bar for wizard steps.
 * 
 * @example
 * <WizardActionBar
 *   showBack
 *   onBack={goToPrevStep}
 *   backLabel="Tillbaka"
 *   primaryLabel="Fortsätt"
 *   onPrimaryAction={goToNextStep}
 *   isPrimaryLoading={isSaving}
 * />
 */
export function WizardActionBar({
  showBack = true,
  onBack,
  backLabel = 'Tillbaka',
  isBackLoading = false,
  primaryAction,
  onPrimaryAction,
  primaryLabel = 'Fortsätt',
  isPrimaryLoading = false,
  isPrimaryDisabled = false,
  secondaryAction,
  className,
}: WizardActionBarProps) {
  return (
    <StickyActionBar
      className={className}
      left={
        showBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={isBackLoading}
            className={cn(
              'flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground',
              'transition-colors hover:text-foreground',
              'rounded-lg hover:bg-muted',
              isBackLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
        ) : (
          <div />
        )
      }
      center={secondaryAction}
      right={
        primaryAction ?? (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isPrimaryDisabled || isPrimaryLoading}
            className={cn(
              'flex items-center gap-1 rounded-lg bg-primary px-4 py-2',
              'text-sm font-medium text-primary-foreground',
              'transition-colors hover:bg-primary/90',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              (isPrimaryDisabled || isPrimaryLoading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isPrimaryLoading ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <>
                <span>{primaryLabel}</span>
                <ChevronRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
        )
      }
    />
  );
}

// =============================================================================
// Helper Icons
// =============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
