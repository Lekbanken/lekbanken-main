/**
 * Game Snapshot Types and Utilities
 *
 * Provides immutable versioned snapshots of games for session playback.
 * Ensures that changes to a game don't affect running sessions.
 */

import type { PlayMode } from '@/types/games';

// =============================================================================
// Snapshot Data Types
// =============================================================================

/** Snapshot of a game step */
export type SnapshotStep = {
  step_order: number;
  title: string;
  body: string;
  duration_seconds: number | null;
  leader_script: string | null;
  participant_prompt: string | null;
  board_text: string | null;
  optional: boolean;
};

/** Snapshot of a game phase */
export type SnapshotPhase = {
  phase_order: number;
  name: string;
  phase_type: string;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: string;
  description: string | null;
  board_message: string | null;
  auto_advance: boolean;
};

/** Snapshot of a game role */
export type SnapshotRole = {
  role_order: number;
  name: string;
  icon: string | null;
  color: string | null;
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
  min_count: number;
  max_count: number | null;
  assignment_strategy: string;
  scaling_rules: Record<string, unknown> | null;
  conflicts_with: string[];
};

/** Snapshot of a game artifact */
export type SnapshotArtifact = {
  artifact_order: number;
  title: string;
  description: string | null;
  artifact_type: string;
  locale: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
};

/** Snapshot of a game trigger */
export type SnapshotTrigger = {
  sort_order: number;
  name: string;
  description: string | null;
  enabled: boolean;
  condition_type: string;
  condition_config: Record<string, unknown>;
  actions: Record<string, unknown>[];
  execute_once: boolean;
  delay_seconds: number;
};

/** Snapshot of board config */
export type SnapshotBoardConfig = {
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string | null;
  theme: string;
  background_color: string | null;
  layout_variant: string;
};

/** Core game data in snapshot */
export type SnapshotGame = {
  id: string;
  game_key: string;
  name: string;
  short_description: string;
  description: string | null;
  play_mode: PlayMode;
  status: 'draft' | 'published';
  locale: string | null;
  energy_level: string | null;
  location_type: string | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  players_recommended: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string | null;
  space_requirements: string | null;
  leader_tips: string | null;
  main_purpose_id: string | null;
  product_id: string | null;
  owner_tenant_id: string | null;
  cover_media_id: string | null;
};

/** Complete snapshot data structure */
export type GameSnapshotData = {
  game: SnapshotGame;
  steps: SnapshotStep[];
  phases: SnapshotPhase[];
  roles: SnapshotRole[];
  artifacts: SnapshotArtifact[];
  triggers: SnapshotTrigger[];
  board_config: SnapshotBoardConfig | null;
  snapshot_meta: {
    created_at: string;
    game_id: string;
    version: number;
  };
};

/** Game snapshot record from database */
export type GameSnapshot = {
  id: string;
  game_id: string;
  version: number;
  version_label: string | null;
  snapshot_data: GameSnapshotData;
  includes_steps: boolean;
  includes_phases: boolean;
  includes_roles: boolean;
  includes_artifacts: boolean;
  includes_triggers: boolean;
  includes_board_config: boolean;
  checksum: string | null;
  created_by: string | null;
  created_at: string;
};

/** Summary of a snapshot (without full data) */
export type GameSnapshotSummary = Omit<GameSnapshot, 'snapshot_data'> & {
  step_count: number;
  phase_count: number;
  role_count: number;
  artifact_count: number;
  trigger_count: number;
};

// =============================================================================
// API Types
// =============================================================================

export type CreateSnapshotRequest = {
  gameId: string;
  versionLabel?: string;
};

export type CreateSnapshotResponse = {
  snapshotId: string;
  version: number;
};

export type CreateSessionWithSnapshotRequest = {
  gameId: string;
  joinCode?: string;
  settings?: Record<string, unknown>;
};

export type CreateSessionWithSnapshotResponse = {
  sessionId: string;
  snapshotId: string;
  joinCode: string;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract step count from snapshot data
 */
export function getSnapshotStepCount(snapshot: GameSnapshotData): number {
  return snapshot.steps?.length ?? 0;
}

/**
 * Extract phase count from snapshot data
 */
export function getSnapshotPhaseCount(snapshot: GameSnapshotData): number {
  return snapshot.phases?.length ?? 0;
}

/**
 * Check if snapshot includes facilitated play features
 */
export function isSnapshotFacilitated(snapshot: GameSnapshotData): boolean {
  return (
    snapshot.game.play_mode === 'facilitated' ||
    snapshot.game.play_mode === 'participants'
  );
}

/**
 * Get a summary of what's included in the snapshot
 */
export function getSnapshotSummary(snapshot: GameSnapshotData): {
  steps: number;
  phases: number;
  roles: number;
  artifacts: number;
  triggers: number;
  hasBoard: boolean;
} {
  return {
    steps: snapshot.steps?.length ?? 0,
    phases: snapshot.phases?.length ?? 0,
    roles: snapshot.roles?.length ?? 0,
    artifacts: snapshot.artifacts?.length ?? 0,
    triggers: snapshot.triggers?.length ?? 0,
    hasBoard: snapshot.board_config !== null,
  };
}

/**
 * Format version label for display
 */
export function formatSnapshotVersion(
  version: number,
  label?: string | null
): string {
  if (label) {
    return `v${version} – ${label}`;
  }
  return `v${version}`;
}

/**
 * Compare two snapshots and return what changed
 */
export function diffSnapshots(
  older: GameSnapshotData,
  newer: GameSnapshotData
): {
  gameChanged: boolean;
  stepsChanged: boolean;
  phasesChanged: boolean;
  rolesChanged: boolean;
  artifactsChanged: boolean;
  triggersChanged: boolean;
  boardChanged: boolean;
} {
  return {
    gameChanged: JSON.stringify(older.game) !== JSON.stringify(newer.game),
    stepsChanged: JSON.stringify(older.steps) !== JSON.stringify(newer.steps),
    phasesChanged: JSON.stringify(older.phases) !== JSON.stringify(newer.phases),
    rolesChanged: JSON.stringify(older.roles) !== JSON.stringify(newer.roles),
    artifactsChanged: JSON.stringify(older.artifacts) !== JSON.stringify(newer.artifacts),
    triggersChanged: JSON.stringify(older.triggers) !== JSON.stringify(newer.triggers),
    boardChanged: JSON.stringify(older.board_config) !== JSON.stringify(newer.board_config),
  };
}
