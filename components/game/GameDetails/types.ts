/**
 * GameDetails Component Types
 *
 * Internal types for GameDetails components.
 * All components consume GameDetailData from lib/game-display.
 */

import type { GameDetailData } from '@/lib/game-display';

/**
 * Common props for all GameDetail section components
 */
export interface GameDetailSectionProps {
  /** The game data to display */
  game: GameDetailData;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Props for GameDetailHeader
 */
export interface GameDetailHeaderProps extends GameDetailSectionProps {
  /** Back link configuration */
  backLink?: {
    href: string;
    label: string;
  };
  /** Optional label above title (e.g., "LEK") */
  label?: string;
}

/**
 * Props for GameDetailBadges
 */
export interface GameDetailBadgesProps extends GameDetailSectionProps {
  /** Show compact badges (no icons) */
  compact?: boolean;
}

/**
 * Props for GameDetailSteps
 */
export interface GameDetailStepsProps extends GameDetailSectionProps {
  /** Collapsible mode - show expand/collapse */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Max steps to show before "show more" */
  maxVisible?: number;
  /** Section labels */
  labels?: {
    title?: string;
    hide?: string;
    showAll?: string;
    showLess?: string;
    steps?: string;
    approxMinutes?: string;
    optional?: string;
  };
}

/**
 * Props for GameDetailAbout
 */
export interface GameDetailAboutProps extends GameDetailSectionProps {
  /** Truncate long descriptions */
  truncate?: boolean;
  /** Max characters before truncation */
  maxLength?: number;
  /** Section labels */
  labels?: {
    title?: string;
    highlights?: string;
  };
}

/**
 * Section wrapper component props
 */
export interface GameDetailSectionWrapperProps {
  /** Section title */
  title: string;
  /** Section content */
  children: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Props for GameDetailMaterials
 */
export interface GameDetailMaterialsProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    noMaterials?: string;
  };
}

/**
 * Props for GameDetailSafety
 */
export interface GameDetailSafetyProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
  };
}

/**
 * Props for GameDetailPreparation
 */
export interface GameDetailPreparationProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
  };
}

/**
 * Props for GameDetailPhases
 */
export interface GameDetailPhasesProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    goal?: string;
    duration?: string;
  };
}

/**
 * Props for GameDetailGallery
 */
export interface GameDetailGalleryProps extends GameDetailSectionProps {
  /** Raw gallery items from DB (with media relation) */
  galleryItems?: Array<{
    id: string;
    media?: {
      url?: string;
      alt_text?: string;
    } | null;
  }>;
  /** Section labels */
  labels?: {
    title?: string;
  };
}

/**
 * Props for GameDetailRoles (lazy-loaded)
 */
export interface GameDetailRolesProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    loading?: string;
    error?: string;
    count?: string;
    publicNote?: string;
  };
}

/**
 * Props for GameDetailArtifacts (lazy-loaded)
 */
export interface GameDetailArtifactsProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    loading?: string;
    error?: string;
    description?: string;
    variants?: string;
    use?: string;
  };
}

/**
 * Props for GameDetailTriggers (lazy-loaded)
 */
export interface GameDetailTriggersProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    loading?: string;
    error?: string;
    condition?: string;
    effect?: string;
    executeOnce?: string;
    delay?: string;
  };
}

/**
 * Props for GameDetailQuickFacts
 */
export interface GameDetailQuickFactsProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    participants?: string;
    time?: string;
    age?: string;
    energy?: string;
    playersRange?: string;
    ageRange?: string;
    approxMinutes?: string;
  };
  /** Energy level labels */
  energyLabels?: {
    low?: string;
    medium?: string;
    high?: string;
  };
}

/**
 * Props for GameDetailActions
 */
export interface GameDetailActionsProps extends GameDetailSectionProps {
  /** Game ID for session start */
  gameId: string;
  /** Game name for display */
  gameName: string;
  /** Section labels */
  labels?: {
    share?: string;
    favorite?: string;
    shareTitle?: string;
  };
  /** Optional custom actions */
  customActions?: React.ReactNode;
}

/**
 * Props for GameDetailSidebar (composed)
 */
export interface GameDetailSidebarProps extends GameDetailSectionProps {
  /** Game ID for session start */
  gameId: string;
  /** Game name for display */
  gameName: string;
  /** Section labels */
  labels?: {
    quickInfoTitle?: string;
    status?: string;
    published?: string;
    draft?: string;
    addedAt?: string;
    shareTitle?: string;
    share?: string;
    favorite?: string;
  };
  /** Show start session CTA */
  showStartSession?: boolean;
  /** Custom children to render in sidebar */
  children?: React.ReactNode;
}

// =============================================================================
// P1 SECTION PROPS
// =============================================================================

/**
 * Props for GameDetailAccessibility
 */
export interface GameDetailAccessibilityProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
  };
}

/**
 * Props for GameDetailRequirements
 */
export interface GameDetailRequirementsProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
  };
}

/**
 * Props for GameDetailBoard
 */
export interface GameDetailBoardProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    description?: string;
  };
}

/**
 * Props for GameDetailTools
 */
export interface GameDetailToolsProps extends GameDetailSectionProps {
  /** Section labels */
  labels?: {
    title?: string;
    description?: string;
  };
}
