/**
 * Step — Content fields for a play step.
 *
 * Represents the displayable content of a single step in a game or plan run.
 * Conceptually related to GameStep in the display domain, but uses
 * play-specific field names (description vs body, materials as string[]).
 *
 * @see GameStep in lib/game-display/types.ts for the display-domain equivalent
 * @see RunStep below which extends Step with execution-specific fields
 */
export type Step = {
  id: string;
  title: string;
  description: string;
  durationMinutes?: number;
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
};

/**
 * GameRun — Legacy play representation of a single game.
 *
 * @see GameDetailData in lib/game-display/types.ts for the display-domain equivalent
 */
export type GameRun = {
  id: string;
  title: string;
  summary: string;
  steps: Step[];
  environment?: string;
  groupSize?: string;
  ageRange?: string;
};

// ============================================
// Play Domain Types (Run Model)
// ============================================

export type RunStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';

/**
 * A Run represents an active playthrough of a published plan version.
 * The server generates the steps from version blocks at start time.
 */
export type Run = {
  id: string;
  planId: string;
  planVersionId: string;
  versionNumber: number;
  name: string;
  status: RunStatus;
  steps: RunStep[];
  blockCount: number;
  totalDurationMinutes: number;
  currentStepIndex: number;
  startedAt: string;
  completedAt?: string | null;
};

/**
 * A single step in a Run, derived from version blocks.
 * Steps are generated server-side and frozen at run start.
 *
 * Extends Step with execution-specific fields (index, blockId, blockType)
 * and optional session configuration for participant games.
 */
export type RunStep = Step & {
  /** Override: durationMinutes is required in a RunStep (always resolved) */
  durationMinutes: number;
  /** Position in the run's step sequence (0-based) */
  index: number;
  /** Reference to the source plan version block */
  blockId: string;
  /** Type of the source block */
  blockType: 'game' | 'pause' | 'preparation' | 'custom' | 'section' | 'session_game';
  /** True if this step requires a participant session */
  requiresSession?: boolean;
  /** Session configuration — present when requiresSession is true */
  sessionSpec?: {
    gameId: string;
    autoCreate: boolean;
  };
  gameSnapshot?: {
    id: string;
    title: string;
    shortDescription?: string | null;
  } | null;
};

/**
 * Progress state for a Run, saved periodically.
 */
export type RunProgress = {
  runId: string;
  currentStepIndex: number;
  status: RunStatus;
  timerRemaining?: number;
  timerTotal?: number;
  isTimerRunning?: boolean;
  updatedAt: string;
};

/**
 * API response when starting a new run.
 */
export type StartRunResponse = {
  run: Run;
  /** True if an existing in_progress run was returned instead of creating new */
  resumed?: boolean;
  resumeReason?: 'active_run_exists';
  resumeMeta?: {
    currentStep: number;
    totalSteps: number;
    versionNumber: number;
    startedAt: string;
  };
};

/**
 * API response when fetching an existing run.
 */
export type FetchRunResponse = {
  run: Run;
  progress: RunProgress | null;
};

// ============================================
// Dashboard Types (MS7)
// ============================================

/**
 * A row in the Active Sessions Dashboard.
 * Combines run, session, and plan data into a single DTO
 * for the `/app/play/sessions` dashboard view.
 */
export type DashboardRunRow = {
  /** run id */
  id: string;
  planId: string;
  planName: string;
  runStatus: RunStatus;
  currentStepIndex: number;
  totalSteps: number;
  startedAt: string;
  lastHeartbeatAt: string | null;
  /** true if heartbeat is older than stale threshold */
  isStale: boolean;
  /** Session-step info — non-null when the run has session_game steps */
  sessions: DashboardSessionInfo[];
};

/** Status of a run_session row (mirrors DB CHECK constraint). */
export type RunSessionStatus = 'created' | 'active' | 'completed' | 'ended' | 'abandoned';

/** Terminal states where no further action is possible. */
const TERMINAL_RUN_SESSION_STATUSES: ReadonlySet<RunSessionStatus> = new Set([
  'ended',
  'completed',
  'abandoned',
]);

/** Returns true if the run_session status is terminal (ended/completed/abandoned). */
export function isTerminalRunSessionStatus(status: string): boolean {
  return TERMINAL_RUN_SESSION_STATUSES.has(status as RunSessionStatus);
}

export type DashboardSessionInfo = {
  runSessionId: string;
  stepIndex: number;
  /** Status of the run_session row */
  runSessionStatus: RunSessionStatus;
  /** Linked participant_session (null if auto-create failed or not yet created) */
  participantSession: {
    id: string;
    sessionCode: string;
    displayName: string;
    status: string;
    participantCount: number;
  } | null;
};
