/**
 * useSessionState Hook
 * 
 * Unified state management for Session Cockpit.
 * Single source of truth for Lobby and Director Mode.
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type {
  SessionCockpitState,
  SessionCockpitActions,
  UseSessionStateReturn,
  SessionCockpitConfig,
  CockpitParticipant,
  CockpitTrigger,
  SessionEvent,
  Signal,
  SignalOutputType,
} from '@/types/session-cockpit';
import {
  DEFAULT_SIGNAL_CAPABILITIES,
  DEFAULT_TIMEBANK_RULES,
} from '@/types/session-cockpit';
import type { SessionRole } from '@/types/play-runtime';
import {
  getHostSession,
  getParticipants,
  updateSessionStatus,
} from '@/features/play-participant/api';
import { buildPreflightItems, type SessionChecklistState } from '@/features/play/components/PreflightChecklist';

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_STATE: SessionCockpitState = {
  sessionId: '',
  gameId: null,
  sessionCode: '',
  displayName: '',
  startedAt: null,
  pausedAt: null,
  endedAt: null,
  status: 'lobby',
  isDirectorMode: false,
  isLoading: true,
  error: null,
  lastSyncAt: null,
  participants: [],
  sessionRoles: [],
  roleAssignments: {},
  steps: [],
  phases: [],
  currentStepIndex: -1,
  currentPhaseIndex: -1,
  artifacts: [],
  artifactStates: {},
  triggers: [],
  signalCapabilities: DEFAULT_SIGNAL_CAPABILITIES,
  signalPresets: [],
  recentSignals: [],
  timeBankBalance: 0,
  timeBankLedger: [],
  timeBankRules: DEFAULT_TIMEBANK_RULES,
  timeBankPaused: false,
  secretsUnlockedAt: null,
  secretsRevealedBy: {},
  eventLog: [],
  safetyInfo: {},
  preflightItems: [],
  canStartDirectorMode: false,
};

// =============================================================================
// Helper: Build Preflight Items
// =============================================================================

function applyRoleAssignments(
  participants: CockpitParticipant[],
  roleAssignments: Record<string, string>,
  roles: SessionRole[],
): CockpitParticipant[] {
  return participants.map((participant) => {
    const assignedRoleId = roleAssignments[participant.id];
    const assignedRoleName = assignedRoleId
      ? roles.find((role) => role.id === assignedRoleId)?.name
      : undefined;

    return {
      ...participant,
      assignedRoleId,
      assignedRoleName,
    };
  });
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSessionState(config: SessionCockpitConfig): UseSessionStateReturn {
  const { sessionId, enableRealtime = true, pollInterval = 3000, onError } = config;
  const tPreflight = useTranslations('play.preflightChecklist');
  const tErrors = useTranslations('play.cockpit.errors');

  // Core state
  const [state, setState] = useState<SessionCockpitState>({
    ...DEFAULT_STATE,
    sessionId,
  });

  // Refs for cleanup
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  // Note: supabase client for realtime will be added in future iteration

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  const loadSession = useCallback(async () => {
    try {
      const { session } = await getHostSession(sessionId);
      
      const resolvedStatus: SessionCockpitState['status'] = (() => {
        if (session.status === 'paused') return 'paused';
        if (session.status === 'locked') return 'locked';
        if (session.status === 'ended' || session.status === 'archived' || session.status === 'cancelled') return 'ended';
        if (session.status === 'active' && !session.startedAt) return 'lobby';
        if (session.status === 'active' && session.startedAt) return 'active';
        return 'lobby';
      })();

      setState((prev) => ({
        ...prev,
        gameId: session.gameId ?? null,
        sessionCode: session.sessionCode,
        displayName: session.displayName,
        startedAt: session.startedAt ?? null,
        pausedAt: session.pausedAt ?? null,
        endedAt: session.endedAt ?? null,
        status: resolvedStatus,
        error: null,
      }));
    } catch (err) {
      const errorMessage = tErrors('loadSession');
      setState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [sessionId, onError, tErrors]);

  const loadParticipants = useCallback(async () => {
    try {
      const { participants } = await getParticipants(sessionId);
      
      // Map participant status to cockpit status
      const mapStatus = (status: string): CockpitParticipant['status'] => {
        switch (status) {
          case 'active': return 'active';
          case 'disconnected': return 'disconnected';
          case 'kicked': return 'kicked';
          case 'blocked': return 'left';
          case 'idle': return 'idle';
          default: return 'idle';
        }
      };
      
      const cockpitParticipants: CockpitParticipant[] = participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        status: mapStatus(p.status),
        role: p.role,
        position: (p as { position?: number | null }).position ?? null,
        isNextStarter: (p as { isNextStarter?: boolean }).isNextStarter ?? false,
        joinedAt: p.joinedAt ?? new Date().toISOString(),
        lastSeenAt: p.lastSeenAt,
      }));

      setState((prev) => ({
        ...prev,
        participants: applyRoleAssignments(
          cockpitParticipants,
          prev.roleAssignments,
          prev.sessionRoles,
        ),
      }));
    } catch (err) {
      console.warn('Failed to load participants:', err);
    }
  }, [sessionId]);

  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/roles`, { cache: 'no-store' });
      if (!res.ok) return;
      
      const data = await res.json();
      const roles: SessionRole[] = data.roles ?? [];

      setState((prev) => ({
        ...prev,
        sessionRoles: roles,
        participants: applyRoleAssignments(prev.participants, prev.roleAssignments, roles),
      }));
    } catch (err) {
      console.warn('Failed to load roles:', err);
    }
  }, [sessionId]);

  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/assignments`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const roleAssignments: Record<string, string> = {};

      (data.assignments ?? []).forEach((assignment: Record<string, unknown>) => {
        const participantId = assignment.participant_id as string | undefined;
        const roleId = assignment.session_role_id as string | undefined;
        if (participantId && roleId) {
          roleAssignments[participantId] = roleId;
        }
      });

      setState((prev) => ({
        ...prev,
        roleAssignments,
        participants: applyRoleAssignments(prev.participants, roleAssignments, prev.sessionRoles),
      }));
    } catch (err) {
      console.warn('Failed to load assignments:', err);
    }
  }, [sessionId]);

  const loadRuntimeState = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const session = (data as { session?: Record<string, unknown> }).session ?? {};
      const currentStepIndex = session.current_step_index as number | undefined;
      const currentPhaseIndex = session.current_phase_index as number | undefined;
      const rawStatus = session.status as string | undefined;
      const startedAt = session.started_at as string | null | undefined;

      // Resolve status using the same lobby-vs-active logic as loadSession
      // to avoid flickering between 'lobby' and 'active' during polling
      const resolvedStatus: SessionCockpitState['status'] | undefined = (() => {
        if (!rawStatus) return undefined;
        if (rawStatus === 'paused') return 'paused';
        if (rawStatus === 'locked') return 'locked';
        if (rawStatus === 'ended' || rawStatus === 'archived' || rawStatus === 'cancelled') return 'ended';
        if (rawStatus === 'active' && !startedAt) return 'lobby';
        if (rawStatus === 'active' && startedAt) return 'active';
        return 'lobby';
      })();

      setState((prev) => ({
        ...prev,
        currentStepIndex: Number.isFinite(currentStepIndex) ? (currentStepIndex as number) : prev.currentStepIndex,
        currentPhaseIndex: Number.isFinite(currentPhaseIndex) ? (currentPhaseIndex as number) : prev.currentPhaseIndex,
        status: resolvedStatus ?? prev.status,
        startedAt: startedAt ?? prev.startedAt,
        lastSyncAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('Failed to load runtime state:', err);
    }
  }, [sessionId]);

  const loadGameContent = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/game`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const steps = (data.steps ?? []).map((step: Record<string, unknown>) => ({
        id: step.id as string,
        title: step.title as string,
        description: (step.description as string | undefined) ?? undefined,
        stepOrder: (step.index as number | undefined) ?? 0,
        durationMinutes: (step.durationMinutes as number | undefined) ?? undefined,
        leaderScript: (step.leaderScript as string | undefined) ?? undefined,
        participantPrompt: (step.participantPrompt as string | undefined) ?? undefined,
        boardText: (step.boardText as string | undefined) ?? undefined,
      }));

      const phases = (data.phases ?? []).map((phase: Record<string, unknown>) => ({
        id: phase.id as string,
        name: phase.name as string,
        description: (phase.description as string | undefined) ?? undefined,
        phaseOrder: (phase.index as number | undefined) ?? 0,
        phaseType: 'round' as const,
      }));

      // Extract safety/inclusion info
      const safetyData = data.safety as Record<string, unknown> | undefined;
      const safetyInfo = {
        safetyNotes: (safetyData?.safetyNotes as string | undefined) ?? undefined,
        accessibilityNotes: (safetyData?.accessibilityNotes as string | undefined) ?? undefined,
        spaceRequirements: (safetyData?.spaceRequirements as string | undefined) ?? undefined,
        leaderTips: (safetyData?.leaderTips as string | undefined) ?? undefined,
      };

      setState((prev) => ({
        ...prev,
        steps,
        phases,
        safetyInfo,
      }));
    } catch (err) {
      console.warn('Failed to load game content:', err);
    }
  }, [sessionId]);

  const loadArtifacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const artifacts = (data.artifacts ?? []).map((artifact: Record<string, unknown>) => ({
        id: artifact.id as string,
        title: artifact.title as string,
        description: (artifact.description as string | undefined) ?? undefined,
        artifactType: (artifact.artifact_type as string | undefined) ?? 'unknown',
        artifactOrder: (artifact.artifact_order as number | undefined) ?? 0,
        metadata: (artifact.metadata as Record<string, unknown> | null) ?? null,
      }));

      setState((prev) => ({
        ...prev,
        artifacts,
      }));
    } catch (err) {
      console.warn('Failed to load artifacts:', err);
    }
  }, [sessionId]);

  const loadSignals = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/signals`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const recentSignals = (data.signals ?? []).map((signal: Record<string, unknown>) => {
        const senderUserId = signal.sender_user_id as string | null | undefined;
        const senderParticipantId = signal.sender_participant_id as string | null | undefined;

        return {
          id: signal.id as string,
          sessionId: signal.session_id as string,
          channel: signal.channel as string,
          payload: signal.payload,
          senderType: senderUserId ? 'host' : senderParticipantId ? 'participant' : 'system',
          senderUserId: senderUserId ?? undefined,
          senderParticipantId: senderParticipantId ?? undefined,
          createdAt: signal.created_at as string,
        };
      });

      setState((prev) => ({
        ...prev,
        recentSignals,
      }));
    } catch (err) {
      console.warn('Failed to load signals:', err);
    }
  }, [sessionId]);

  const loadTimeBank = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/time-bank`, { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();
      const balanceSeconds = data.timeBank?.balanceSeconds ?? 0;

      const timeBankLedger = (data.ledger ?? []).map((entry: Record<string, unknown>) => {
        const actorUserId = entry.actor_user_id as string | null | undefined;
        const actorParticipantId = entry.actor_participant_id as string | null | undefined;
        const actorType = actorParticipantId ? 'participant' : actorUserId ? 'host' : 'system';

        return {
          id: entry.id as string,
          sessionId: entry.session_id as string,
          deltaSeconds: entry.delta_seconds as number,
          reason: entry.reason as string,
          balance: balanceSeconds,
          actorType,
          actorUserId: actorUserId ?? undefined,
          actorParticipantId: actorParticipantId ?? undefined,
          createdAt: entry.created_at as string,
        };
      });

      setState((prev) => ({
        ...prev,
        timeBankBalance: balanceSeconds,
        timeBankLedger,
      }));
    } catch (err) {
      console.warn('Failed to load time bank:', err);
    }
  }, [sessionId]);

  const loadTriggers = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers`, { cache: 'no-store' });
      if (!res.ok) return;
      
      const data = await res.json();
      const triggers = (data.triggers ?? []).map((t: Record<string, unknown>): CockpitTrigger => ({
        id: t.id as string,
        name: t.name as string,
        description: t.description as string | undefined,
        enabled: t.enabled as boolean,
        status: (t.status as CockpitTrigger['status']) ?? 'armed',
        executeOnce: t.execute_once as boolean ?? true,
        firedCount: t.fired_count as number ?? 0,
        lastFiredAt: t.fired_at as string | undefined,
        lastError: t.last_error as string | undefined,
        conditionSummary: formatCondition(t.condition as Record<string, unknown>),
        actionSummary: formatActions(t.actions as Record<string, unknown>[]),
      }));

      setState((prev) => ({
        ...prev,
        triggers,
      }));
    } catch (err) {
      console.warn('Failed to load triggers:', err);
    }
  }, [sessionId]);

  const loadSecrets = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/secrets`, { cache: 'no-store' });
      if (!res.ok) return;
      
      const data = await res.json();
      const revealedCount = data.stats?.revealed_count ?? 0;
      const secretsRevealedBy: Record<string, string> = {};
      for (let i = 0; i < revealedCount; i += 1) {
        secretsRevealedBy[`revealed-${i}`] = new Date().toISOString();
      }
      
      // Build revealed map from stats if available
      setState((prev) => ({
        ...prev,
        secretsUnlockedAt: data.session?.secret_instructions_unlocked_at ?? null,
        secretsRevealedBy,
      }));
    } catch (err) {
      console.warn('Failed to load secrets:', err);
    }
  }, [sessionId]);

  // Combined load all
  const loadAll = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    await Promise.all([
      loadSession(),
      loadRuntimeState(),
      loadGameContent(),
      loadParticipants(),
      loadRoles(),
      loadAssignments(),
      loadTriggers(),
      loadArtifacts(),
      loadSignals(),
      loadTimeBank(),
      loadSecrets(),
    ]);

    setState((prev) => ({ ...prev, isLoading: false }));
  }, [
    loadSession,
    loadRuntimeState,
    loadGameContent,
    loadParticipants,
    loadRoles,
    loadAssignments,
    loadTriggers,
    loadArtifacts,
    loadSignals,
    loadTimeBank,
    loadSecrets,
  ]);

  // ==========================================================================
  // Actions
  // ==========================================================================

  const enterDirectorMode = useCallback(() => {
    setState((prev) => ({ ...prev, isDirectorMode: true }));
  }, []);

  const exitDirectorMode = useCallback(() => {
    setState((prev) => ({ ...prev, isDirectorMode: false }));
  }, []);

  const startSession = useCallback(async () => {
    try {
      await updateSessionStatus(sessionId, 'start');
      setState((prev) => ({ ...prev, status: 'active' }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to start session'));
    }
  }, [sessionId, onError]);

  const pauseSession = useCallback(async () => {
    try {
      await updateSessionStatus(sessionId, 'pause');
      setState((prev) => ({ ...prev, status: 'paused' }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to pause session'));
    }
  }, [sessionId, onError]);

  const resumeSession = useCallback(async () => {
    try {
      await updateSessionStatus(sessionId, 'resume');
      setState((prev) => ({ ...prev, status: 'active' }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to resume session'));
    }
  }, [sessionId, onError]);

  const endSession = useCallback(async () => {
    try {
      await updateSessionStatus(sessionId, 'end');
      setState((prev) => ({ ...prev, status: 'ended' }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to end session'));
    }
  }, [sessionId, onError]);

  const goToStep = useCallback(async (stepIndex: number) => {
    if (stepIndex < 0) return;
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_step', step_index: stepIndex }),
      });

      if (!res.ok) throw new Error('Failed to update step');

      setState((prev) => ({ ...prev, currentStepIndex: stepIndex }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to update step'));
    }
  }, [sessionId, onError]);

  const goToPhase = useCallback(async (phaseIndex: number) => {
    if (phaseIndex < 0) return;
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_phase', phase_index: phaseIndex }),
      });

      if (!res.ok) throw new Error('Failed to update phase');

      setState((prev) => ({ ...prev, currentPhaseIndex: phaseIndex }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to update phase'));
    }
  }, [sessionId, onError]);

  const nextStep = useCallback(async () => {
    if (state.steps.length === 0) return;
    const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);
    if (nextIndex < 0) return;
    await goToStep(nextIndex);
  }, [goToStep, state.currentStepIndex, state.steps.length]);

  const previousStep = useCallback(async () => {
    if (state.steps.length === 0) return;
    const prevIndex = Math.max(state.currentStepIndex - 1, 0);
    await goToStep(prevIndex);
  }, [goToStep, state.currentStepIndex, state.steps.length]);

  const assignRole = useCallback(async (participantId: string, roleId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: [{ participantId, roleId }],
        }),
      });
      
      if (!res.ok) throw new Error('Failed to assign role');
      
      setState((prev) => {
        const roleAssignments = { ...prev.roleAssignments, [participantId]: roleId };
        return {
          ...prev,
          roleAssignments,
          participants: applyRoleAssignments(prev.participants, roleAssignments, prev.sessionRoles),
        };
      });
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to assign role'));
    }
  }, [sessionId, onError]);

  const unassignRole = useCallback(async (participantId: string) => {
    try {
      const roleId = state.roleAssignments[participantId];
      if (!roleId) return;

      const deleteRes = await fetch(`/api/play/sessions/${sessionId}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, roleId }),
      });

      if (!deleteRes.ok) throw new Error('Failed to unassign role');

      setState((prev) => {
        const { [participantId]: _, ...rest } = prev.roleAssignments;
        return {
          ...prev,
          roleAssignments: rest,
          participants: applyRoleAssignments(prev.participants, rest, prev.sessionRoles),
        };
      });
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to unassign role'));
    }
  }, [sessionId, onError, state.roleAssignments]);

  const randomizeRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/roles/randomize`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to randomize roles');
      
      await loadRoles();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to randomize roles'));
    }
  }, [sessionId, loadRoles, onError]);

  const snapshotRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok && res.status !== 409) throw new Error('Failed to snapshot roles');

      await loadRoles();
      await loadAssignments();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to snapshot roles'));
    }
  }, [sessionId, loadRoles, loadAssignments, onError]);

  const unlockSecrets = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      });
      
      if (!res.ok) throw new Error('Failed to unlock secrets');

      const data = await res.json().catch(() => ({}));
      setState((prev) => ({
        ...prev,
        secretsUnlockedAt: data.session?.secret_instructions_unlocked_at ?? new Date().toISOString(),
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to unlock secrets'));
    }
  }, [sessionId, onError]);

  const relockSecrets = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'relock' }),
      });
      
      if (!res.ok) throw new Error('Failed to relock secrets');
      
      setState((prev) => ({
        ...prev,
        secretsUnlockedAt: null,
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to relock secrets'));
    }
  }, [sessionId, onError]);

  const revealArtifact = useCallback(async (artifactId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reveal', artifactId }),
      });
      
      if (!res.ok) throw new Error('Failed to reveal artifact');
      
      setState((prev) => ({
        ...prev,
        artifactStates: {
          ...prev.artifactStates,
          [artifactId]: {
            ...prev.artifactStates[artifactId],
            artifactId,
            isRevealed: true,
            status: 'revealed',
            isLocked: false,
            isSolved: false,
          },
        },
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to reveal artifact'));
    }
  }, [sessionId, onError]);

  const hideArtifact = useCallback(async (artifactId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hide', artifactId }),
      });
      
      if (!res.ok) throw new Error('Failed to hide artifact');
      
      setState((prev) => ({
        ...prev,
        artifactStates: {
          ...prev.artifactStates,
          [artifactId]: {
            ...prev.artifactStates[artifactId],
            artifactId,
            isRevealed: false,
            status: 'hidden',
            isLocked: false,
            isSolved: false,
          },
        },
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to hide artifact'));
    }
  }, [sessionId, onError]);

  const resetArtifact = useCallback(async (artifactId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', artifactId }),
      });
      
      if (!res.ok) throw new Error('Failed to reset artifact');
      
      setState((prev) => ({
        ...prev,
        artifactStates: {
          ...prev.artifactStates,
          [artifactId]: {
            artifactId,
            isRevealed: true,
            status: 'revealed',
            isLocked: false,
            isSolved: false,
            attemptCount: 0,
          },
        },
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to reset artifact'));
    }
  }, [sessionId, onError]);

  const fireTrigger = useCallback(async (triggerId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerId, action: 'fire' }),
      });
      
      if (!res.ok) throw new Error('Failed to fire trigger');
      
      setState((prev) => ({
        ...prev,
        triggers: prev.triggers.map((t) =>
          t.id === triggerId
            ? { ...t, status: 'fired' as const, firedCount: t.firedCount + 1, lastFiredAt: new Date().toISOString() }
            : t
        ),
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to fire trigger'));
    }
  }, [sessionId, onError]);

  const disableTrigger = useCallback(async (triggerId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerId, action: 'disable' }),
      });
      
      if (!res.ok) throw new Error('Failed to disable trigger');
      
      setState((prev) => ({
        ...prev,
        triggers: prev.triggers.map((t) =>
          t.id === triggerId ? { ...t, status: 'disabled' as const } : t
        ),
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to disable trigger'));
    }
  }, [sessionId, onError]);

  const armTrigger = useCallback(async (triggerId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerId, action: 'arm' }),
      });
      
      if (!res.ok) throw new Error('Failed to arm trigger');
      
      setState((prev) => ({
        ...prev,
        triggers: prev.triggers.map((t) =>
          t.id === triggerId ? { ...t, status: 'armed' as const } : t
        ),
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to arm trigger'));
    }
  }, [sessionId, onError]);

  const disableAllTriggers = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers/kill`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to disable all triggers');
      
      setState((prev) => ({
        ...prev,
        triggers: prev.triggers.map((t) => ({ ...t, status: 'disabled' as const })),
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to disable all triggers'));
    }
  }, [sessionId, onError]);

  const sendSignal = useCallback(async (channel: string, payload: unknown) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, payload }),
      });
      
      if (!res.ok) throw new Error('Failed to send signal');
      
      const signal: Signal = {
        id: crypto.randomUUID(),
        sessionId,
        channel,
        payload,
        senderType: 'host',
        createdAt: new Date().toISOString(),
      };
      
      setState((prev) => ({
        ...prev,
        recentSignals: [signal, ...prev.recentSignals].slice(0, 20),
      }));
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to send signal'));
    }
  }, [sessionId, onError]);

  const testSignalCapability = useCallback(async (type: SignalOutputType): Promise<boolean> => {
    // Client-side capability testing
    let supported = false;
    
    switch (type) {
      case 'torch':
        // Check if torch/flashlight is available
        if ('mediaDevices' in navigator) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            supported = devices.some((d) => d.kind === 'videoinput');
          } catch {
            supported = false;
          }
        }
        break;
      
      case 'audio':
        supported = 'AudioContext' in window || 'webkitAudioContext' in window;
        break;
      
      case 'screen':
        supported = true; // CSS-based, always available
        break;
      
      case 'vibration':
        supported = 'vibrate' in navigator;
        break;
    }
    
    setState((prev) => ({
      ...prev,
      signalCapabilities: {
        ...prev.signalCapabilities,
        [type]: supported,
        lastTested: new Date().toISOString(),
      },
    }));
    
    return supported;
  }, []);

  const applyTimeBankDelta = useCallback(async (deltaSeconds: number, reason: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/time-bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltaSeconds, reason }),
      });
      
      if (!res.ok) throw new Error('Failed to apply time bank delta');

      await res.json().catch(() => ({}));
      await loadTimeBank();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to apply time bank delta'));
    }
  }, [sessionId, loadTimeBank, onError]);

  const pauseTimeBank = useCallback(async () => {
    setState((prev) => ({ ...prev, timeBankPaused: true }));
    // TODO: API call
  }, []);

  const resumeTimeBank = useCallback(async () => {
    setState((prev) => ({ ...prev, timeBankPaused: false }));
    // TODO: API call
  }, []);

  const addEvent = useCallback((event: Omit<SessionEvent, 'id' | 'sessionId' | 'timestamp'>) => {
    const fullEvent: SessionEvent = {
      ...event,
      id: crypto.randomUUID(),
      sessionId,
      timestamp: new Date().toISOString(),
    };
    
    setState((prev) => ({
      ...prev,
      eventLog: [fullEvent, ...prev.eventLog].slice(0, 100),
    }));
  }, [sessionId]);

  const clearEventLog = useCallback(() => {
    setState((prev) => ({ ...prev, eventLog: [] }));
  }, []);

  const refresh = useCallback(async () => {
    await loadAll();
  }, [loadAll]);

  // ==========================================================================
  // Computed: Preflight Items
  // ==========================================================================

  const preflightItems = useMemo(() => {
    const preflightState: SessionChecklistState = {
      participantCount: state.participants.length,
      hasGame: Boolean(state.gameId),
      rolesSnapshotted: state.sessionRoles.length > 0,
      rolesAssignedCount: Object.keys(state.roleAssignments).length,
      totalRoles: state.sessionRoles.length,
      roleMinCountsStatus: state.sessionRoles.map((role) => {
        const minCount = (role as { min_count?: number }).min_count ?? 1;
        const assigned = Object.values(state.roleAssignments).filter((id) => id === role.id).length;
        return {
          roleId: role.id,
          name: role.name,
          min: minCount,
          assigned,
          met: assigned >= minCount,
        };
      }),
      hasSecretInstructions: state.sessionRoles.some(
        (role) => (role as { private_instructions?: string }).private_instructions
      ),
      secretsUnlocked: Boolean(state.secretsUnlockedAt),
      secretsRevealedCount: Object.keys(state.secretsRevealedBy).length,
      triggersSnapshotted: state.triggers.length > 0,
      armedTriggersCount: state.triggers.filter((t) => t.status === 'armed').length,
      hasTriggers: state.triggers.length > 0,
      artifactsSnapshotted: state.artifacts.length > 0,
      signalCapabilitiesTested: Boolean(state.signalCapabilities.lastTested),
    };

    return buildPreflightItems(preflightState, {
      onSnapshotRoles: snapshotRoles,
      onUnlockSecrets: unlockSecrets,
    }, tPreflight);
  }, [snapshotRoles, unlockSecrets, state, tPreflight]);

  const canStartDirectorMode = useMemo(() => {
    return !preflightItems.some((item) => item.status === 'error');
  }, [preflightItems]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Initial load
  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Polling
  useEffect(() => {
    if (!enableRealtime) return;

    pollRef.current = setInterval(() => {
      void loadParticipants();
      void loadRuntimeState();
    }, pollInterval);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [enableRealtime, pollInterval, loadParticipants, loadRuntimeState]);

  // ==========================================================================
  // Return
  // ==========================================================================

  const actions: SessionCockpitActions = {
    enterDirectorMode,
    exitDirectorMode,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    goToStep,
    goToPhase,
    nextStep,
    previousStep,
    assignRole,
    unassignRole,
    randomizeRoles,
    snapshotRoles,
    unlockSecrets,
    relockSecrets,
    revealArtifact,
    hideArtifact,
    resetArtifact,
    fireTrigger,
    disableTrigger,
    armTrigger,
    disableAllTriggers,
    sendSignal,
    testSignalCapability,
    applyTimeBankDelta,
    pauseTimeBank,
    resumeTimeBank,
    addEvent,
    clearEventLog,
    refresh,
  };

  return {
    ...state,
    preflightItems,
    canStartDirectorMode,
    ...actions,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCondition(condition: Record<string, unknown>): string {
  if (!condition) return 'Unknown';
  
  const type = condition.type as string;
  
  switch (type) {
    case 'step_started':
    case 'step_completed':
      return `Step ${condition.stepId ? '...' : 'any'}`;
    case 'phase_started':
    case 'phase_completed':
      return `Phase ${condition.phaseId ? '...' : 'any'}`;
    case 'keypad_correct':
      return 'Keypad correct';
    case 'keypad_failed':
      return 'Keypad failed';
    case 'manual':
      return 'Manual';
    case 'signal_received':
      return `Signal: ${condition.channel ?? 'any'}`;
    default:
      return type;
  }
}

function formatActions(actions: Record<string, unknown>[]): string {
  if (!actions || actions.length === 0) return 'No actions';
  
  return actions
    .map((a) => {
      const type = a.type as string;
      switch (type) {
        case 'reveal_artifact':
          return 'Reveal artifact';
        case 'hide_artifact':
          return 'Hide artifact';
        case 'send_message':
          return 'Send message';
        case 'advance_step':
          return 'Next step';
        case 'time_bank_apply_delta':
          return `Time ${(a.deltaSeconds as number) > 0 ? '+' : ''}${a.deltaSeconds}s`;
        default:
          return type;
      }
    })
    .join(', ');
}

export default useSessionState;
