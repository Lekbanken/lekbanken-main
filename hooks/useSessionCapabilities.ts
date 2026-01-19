/**
 * useSessionCapabilities Hook
 *
 * Provides capability-driven UI decisions for Play Mode.
 * Combines play_mode intent with actual game data to determine what UI elements to show.
 *
 * Key concepts:
 * - `viewType`: Determines which view layout to render (routing)
 * - `intent`: Original play_mode from the game (basic | facilitated | participants)
 * - `has*` flags: Data presence (e.g., hasPhases, hasRoles)
 * - `show*` flags: UI visibility decisions (e.g., showPhaseNavigation)
 *
 * Graceful degradation:
 * - participants mode without roles → basic view
 * - facilitated mode without phases → basic view
 *
 * @see PLAY_MODE_UI_AUDIT.md section 11.2 for full specification
 */

import { useMemo } from 'react';
import type { GameSnapshotData } from '@/types/game-snapshot';

// Artifact types that represent puzzles
const PUZZLE_TYPES = ['keypad', 'riddle', 'cipher', 'logic_grid', 'matching'] as const;

export type ViewType = 'basic' | 'facilitated' | 'participants';

/** Tool configuration from session */
export type ToolConfig = { tool_key: string; enabled?: boolean; scope?: string };

export interface SessionCapabilities {
  // Routing decision
  viewType: ViewType;

  // Original intent from play_mode
  intent: ViewType;

  // Data-based capability flags
  hasSteps: boolean;
  hasPhases: boolean;
  hasRoles: boolean;
  hasArtifacts: boolean;
  hasTriggers: boolean;
  hasTools: boolean;
  hasBoard: boolean;
  hasPuzzles: boolean;
  hasProps: boolean;

  // UI visibility decisions (show* flags)
  showPhaseNavigation: boolean;
  showRoleAssigner: boolean;
  showTriggersPanel: boolean;
  showDirectorMode: boolean;
  showToolbelt: boolean;
  showArtifactsPanel: boolean;
  showDecisionsPanel: boolean;
  showOutcomePanel: boolean;
  showBoardToggle: boolean;
  showChat: boolean;
  showPuzzlesPanel: boolean;
  showPropsManager: boolean;

  // Dynamic tabs configuration
  visibleTabs: ('play' | 'content' | 'manage')[];
  contentSubTabs: string[];
  manageSubTabs: string[];
}

/**
 * Hook that analyzes game snapshot data and returns capability-driven UI decisions.
 *
 * @param snapshot - The game snapshot data from the session, or null if not loaded
 * @param tools - Optional tools configuration from the session
 * @returns SessionCapabilities object with routing and UI visibility decisions
 */
export function useSessionCapabilities(
  snapshot: GameSnapshotData | null,
  tools?: ToolConfig[]
): SessionCapabilities {
  return useMemo(() => {
    if (!snapshot) {
      return getDefaultCapabilities();
    }

    // Extract intent from game's play_mode
    const intent = (snapshot.game.play_mode ?? 'basic') as ViewType;

    // Detect data presence (has* flags)
    const hasSteps = (snapshot.steps?.length ?? 0) > 0;
    const hasPhases = (snapshot.phases?.length ?? 0) > 0;
    const hasRoles = (snapshot.roles?.length ?? 0) > 0;
    const hasArtifacts = (snapshot.artifacts?.length ?? 0) > 0;
    const hasTriggers = (snapshot.triggers?.length ?? 0) > 0;
    const hasTools = (tools?.length ?? 0) > 0;
    const hasBoard = snapshot.board_config !== null;

    // Detect specific artifact types
    const hasPuzzles =
      snapshot.artifacts?.some((a) =>
        PUZZLE_TYPES.includes(a.artifact_type as (typeof PUZZLE_TYPES)[number])
      ) ?? false;
    const hasProps =
      snapshot.artifacts?.some((a) => a.artifact_type === 'prop') ?? false;

    // Determine viewType with graceful degradation
    const viewType = determineViewType(intent, { hasPhases, hasRoles });

    // Calculate UI visibility (show* flags)
    const isAdvanced = viewType !== 'basic';

    const showPhaseNavigation = hasPhases && isAdvanced;
    const showRoleAssigner = hasRoles && viewType === 'participants';
    const showTriggersPanel = hasTriggers && isAdvanced;
    const showDirectorMode = hasTriggers && isAdvanced;
    const showToolbelt = hasTools;
    const showArtifactsPanel = hasArtifacts;
    const showDecisionsPanel = isAdvanced;
    const showOutcomePanel = isAdvanced;
    const showBoardToggle = hasBoard && isAdvanced;
    const showChat = isAdvanced;
    const showPuzzlesPanel = hasPuzzles;
    const showPropsManager = hasProps;

    // Build dynamic tabs
    const visibleTabs = buildVisibleTabs(viewType, {
      hasArtifacts,
      hasTriggers,
      hasRoles,
      hasPuzzles,
    });
    const contentSubTabs = buildContentSubTabs({
      hasArtifacts,
      hasPuzzles,
      isAdvanced,
    });
    const manageSubTabs = buildManageSubTabs(viewType, {
      hasRoles,
      hasTriggers,
    });

    return {
      viewType,
      intent,
      hasSteps,
      hasPhases,
      hasRoles,
      hasArtifacts,
      hasTriggers,
      hasTools,
      hasBoard,
      hasPuzzles,
      hasProps,
      showPhaseNavigation,
      showRoleAssigner,
      showTriggersPanel,
      showDirectorMode,
      showToolbelt,
      showArtifactsPanel,
      showDecisionsPanel,
      showOutcomePanel,
      showBoardToggle,
      showChat,
      showPuzzlesPanel,
      showPropsManager,
      visibleTabs,
      contentSubTabs,
      manageSubTabs,
    };
  }, [snapshot, tools]);
}

/**
 * Determines the view type with graceful degradation.
 *
 * - participants without roles → basic
 * - facilitated without phases → basic
 */
function determineViewType(
  intent: ViewType,
  caps: { hasPhases: boolean; hasRoles: boolean }
): ViewType {
  if (intent === 'participants') {
    return caps.hasRoles ? 'participants' : 'basic';
  }
  if (intent === 'facilitated') {
    return caps.hasPhases ? 'facilitated' : 'basic';
  }
  return 'basic';
}

/**
 * Returns default capabilities when snapshot is not available.
 */
function getDefaultCapabilities(): SessionCapabilities {
  return {
    viewType: 'basic',
    intent: 'basic',
    hasSteps: false,
    hasPhases: false,
    hasRoles: false,
    hasArtifacts: false,
    hasTriggers: false,
    hasTools: false,
    hasBoard: false,
    hasPuzzles: false,
    hasProps: false,
    showPhaseNavigation: false,
    showRoleAssigner: false,
    showTriggersPanel: false,
    showDirectorMode: false,
    showToolbelt: false,
    showArtifactsPanel: false,
    showDecisionsPanel: false,
    showOutcomePanel: false,
    showBoardToggle: false,
    showChat: false,
    showPuzzlesPanel: false,
    showPropsManager: false,
    visibleTabs: ['play'],
    contentSubTabs: [],
    manageSubTabs: ['settings'],
  };
}

/**
 * Builds the list of visible main tabs based on capabilities.
 */
function buildVisibleTabs(
  viewType: ViewType,
  caps: {
    hasArtifacts: boolean;
    hasTriggers: boolean;
    hasRoles: boolean;
    hasPuzzles: boolean;
  }
): ('play' | 'content' | 'manage')[] {
  const tabs: ('play' | 'content' | 'manage')[] = ['play'];

  // Content tab if there's content to show
  if (caps.hasArtifacts || caps.hasPuzzles) {
    tabs.push('content');
  }

  // Manage tab for advanced modes or if there's management content
  if (viewType !== 'basic' || caps.hasTriggers || caps.hasRoles) {
    tabs.push('manage');
  }

  return tabs;
}

/**
 * Builds content sub-tabs based on available content types.
 */
function buildContentSubTabs(caps: {
  hasArtifacts: boolean;
  hasPuzzles: boolean;
  isAdvanced: boolean;
}): string[] {
  const tabs: string[] = [];
  if (caps.hasArtifacts) tabs.push('artifacts');
  if (caps.hasPuzzles) tabs.push('puzzles');
  if (caps.isAdvanced) {
    tabs.push('decisions', 'outcome');
  }
  return tabs;
}

/**
 * Builds manage sub-tabs based on available management features.
 */
function buildManageSubTabs(
  viewType: ViewType,
  caps: { hasRoles: boolean; hasTriggers: boolean }
): string[] {
  const tabs: string[] = [];
  if (caps.hasRoles && viewType === 'participants') tabs.push('roles');
  if (caps.hasTriggers) tabs.push('triggers');
  tabs.push('settings');
  return tabs;
}
