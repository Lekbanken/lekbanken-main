'use client';

import { useViewport } from '../../store/sandbox-store';
import { viewportConfig } from '../../types/sandbox';
import { cn } from '@/lib/utils';

interface ViewportFrameProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * ViewportFrame wraps content and constrains it to the selected viewport width.
 * Used in the sandbox preview area to simulate responsive layouts.
 */
export function ViewportFrame({ children, className }: ViewportFrameProps) {
  const { viewport } = useViewport();
  const config = viewportConfig[viewport];

  // Desktop gets full width (no constraint), others get framed
  const isConstrained = viewport !== 'desktop';

  return (
    <div
      className={cn(
        'mx-auto transition-all duration-300 ease-out',
        isConstrained && 'relative',
        className
      )}
      style={{
        maxWidth: isConstrained ? `${config.maxWidth}px` : undefined,
      }}
    >
      {/* Viewport indicator label */}
      {isConstrained && (
        <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>{config.icon}</span>
          <span>{config.label}</span>
          <span className="font-mono">({config.maxWidth}px)</span>
        </div>
      )}

      {/* Content frame */}
      <div
        className={cn(
          'w-full transition-all duration-300',
          isConstrained && [
            'rounded-lg border border-border bg-background shadow-sm',
            'ring-1 ring-black/5 dark:ring-white/5',
          ]
        )}
      >
        {isConstrained ? (
          <div className="overflow-hidden rounded-lg">{children}</div>
        ) : (
          children
        )}
      </div>

      {/* Viewport size ruler (subtle) */}
      {isConstrained && (
        <div className="mt-2 flex justify-center">
          <div 
            className="h-0.5 rounded-full bg-muted-foreground/20"
            style={{ width: `${Math.min(config.maxWidth, 200)}px` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get viewport-aware class names for responsive testing
 */
export function useViewportClasses() {
  const { viewport } = useViewport();
  
  return {
    viewport,
    isDesktop: viewport === 'desktop',
    isTablet: viewport === 'tablet',
    isMobile: viewport === 'mobile',
    maxWidth: viewportConfig[viewport].maxWidth,
  };
}
