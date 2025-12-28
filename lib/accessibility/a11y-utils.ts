/**
 * Accessibility Utilities for Play UI
 * 
 * WCAG 2.1 AA compliance helpers for the participant-facing play experience.
 */

// =============================================================================
// Focus Management
// =============================================================================

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstFocusable?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// =============================================================================
// Color Contrast
// =============================================================================

/**
 * Calculate relative luminance of a color
 * Formula: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 
      ? sRGB / 12.92 
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * WCAG 2.1 AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 */
export function meetsContrastRequirement(
  ratio: number,
  isLargeText: boolean = false
): boolean {
  const threshold = isLargeText ? 3 : 4.5;
  return ratio >= threshold;
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// =============================================================================
// Keyboard Navigation
// =============================================================================

/**
 * Common keyboard shortcuts for play UI
 */
export const KEYBOARD_SHORTCUTS = {
  PAUSE: 'Space',
  NEXT_STEP: 'ArrowRight',
  PREV_STEP: 'ArrowLeft',
  TOGGLE_HELP: 'F1',
  TOGGLE_TIMER: 'T',
  CONFIRM: 'Enter',
  CANCEL: 'Escape',
  SKIP: 'S',
} as const;

/**
 * Register a keyboard shortcut handler
 */
export function registerShortcut(
  key: keyof typeof KEYBOARD_SHORTCUTS,
  handler: () => void,
  options: { requireCtrl?: boolean; requireShift?: boolean } = {}
): () => void {
  const shortcutKey = KEYBOARD_SHORTCUTS[key];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (options.requireCtrl && !e.ctrlKey && !e.metaKey) return;
    if (options.requireShift && !e.shiftKey) return;

    // Don't trigger in input fields
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    if (e.key === shortcutKey || e.code === shortcutKey) {
      e.preventDefault();
      handler();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}

// =============================================================================
// ARIA Labels & Descriptions
// =============================================================================

/**
 * Generate accessible timer description
 */
export function getTimerAriaLabel(
  seconds: number,
  isPaused: boolean,
  isWarning: boolean
): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = minutes > 0 
    ? `${minutes} minutes and ${secs} seconds`
    : `${secs} seconds`;

  if (isPaused) {
    return `Timer paused at ${timeStr}`;
  }

  if (isWarning) {
    return `Warning: Only ${timeStr} remaining`;
  }

  return `${timeStr} remaining`;
}

/**
 * Generate accessible step progress description
 */
export function getStepProgressAriaLabel(
  currentStep: number,
  totalSteps: number,
  stepTitle?: string
): string {
  const base = `Step ${currentStep} of ${totalSteps}`;
  return stepTitle ? `${base}: ${stepTitle}` : base;
}

/**
 * Generate accessible phase progress description
 */
export function getPhaseProgressAriaLabel(
  currentPhase: number,
  totalPhases: number,
  phaseName?: string
): string {
  const base = `Phase ${currentPhase} of ${totalPhases}`;
  return phaseName ? `${base}: ${phaseName}` : base;
}

// =============================================================================
// Motion & Animation Preferences
// =============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preferences
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// =============================================================================
// High Contrast Mode
// =============================================================================

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Get color variant based on contrast preference
 */
export function getContrastColor(
  normalColor: string,
  highContrastColor: string
): string {
  return prefersHighContrast() ? highContrastColor : normalColor;
}

// =============================================================================
// Skip Links
// =============================================================================

/**
 * Create skip link component props
 */
export function getSkipLinkProps(targetId: string, label: string = 'Skip to main content') {
  return {
    href: `#${targetId}`,
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded focus:shadow-lg',
    children: label,
  };
}

// =============================================================================
// Form Accessibility
// =============================================================================

/**
 * Generate accessible form field props
 */
export function getFormFieldProps(
  id: string,
  label: string,
  options: {
    required?: boolean;
    error?: string;
    hint?: string;
  } = {}
) {
  const { required, error, hint } = options;
  const descriptionIds: string[] = [];

  if (hint) descriptionIds.push(`${id}-hint`);
  if (error) descriptionIds.push(`${id}-error`);

  return {
    input: {
      id,
      'aria-required': required,
      'aria-invalid': !!error,
      'aria-describedby': descriptionIds.length > 0 ? descriptionIds.join(' ') : undefined,
    },
    label: {
      htmlFor: id,
    },
    hint: hint ? { id: `${id}-hint` } : null,
    error: error ? { id: `${id}-error`, role: 'alert' } : null,
  };
}

// =============================================================================
// Live Region Management
// =============================================================================

export type LiveRegionPriority = 'polite' | 'assertive' | 'off';

/**
 * Create a live region manager for dynamic content updates
 */
export function createLiveRegion(priority: LiveRegionPriority = 'polite') {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', priority);
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only';
  document.body.appendChild(region);

  return {
    announce: (message: string) => {
      region.textContent = '';
      // Force browser to re-announce
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    },
    destroy: () => {
      document.body.removeChild(region);
    },
  };
}
