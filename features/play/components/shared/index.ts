/**
 * Shared Play UI primitives
 *
 * Role-agnostic components and tokens used by both Participant and Director views.
 */

// Motion tokens (class strings)
export {
  MOTION_DRAWER_BACKDROP,
  MOTION_DRAWER_CONTAINER,
  MOTION_DRAWER_CARD_BASE,
  MOTION_DRAWER_SIZE_SM,
  MOTION_DRAWER_SIZE_LG,
  MOTION_DRAWER_HANDLE,
  MOTION_DRAWER_HANDLE_BAR,
  MOTION_DRAWER_CONTENT,
  MOTION_CHIP_LANE_OPEN,
  MOTION_CHIP_LANE_CLOSED,
  MOTION_CHIP_BASE,
  MOTION_CHIP_ENTER,
  MOTION_CHIP_EXIT,
  MOTION_STAGE_STEP_CARD,
  MOTION_STAGE_TITLE,
  MOTION_STAGE_DESC,
  MOTION_CONNECTION_BADGE,
  MOTION_CONNECTION_DEGRADED,
} from './motion-tokens';

// DrawerOverlay
export { DrawerOverlay } from './DrawerOverlay';
export type { DrawerOverlayProps, DrawerSize } from './DrawerOverlay';

// Canonical play runtime types
export { getSessionStatusConfig } from './play-types';
export type { ConnectionState, SessionStatus as SessionStatusType, SessionStatusConfig } from './play-types';

// ConnectionBadge
export { ConnectionBadge } from './ConnectionBadge';
export type { ConnectionBadgeProps } from './ConnectionBadge';

// ChipLane
export { useChipQueue, ChipLaneView } from './ChipLane';
export type { ChipItem, ChipQueueConfig, ChipLaneViewProps } from './ChipLane';

// ProgressDots
export { ProgressDots } from './ProgressDots';
export type { ProgressDotsProps } from './ProgressDots';

// StepHeaderRow
export { StepHeaderRow } from './StepHeaderRow';
export type { StepHeaderRowProps } from './StepHeaderRow';

// NowSummaryRow
export { NowSummaryRow } from './NowSummaryRow';
export type { NowSummaryRowProps } from './NowSummaryRow';

// StatusPill — SSoT for session + connection status badge
export { StatusPill } from './StatusPill';
export type { StatusPillProps } from './StatusPill';

// PlayHeader — SSoT top bar used by Director and Participant
export { PlayHeader } from './PlayHeader';
export type { PlayHeaderProps } from './PlayHeader';

// PlayTopArea — composable top section (header + NowSummaryRow + ChipLane)
export { PlayTopArea } from './PlayTopArea';
export type { PlayTopAreaProps } from './PlayTopArea';

// PlaySurface — shared desktop container (single border policy)
export { PlaySurface } from './PlaySurface';
export type { PlaySurfaceProps } from './PlaySurface';

// LeaderScriptSections — structured renderer for leader scripts
export { LeaderScriptSections, parseLeaderScript } from './LeaderScriptSections';
export type { LeaderScriptSectionsProps, ScriptSection, SectionLabel } from './LeaderScriptSections';
