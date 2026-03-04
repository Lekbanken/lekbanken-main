/**
 * PlanSnapshot — normalised "playable plan" object.
 *
 * Single Source of Truth for all consumers that need to know
 * "what does this plan look like right now?":
 *   • /api/play/[planId]/start  (generate run steps)
 *   • StepSaveAndRun preview    (inline block list)
 *   • /api/play/runs/active     (totalSteps / stats)
 *   • plan-list cards           (blockCount, totalTime)
 *
 * Server-only — lives under `server/` to prevent accidental client import.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Block & Game types (source-agnostic)
// ═══════════════════════════════════════════════════════════════════════════════

export type GameInstruction = {
  title: string
  description?: string | null
  durationMinutes?: number | null
}

export type GameSnapshot = {
  id: string
  title: string
  shortDescription?: string | null
  durationMinutes?: number | null
  instructions?: GameInstruction[] | null
  materials?: string[] | null
  coverUrl?: string | null
  energyLevel?: string | null
  locationType?: string | null
  playMode?: string | null
}

/** A block normalised from either `plan_blocks` (draft) or `plan_version_blocks` (published). */
export type NormalizedBlock = {
  id: string
  position: number
  blockType: 'game' | 'pause' | 'preparation' | 'custom' | 'section' | 'session_game'
  durationMinutes: number
  title: string | null
  notes: string | null
  isOptional: boolean
  gameSnapshot: GameSnapshot | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generated step (identical to RunStep but without run-specific fields)
// ═══════════════════════════════════════════════════════════════════════════════

export type SessionSpec = {
  gameId: string
  autoCreate: boolean
}

export type GeneratedStep = {
  id: string
  index: number
  blockId: string
  blockType: 'game' | 'pause' | 'preparation' | 'custom' | 'session_game'
  title: string
  description: string
  durationMinutes: number
  materials?: string[]
  tag?: string
  note?: string
  /** True if this step requires a participant session to be created */
  requiresSession: boolean
  /** Session configuration — present when requiresSession is true */
  sessionSpec?: SessionSpec
  gameSnapshot?: {
    id: string
    title: string
    shortDescription?: string | null
  } | null
}

// ═══════════════════════════════════════════════════════════════════════════════
// PlanSnapshot — the top-level output
// ═══════════════════════════════════════════════════════════════════════════════

export type PlanSnapshot = {
  plan: {
    id: string
    name: string
    description: string | null
    status: string
    visibility: string
    ownerTenantId: string | null
  }
  /** Where the blocks came from */
  source: 'draft_blocks' | 'published_version'
  /** Normalised blocks (includes section blocks) */
  blocks: NormalizedBlock[]
  /** Playable steps generated from blocks (excludes section blocks) */
  steps: GeneratedStep[]
  stats: {
    totalSteps: number
    totalTimeMinutes: number
    blockCount: number
  }
  version: {
    id: string
    versionNumber: number
    name: string | null
    totalTimeMinutes: number | null
  } | null
}

/** Preference for which block source to use */
export type SnapshotPreference = 'published' | 'draft' | 'auto'
