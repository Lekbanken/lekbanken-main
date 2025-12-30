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
 */
export type RunStep = {
  id: string;
  index: number;
  blockId: string;
  blockType: 'game' | 'pause' | 'preparation' | 'custom';
  title: string;
  description: string;
  durationMinutes: number;
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
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
};

/**
 * API response when fetching an existing run.
 */
export type FetchRunResponse = {
  run: Run;
  progress: RunProgress | null;
};
