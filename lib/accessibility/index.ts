/**
 * Accessibility exports
 */

// Utilities
export {
  // Focus management
  trapFocus,
  announceToScreenReader,
  
  // Color contrast
  getLuminance,
  getContrastRatio,
  meetsContrastRequirement,
  hexToRgb,
  
  // Keyboard
  KEYBOARD_SHORTCUTS,
  registerShortcut,
  
  // ARIA helpers
  getTimerAriaLabel,
  getStepProgressAriaLabel,
  getPhaseProgressAriaLabel,
  
  // Motion & contrast preferences
  prefersReducedMotion,
  prefersHighContrast,
  getAnimationDuration,
  getContrastColor,
  
  // Skip links
  getSkipLinkProps,
  
  // Form accessibility
  getFormFieldProps,
  
  // Live regions
  createLiveRegion,
} from './a11y-utils';

export type { LiveRegionPriority } from './a11y-utils';

// React hooks
export {
  // Preference detection
  useReducedMotion,
  useHighContrast,
  
  // Announcements
  useAnnounce,
  useLiveRegion,
  
  // Keyboard
  useKeyboardShortcuts,
  
  // Focus
  useFocusReturn,
  useRovingTabIndex,
  
  // Timer
  useTimerAnnouncements,
  
  // Component helpers
  useModalA11y,
  useAlertA11y,
} from './a11y-hooks';
