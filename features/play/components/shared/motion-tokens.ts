/**
 * Motion Tokens — Shared micro-motion class strings
 *
 * Single source of truth for all animation/transition classes used across
 * Participant and Director play views. Import these instead of copy-pasting
 * class strings so both sides stay in parity automatically.
 */

// =============================================================================
// Drawer
// =============================================================================

/** Drawer backdrop (shared, all breakpoints) */
export const MOTION_DRAWER_BACKDROP =
  'fixed inset-0 z-[60] bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200';

/** Drawer container — bottom-pinned on mobile, centered on desktop */
export const MOTION_DRAWER_CONTAINER =
  'fixed inset-x-0 bottom-0 z-[61] lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-4';

/** Drawer card — sheet on mobile, modal on desktop (base, append size) */
export const MOTION_DRAWER_CARD_BASE =
  'w-full max-h-[75vh] overflow-y-auto rounded-t-2xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out lg:max-h-[80vh] lg:rounded-2xl lg:animate-in lg:fade-in lg:zoom-in-95 lg:duration-150';

/** Participant drawer desktop width */
export const MOTION_DRAWER_SIZE_SM = 'lg:max-w-lg';

/** Director drawer desktop width */
export const MOTION_DRAWER_SIZE_LG = 'lg:max-w-2xl xl:max-w-3xl';

/** Drag handle wrapper — mobile only */
export const MOTION_DRAWER_HANDLE = 'flex justify-center pt-3 pb-1 lg:hidden';

/** Drag handle bar */
export const MOTION_DRAWER_HANDLE_BAR = 'h-1 w-10 rounded-full bg-muted-foreground/30';

/** Inner content padding */
export const MOTION_DRAWER_CONTENT = 'px-4 pb-4 lg:px-5 lg:py-4';

// =============================================================================
// Chip Lane
// =============================================================================

/** Chip lane wrapper — open state */
export const MOTION_CHIP_LANE_OPEN =
  'flex min-h-[32px] items-center gap-1.5 overflow-hidden py-1 translate-y-0 opacity-100 transition-[min-height,opacity,transform] duration-200';

/** Chip lane wrapper — closed state */
export const MOTION_CHIP_LANE_CLOSED =
  'h-0 min-h-0 overflow-hidden opacity-0 -translate-y-0.5 transition-[min-height,opacity,transform] duration-150';

/** Chip enter animation */
export const MOTION_CHIP_ENTER = 'animate-in fade-in slide-in-from-top-1 duration-200';

/** Chip exit animation */
export const MOTION_CHIP_EXIT = 'animate-out fade-out duration-150';

/** Chip base (shared shape + type) */
export const MOTION_CHIP_BASE =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium active:scale-[0.98]';

// =============================================================================
// Stage / Step
// =============================================================================

/** Step card entrance */
export const MOTION_STAGE_STEP_CARD =
  'overflow-hidden will-change-transform animate-in fade-in slide-in-from-bottom-3 duration-200';

/** Step title stagger */
export const MOTION_STAGE_TITLE =
  'animate-in fade-in slide-in-from-bottom-1 duration-200';

/** Step description stagger */
export const MOTION_STAGE_DESC =
  'animate-in fade-in slide-in-from-bottom-1 duration-200 delay-75';

// =============================================================================
// Connection Badge
// =============================================================================

/** Connection badge base */
export const MOTION_CONNECTION_BADGE =
  'gap-1 text-[10px] px-1.5 py-0.5 transition-opacity duration-500';

/** Degraded breathing pulse */
export const MOTION_CONNECTION_DEGRADED = 'animate-pulse [animation-duration:3s]';
