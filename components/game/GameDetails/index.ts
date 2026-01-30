/**
 * GameDetails Components
 *
 * Modular components for displaying game details.
 * All components consume GameDetailData from lib/game-display.
 *
 * USAGE:
 * ```tsx
 * import {
 *   GameDetailHeader,
 *   GameDetailBadges,
 *   GameDetailAbout,
 *   GameDetailSteps,
 * } from '@/components/game/GameDetails';
 * ```
 */

// =============================================================================
// COMPONENTS
// =============================================================================

export { GameDetailHeader } from './GameDetailHeader';
export { GameDetailBadges } from './GameDetailBadges';
export { GameDetailAbout } from './GameDetailAbout';
export { GameDetailSteps } from './GameDetailSteps';
export { GameDetailMaterials } from './GameDetailMaterials';
export { GameDetailSafety } from './GameDetailSafety';
export { GameDetailPreparation } from './GameDetailPreparation';
export { GameDetailPhases } from './GameDetailPhases';
export { GameDetailGallery } from './GameDetailGallery';
export { GameDetailRoles } from './GameDetailRoles';
export { GameDetailArtifacts } from './GameDetailArtifacts';
export { GameDetailTriggers } from './GameDetailTriggers';
export { GameDetailQuickFacts } from './GameDetailQuickFacts';
export { GameDetailActions } from './GameDetailActions';
export { GameDetailSidebar } from './GameDetailSidebar';

// P1 components
export { GameDetailAccessibility } from './GameDetailAccessibility';
export { GameDetailRequirements } from './GameDetailRequirements';
export { GameDetailBoard } from './GameDetailBoard';
export { GameDetailTools } from './GameDetailTools';

// Disabled section (for P2 without DB support)
export { DisabledSection } from './DisabledSection';
export type { DisabledSectionProps } from './DisabledSection';

// =============================================================================
// CONTEXT & CONFIG
// =============================================================================

export {
  GameDetailProvider,
  useGameDetail,
  useGameDetailMode,
  useGameDetailConfig,
  useIsLocked,
} from './GameDetailContext';

export {
  getSectionConfig,
  hasLazyLoadedSections,
  getVisibleSections,
  SECTION_VISIBILITY,
} from './config';

export type {
  GameDetailMode,
  SectionVisibility,
} from './config';

export type {
  GameDetailContextValue,
  GameDetailProviderProps,
} from './GameDetailContext';

// =============================================================================
// TYPES
// =============================================================================

export type {
  GameDetailSectionProps,
  GameDetailHeaderProps,
  GameDetailBadgesProps,
  GameDetailAboutProps,
  GameDetailStepsProps,
  GameDetailMaterialsProps,
  GameDetailSafetyProps,
  GameDetailPreparationProps,
  GameDetailPhasesProps,
  GameDetailGalleryProps,
  GameDetailRolesProps,
  GameDetailArtifactsProps,
  GameDetailTriggersProps,
  GameDetailQuickFactsProps,
  GameDetailActionsProps,
  GameDetailSidebarProps,
  GameDetailSectionWrapperProps,
  // P1 types
  GameDetailAccessibilityProps,
  GameDetailRequirementsProps,
  GameDetailBoardProps,
  GameDetailToolsProps,
} from './types';
