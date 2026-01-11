/**
 * useSessionAnalytics Hook
 * 
 * Provides aggregated analytics and metrics for session performance.
 * Calculates completion rates, timing data, and engagement metrics.
 * 
 * Backlog B.7: Analytics dashboard
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { SessionEvent } from '@/types/session-event';

// =============================================================================
// Types
// =============================================================================

export interface StepMetrics {
  /** Step index */
  stepIndex: number;
  /** Step name */
  stepName: string;
  /** Time spent on step (ms) */
  duration: number;
  /** Number of puzzles solved */
  puzzlesSolved: number;
  /** Number of puzzle failures */
  puzzleFailures: number;
  /** Hints requested */
  hintsUsed: number;
  /** Triggers fired */
  triggersFired: number;
  /** Signals sent */
  signalsSent: number;
  /** Was step completed? */
  completed: boolean;
  /** Completion rate (0-1) for puzzles in step */
  completionRate: number;
}

export interface PuzzleMetrics {
  /** Artifact ID */
  artifactId: string;
  /** Artifact name */
  name: string;
  /** Puzzle type */
  type: string;
  /** Time to solve (ms), null if unsolved */
  solveTime: number | null;
  /** Number of attempts */
  attempts: number;
  /** Was solved? */
  solved: boolean;
  /** Step where puzzle exists */
  stepIndex: number;
}

export interface ParticipantMetrics {
  /** Participant ID */
  participantId: string;
  /** Display name */
  displayName: string;
  /** Role if assigned */
  role?: string;
  /** Puzzles solved by this participant */
  puzzlesSolved: number;
  /** Contributions (interactions) */
  contributions: number;
  /** Time active */
  activeTime: number;
}

export interface EngagementMetrics {
  /** Average time per step */
  avgTimePerStep: number;
  /** Median time per step */
  medianTimePerStep: number;
  /** Total puzzles in game */
  totalPuzzles: number;
  /** Puzzles solved */
  puzzlesSolved: number;
  /** Overall completion rate */
  overallCompletionRate: number;
  /** Total hints used */
  totalHintsUsed: number;
  /** Hints per puzzle */
  hintsPerPuzzle: number;
  /** Total trigger fires */
  totalTriggerFires: number;
  /** Trigger errors */
  triggerErrors: number;
  /** Error rate */
  errorRate: number;
  /** Signals sent */
  signalsSent: number;
  /** TimeBank warnings */
  timeBankWarnings: number;
  /** Peak activity step */
  peakActivityStep: number;
}

export interface SessionAnalytics {
  /** Session ID */
  sessionId: string;
  /** Session status */
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  /** Start time */
  startTime: Date | null;
  /** End time */
  endTime: Date | null;
  /** Total duration (ms) */
  totalDuration: number;
  /** Current step */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Progress percentage */
  progressPercent: number;
  /** Per-step metrics */
  stepMetrics: StepMetrics[];
  /** Per-puzzle metrics */
  puzzleMetrics: PuzzleMetrics[];
  /** Participant metrics */
  participantMetrics: ParticipantMetrics[];
  /** Engagement summary */
  engagement: EngagementMetrics;
  /** Raw event count */
  eventCount: number;
}

export interface UseSessionAnalyticsOptions {
  /** Session ID */
  sessionId: string;
  /** Session status */
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  /** Events to analyze */
  events: SessionEvent[];
  /** Step definitions */
  steps: Array<{ id: string; name: string; order_index: number }>;
  /** Artifact definitions */
  artifacts: Array<{ id: string; name: string; type: string; step_id: string }>;
  /** Current step index */
  currentStepIndex: number;
  /** Session start time */
  sessionStartTime?: Date;
  /** Session end time */
  sessionEndTime?: Date;
}

export interface UseSessionAnalyticsReturn {
  /** Full analytics data */
  analytics: SessionAnalytics;
  /** Get metrics for specific step */
  getStepMetrics: (stepIndex: number) => StepMetrics | null;
  /** Get metrics for specific puzzle */
  getPuzzleMetrics: (artifactId: string) => PuzzleMetrics | null;
  /** Export as JSON */
  exportJSON: () => string;
  /** Export as CSV */
  exportCSV: () => string;
}

// =============================================================================
// Helpers
// =============================================================================

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStepDurations(
  events: SessionEvent[],
  _totalSteps: number
): Map<number, number> {
  const durations = new Map<number, number>();
  
  // Find step_started events
  const stepChanges = events
    .filter((e) => e.eventType === 'step_started')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (let i = 0; i < stepChanges.length; i++) {
    const payload = stepChanges[i].payload as { stepIndex?: number };
    const stepIndex = payload.stepIndex ?? 0;
    const startTime = new Date(stepChanges[i].createdAt).getTime();
    const endTime = i < stepChanges.length - 1
      ? new Date(stepChanges[i + 1].createdAt).getTime()
      : Date.now();
    
    durations.set(stepIndex, endTime - startTime);
  }

  return durations;
}

// =============================================================================
// Hook
// =============================================================================

export function useSessionAnalytics({
  sessionId,
  status,
  events,
  steps,
  artifacts,
  currentStepIndex,
  sessionStartTime,
  sessionEndTime,
}: UseSessionAnalyticsOptions): UseSessionAnalyticsReturn {
  // Use state for current time to trigger updates via effect
  const [now, setNow] = useState(() => Date.now());
  
  // Update time periodically for live sessions
  useEffect(() => {
    if (status === 'active' || status === 'paused') {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);
  
  const analytics = useMemo<SessionAnalytics>(() => {
    const startTime = sessionStartTime ?? null;
    const endTime = sessionEndTime ?? null;
    const totalDuration = startTime
      ? (endTime?.getTime() ?? now) - startTime.getTime()
      : 0;

    // Calculate step durations
    const stepDurations = calculateStepDurations(events, steps.length);

    // Initialize step metrics
    const stepMetrics: StepMetrics[] = steps.map((step) => ({
      stepIndex: step.order_index,
      stepName: step.name,
      duration: stepDurations.get(step.order_index) ?? 0,
      puzzlesSolved: 0,
      puzzleFailures: 0,
      hintsUsed: 0,
      triggersFired: 0,
      signalsSent: 0,
      completed: step.order_index < currentStepIndex,
      completionRate: 0,
    }));

    // Initialize puzzle metrics
    const puzzleMetrics: PuzzleMetrics[] = artifacts
      .filter((a) => ['keypad', 'riddle', 'cipher', 'hotspot', 'tile_puzzle', 'logic_grid', 'multi_answer'].includes(a.type))
      .map((a) => ({
        artifactId: a.id,
        name: a.name,
        type: a.type,
        solveTime: null,
        attempts: 0,
        solved: false,
        stepIndex: steps.find((s) => s.id === a.step_id)?.order_index ?? 0,
      }));

    // Track puzzle first seen times
    const puzzleFirstSeen = new Map<string, number>();

    // Participant tracking
    const participantData = new Map<string, ParticipantMetrics>();

    // Process events
    events.forEach((event) => {
      const eventPayload = event.payload as Record<string, unknown>;
      const stepIdx = (eventPayload.stepIndex as number) ?? 0;
      const stepMetric = stepMetrics[stepIdx];
      
      switch (event.eventType) {
        case 'artifact_solved': {
          if (stepMetric) stepMetric.puzzlesSolved++;
          
          const artifactId = event.targetType === 'artifact' ? event.targetId : undefined;
          if (artifactId) {
            const puzzle = puzzleMetrics.find((p) => p.artifactId === artifactId);
            if (puzzle) {
              puzzle.solved = true;
              const firstSeen = puzzleFirstSeen.get(artifactId);
              if (firstSeen) {
                puzzle.solveTime = new Date(event.createdAt).getTime() - firstSeen;
              }
            }
          }
          break;
        }

        case 'artifact_failed': {
          if (stepMetric) stepMetric.puzzleFailures++;
          
          const artifactId = event.targetType === 'artifact' ? event.targetId : undefined;
          if (artifactId) {
            const puzzle = puzzleMetrics.find((p) => p.artifactId === artifactId);
            if (puzzle) {
              puzzle.attempts++;
              if (!puzzleFirstSeen.has(artifactId)) {
                puzzleFirstSeen.set(artifactId, new Date(event.createdAt).getTime());
              }
            }
          }
          break;
        }

        case 'artifact_revealed': {
          const artifactId = event.targetType === 'artifact' ? event.targetId : undefined;
          if (artifactId && !puzzleFirstSeen.has(artifactId)) {
            puzzleFirstSeen.set(artifactId, new Date(event.createdAt).getTime());
          }
          break;
        }

        case 'trigger_fired': {
          if (stepMetric) stepMetric.triggersFired++;
          break;
        }

        case 'signal_sent': {
          if (stepMetric) stepMetric.signalsSent++;
          break;
        }

        case 'step_completed': {
          if (stepMetric) stepMetric.completed = true;
          break;
        }

        case 'participant_joined': {
          const participantId = eventPayload.participant_id as string | undefined;
          const displayName = eventPayload.display_name as string | undefined;
          if (participantId) {
            participantData.set(participantId, {
              participantId: participantId,
              displayName: displayName ?? 'Unknown',
              puzzlesSolved: 0,
              contributions: 0,
              activeTime: 0,
            });
          }
          break;
        }

        case 'participant_role_assigned': {
          const participantId = eventPayload.participant_id as string | undefined;
          const role = eventPayload.role as string | undefined;
          if (participantId) {
            const participant = participantData.get(participantId);
            if (participant) {
              participant.role = role;
            }
          }
          break;
        }
      }
    });

    // Calculate step completion rates
    stepMetrics.forEach((step) => {
      const puzzlesInStep = puzzleMetrics.filter((p) => p.stepIndex === step.stepIndex);
      const solvedInStep = puzzlesInStep.filter((p) => p.solved).length;
      step.completionRate = puzzlesInStep.length > 0 ? solvedInStep / puzzlesInStep.length : 1;
    });

    // Calculate hint usage (from hint_requested events)
    const hintEvents = events.filter((e) => 
      e.eventType === 'artifact_state_changed' && 
      (e.payload as { action?: string })?.action === 'hint_requested'
    );
    const totalHintsUsed = hintEvents.length;

    // Calculate trigger metrics
    const triggerFires = events.filter((e) => e.eventType === 'trigger_fired').length;
    const triggerErrors = events.filter((e) => e.eventType === 'trigger_error').length;

    // Calculate signal metrics
    const signalsSent = events.filter((e) => e.eventType === 'signal_sent').length;

    // Calculate TimeBank metrics
    const timeBankWarnings = events.filter((e) => e.eventType === 'timebank_expired').length;

    // Find peak activity step
    let peakActivityStep = 0;
    let maxEvents = 0;
    stepMetrics.forEach((step) => {
      const stepEvents = events.filter((e) => (e.payload as { stepIndex?: number }).stepIndex === step.stepIndex).length;
      if (stepEvents > maxEvents) {
        maxEvents = stepEvents;
        peakActivityStep = step.stepIndex;
      }
    });

    // Calculate engagement metrics
    const stepDurationValues = stepMetrics.map((s) => s.duration).filter((d) => d > 0);
    const engagement: EngagementMetrics = {
      avgTimePerStep: stepDurationValues.length > 0 
        ? stepDurationValues.reduce((a, b) => a + b, 0) / stepDurationValues.length 
        : 0,
      medianTimePerStep: median(stepDurationValues),
      totalPuzzles: puzzleMetrics.length,
      puzzlesSolved: puzzleMetrics.filter((p) => p.solved).length,
      overallCompletionRate: puzzleMetrics.length > 0
        ? puzzleMetrics.filter((p) => p.solved).length / puzzleMetrics.length
        : 0,
      totalHintsUsed,
      hintsPerPuzzle: puzzleMetrics.length > 0 ? totalHintsUsed / puzzleMetrics.length : 0,
      totalTriggerFires: triggerFires,
      triggerErrors,
      errorRate: triggerFires > 0 ? triggerErrors / triggerFires : 0,
      signalsSent,
      timeBankWarnings,
      peakActivityStep,
    };

    return {
      sessionId,
      status,
      startTime,
      endTime,
      totalDuration,
      currentStep: currentStepIndex,
      totalSteps: steps.length,
      progressPercent: steps.length > 0 ? (currentStepIndex / steps.length) * 100 : 0,
      stepMetrics,
      puzzleMetrics,
      participantMetrics: Array.from(participantData.values()),
      engagement,
      eventCount: events.length,
    };
  }, [sessionId, status, events, steps, artifacts, currentStepIndex, sessionStartTime, sessionEndTime, now]);

  // Get metrics for specific step
  const getStepMetrics = (stepIndex: number): StepMetrics | null => {
    return analytics.stepMetrics.find((s) => s.stepIndex === stepIndex) ?? null;
  };

  // Get metrics for specific puzzle
  const getPuzzleMetrics = (artifactId: string): PuzzleMetrics | null => {
    return analytics.puzzleMetrics.find((p) => p.artifactId === artifactId) ?? null;
  };

  // Export as JSON
  const exportJSON = (): string => {
    return JSON.stringify(analytics, null, 2);
  };

  // Export as CSV
  const exportCSV = (): string => {
    const lines: string[] = [];
    
    // Header
    lines.push('Session Analytics Export');
    lines.push(`Session ID,${analytics.sessionId}`);
    lines.push(`Status,${analytics.status}`);
    lines.push(`Total Duration,${Math.round(analytics.totalDuration / 1000)}s`);
    lines.push(`Progress,${Math.round(analytics.progressPercent)}%`);
    lines.push('');
    
    // Step metrics
    lines.push('Step Metrics');
    lines.push('Step,Name,Duration (s),Puzzles Solved,Failures,Completion Rate');
    analytics.stepMetrics.forEach((step) => {
      lines.push(`${step.stepIndex + 1},${step.stepName},${Math.round(step.duration / 1000)},${step.puzzlesSolved},${step.puzzleFailures},${Math.round(step.completionRate * 100)}%`);
    });
    lines.push('');
    
    // Puzzle metrics
    lines.push('Puzzle Metrics');
    lines.push('Name,Type,Solved,Solve Time (s),Attempts');
    analytics.puzzleMetrics.forEach((puzzle) => {
      lines.push(`${puzzle.name},${puzzle.type},${puzzle.solved ? 'Yes' : 'No'},${puzzle.solveTime ? Math.round(puzzle.solveTime / 1000) : 'N/A'},${puzzle.attempts}`);
    });
    lines.push('');
    
    // Engagement summary
    lines.push('Engagement Summary');
    lines.push(`Overall Completion Rate,${Math.round(analytics.engagement.overallCompletionRate * 100)}%`);
    lines.push(`Average Time Per Step,${Math.round(analytics.engagement.avgTimePerStep / 1000)}s`);
    lines.push(`Total Hints Used,${analytics.engagement.totalHintsUsed}`);
    lines.push(`Total Trigger Fires,${analytics.engagement.totalTriggerFires}`);
    lines.push(`Trigger Errors,${analytics.engagement.triggerErrors}`);
    
    return lines.join('\n');
  };

  return {
    analytics,
    getStepMetrics,
    getPuzzleMetrics,
    exportJSON,
    exportCSV,
  };
}
