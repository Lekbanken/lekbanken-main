'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /** Content to scroll */
  children: ReactNode;
  /** Maximum height */
  maxHeight?: string | number;
  /** Orientation */
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, maxHeight, orientation = 'vertical', style, ...props }, ref) => {
    const overflowClasses = {
      vertical: 'overflow-y-auto overflow-x-hidden',
      horizontal: 'overflow-x-auto overflow-y-hidden',
      both: 'overflow-auto',
    };

    return (
      <div
        ref={ref}
        className={cn(
          overflowClasses[orientation],
          'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
          className
        )}
        style={{
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

// Horizontal scroll bar component
interface ScrollBarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

export const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ orientation: _orientation = 'vertical', className: _className, ..._props }, _ref) => {
    // This is a placeholder for custom scrollbar styling
    // The actual scrollbar is handled by CSS
    return null;
  }
);

ScrollBar.displayName = 'ScrollBar';
