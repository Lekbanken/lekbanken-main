/**
 * Game → Cockpit Type Mappers
 *
 * Converts game-definition types (GameStep, GameArtifact, GameTrigger, etc.)
 * to cockpit types (CockpitStep, CockpitArtifact, CockpitTrigger, etc.)
 * used by the Director Mode panel.
 *
 * Used by the Director Preview page so it can render the same UI
 * that the live session uses, without requiring a session.
 */

import type { GameStep, GamePhase, GameArtifact, GameTrigger } from '@/lib/game-display/types';
import type {
  CockpitStep,
  CockpitPhase,
  CockpitTrigger,
  CockpitArtifact,
  ArtifactState,
} from '@/types/session-cockpit';

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

export function mapGameStepsToCockpit(steps: GameStep[] | undefined): CockpitStep[] {
  if (!steps?.length) return [];
  return steps.map((s, i) => ({
    id: s.id ?? `step-${i}`,
    title: s.title,
    description: s.body ?? undefined,
    stepOrder: i,
    durationMinutes: s.durationMinutes ?? undefined,
    leaderScript: s.leaderScript ?? undefined,
    participantPrompt: s.participantPrompt ?? undefined,
    boardText: s.boardText ?? undefined,
    phaseId: s.phaseId ?? undefined,
  }));
}

// -----------------------------------------------------------------------------
// Phases
// -----------------------------------------------------------------------------

export function mapGamePhasesToCockpit(phases: GamePhase[] | undefined): CockpitPhase[] {
  if (!phases?.length) return [];
  return phases.map((p, i) => ({
    id: p.id ?? `phase-${i}`,
    name: p.name ?? p.title,
    description: p.description ?? undefined,
    phaseOrder: i,
    phaseType: p.phaseType ?? 'round',
  }));
}

// -----------------------------------------------------------------------------
// Artifacts
// -----------------------------------------------------------------------------

export function mapGameArtifactsToCockpit(
  artifacts: GameArtifact[] | undefined,
): { artifacts: CockpitArtifact[]; artifactStates: Record<string, ArtifactState> } {
  if (!artifacts?.length) return { artifacts: [], artifactStates: {} };

  const cockpitArtifacts: CockpitArtifact[] = [];
  const states: Record<string, ArtifactState> = {};

  artifacts.forEach((a, i) => {
    const id = a.id ?? `artifact-${i}`;
    cockpitArtifacts.push({
      id,
      title: a.title,
      description: a.description ?? undefined,
      artifactType: (a.type as CockpitArtifact['artifactType']) ?? 'document',
      artifactOrder: i,
      metadata: {},
      primaryVariantId: null, // No variant data in preview context
    });
    states[id] = {
      artifactId: id,
      status: 'hidden',
      isRevealed: false,
      isHighlighted: false,
      isLocked: false,
      isSolved: false,
      attemptCount: 0,
      maxAttempts: undefined,
      progress: 0,
      solvedAt: undefined,
      solvedBy: undefined,
      metadata: {},
    };
  });

  return { artifacts: cockpitArtifacts, artifactStates: states };
}

// -----------------------------------------------------------------------------
// Triggers
// -----------------------------------------------------------------------------

export function mapGameTriggersToCockpit(triggers: GameTrigger[] | undefined): CockpitTrigger[] {
  if (!triggers?.length) return [];
  return triggers.map((t, i) => {
    const conditionObj = typeof t.condition === 'string'
      ? { type: t.condition }
      : (t.condition as Record<string, unknown>) ?? {};
    return {
      id: t.id ?? `trigger-${i}`,
      name: t.name ?? t.title,
      description: t.description ?? undefined,
      enabled: t.enabled ?? true,
      status: 'armed' as const,
      executeOnce: t.executeOnce ?? false,
      firedCount: 0,
      lastFiredAt: undefined,
      delaySeconds: t.delaySeconds ?? undefined,
      conditionType: (conditionObj.type as string) ?? 'unknown',
      condition: conditionObj,
      actions: (t.actions as Array<Record<string, unknown>>) ?? [],
      conditionSummary: typeof t.condition === 'string' ? t.condition : JSON.stringify(t.condition),
      actionSummary: t.effect,
    };
  });
}
