'use client';

import { useState, useRef, useCallback, useId, type ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** The content to show in the tooltip */
  content: ReactNode;
  /** The element that triggers the tooltip */
  children: ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Delay before showing (ms) */
  delay?: number;
  /** Additional class names for the tooltip */
  className?: string;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

interface InfoTooltipProps {
  /** The help text to display */
  content: ReactNode;
  /** Position of the tooltip */
  position?: TooltipPosition;
  /** Size of the info icon */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Position styles
// =============================================================================

const positionStyles: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowStyles: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-foreground border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-foreground border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-foreground border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-foreground border-y-transparent border-l-transparent',
};

// =============================================================================
// Tooltip Component
// =============================================================================

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      <span aria-describedby={isVisible ? tooltipId : undefined}>
        {children}
      </span>

      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-50 px-2 py-1.5 text-xs font-medium
            bg-foreground text-background rounded shadow-lg
            whitespace-nowrap pointer-events-none
            animate-in fade-in-0 zoom-in-95 duration-150
            ${positionStyles[position]}
            ${className}
          `}
        >
          {content}
          <span
            className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`}
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}

// =============================================================================
// InfoTooltip Component (ⓘ icon with tooltip)
// =============================================================================

export function InfoTooltip({
  content,
  position = 'top',
  size = 'sm',
  className = '',
}: InfoTooltipProps) {
  const sizeStyles = {
    sm: 'h-4 w-4 text-[10px]',
    md: 'h-5 w-5 text-xs',
  };

  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center
          rounded-full border border-muted-foreground/40
          text-muted-foreground hover:text-foreground
          hover:border-foreground/60 transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary/50
          ${sizeStyles[size]}
          ${className}
        `}
        aria-label="Mer information"
      >
        <span aria-hidden="true">i</span>
      </button>
    </Tooltip>
  );
}

// =============================================================================
// Label with Tooltip (common pattern)
// =============================================================================

interface LabelWithTooltipProps {
  /** The label text */
  label: string;
  /** The help text for the tooltip */
  tooltip: string;
  /** Whether the field is required */
  required?: boolean;
  /** HTML for attribute */
  htmlFor?: string;
  /** Additional class names */
  className?: string;
}

export function LabelWithTooltip({
  label,
  tooltip,
  required = false,
  htmlFor,
  className = '',
}: LabelWithTooltipProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`flex items-center gap-1.5 text-sm font-medium ${className}`}
    >
      {label}
      {required && <span className="text-destructive">*</span>}
      <InfoTooltip content={tooltip} />
    </label>
  );
}
