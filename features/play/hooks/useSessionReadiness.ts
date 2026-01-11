/**
 * useSessionReadiness Hook
 * 
 * Calculates session readiness ("confidence indicator") based on
 * various checks like participants, artifacts, triggers, etc.
 * 
 * Backlog B.4: Confidence indicator ("95% ready")
 */

'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ReadinessCheck {
  /** Unique identifier */
  id: string;
  /** @deprecated Use nameKey with translations instead */
  name: string;
  /** Translation key for name (e.g., 'checks.min_participants.name') */
  nameKey: string;
  /** Check category */
  category: ReadinessCategory;
  /** Current status */
  status: 'pass' | 'warning' | 'fail' | 'skip';
  /** Weight (0-100) - how important is this check */
  weight: number;
  /** Current value */
  current: number;
  /** Target value (for pass) */
  target: number;
  /** @deprecated Use detailsKey with translations instead */
  details?: string;
  /** Translation key for details (e.g., 'checks.min_participants.pass') */
  detailsKey?: string;
  /** Parameters for details interpolation */
  detailsParams?: Record<string, string | number>;
  /** Whether this check is critical (blocks start) */
  critical?: boolean;
}

export type ReadinessCategory =
  | 'participants'
  | 'content'
  | 'triggers'
  | 'artifacts'
  | 'signals'
  | 'configuration';

export interface SessionReadinessInput {
  // Participants
  participantCount: number;
  minParticipants?: number;
  maxParticipants?: number;
  rolesAssigned?: number;
  totalRoles?: number;
  
  // Content
  hasSteps: boolean;
  stepCount?: number;
  hasLeaderScript?: boolean;
  
  // Triggers
  triggerCount: number;
  armedTriggerCount: number;
  errorTriggerCount: number;
  
  // Artifacts
  artifactCount: number;
  configuredArtifactCount: number;
  
  // Signals
  signalPresetsCount?: number;
  hasTimeBankConfig?: boolean;
  
  // Configuration
  hasJoinCode: boolean;
  sessionName?: string;
}

export interface UseSessionReadinessReturn {
  /** Overall readiness percentage (0-100) */
  readinessPercent: number;
  /** @deprecated Use readinessLabelKey with translations instead */
  readinessLabel: string;
  /** Translation key for readiness label */
  readinessLabelKey: string;
  /** Readiness color */
  readinessColor: 'red' | 'yellow' | 'green';
  /** All checks */
  checks: ReadinessCheck[];
  /** Checks grouped by category */
  checksByCategory: Record<ReadinessCategory, ReadinessCheck[]>;
  /** Critical issues that block session start */
  criticalIssues: ReadinessCheck[];
  /** Warnings that don't block start */
  warnings: ReadinessCheck[];
  /** Whether session can be started */
  canStart: boolean;
  /** @deprecated Use summaryKey with translations instead */
  summary: string;
  /** Translation key for summary */
  summaryKey: string;
  /** Parameters for summary interpolation */
  summaryParams: Record<string, string | number>;
}

// =============================================================================
// Constants
// =============================================================================

/** @deprecated Use READINESS_CATEGORY_KEYS with translations instead */
const CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  participants: 'Deltagare',
  content: 'Innehåll',
  triggers: 'Triggers',
  artifacts: 'Artefakter',
  signals: 'Signaler',
  configuration: 'Konfiguration',
};

/** Translation keys for readiness categories */
const CATEGORY_KEYS: Record<ReadinessCategory, string> = {
  participants: 'participants',
  content: 'content',
  triggers: 'triggers',
  artifacts: 'artifacts',
  signals: 'signals',
  configuration: 'configuration',
};

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSessionReadiness(input: SessionReadinessInput): UseSessionReadinessReturn {
  const checks = useMemo((): ReadinessCheck[] => {
    const result: ReadinessCheck[] = [];
    
    // =======================================================================
    // Participant checks
    // =======================================================================
    
    // Minimum participants
    const minParticipants = input.minParticipants ?? 1;
    const minPartPass = input.participantCount >= minParticipants;
    result.push({
      id: 'min_participants',
      name: 'Minimum participants',
      nameKey: 'checks.minParticipants.name',
      category: 'participants',
      status: minPartPass ? 'pass' : 'fail',
      weight: 30,
      current: input.participantCount,
      target: minParticipants,
      details: minPartPass
        ? `${input.participantCount} participants connected`
        : `Need at least ${minParticipants} participants`,
      detailsKey: minPartPass ? 'checks.minParticipants.pass' : 'checks.minParticipants.fail',
      detailsParams: { count: input.participantCount, min: minParticipants },
      critical: true,
    });
    
    // Role assignment
    if (input.totalRoles && input.totalRoles > 0) {
      const rolesAssigned = input.rolesAssigned ?? 0;
      const allAssigned = rolesAssigned >= input.totalRoles;
      result.push({
        id: 'roles_assigned',
        name: 'Roles assigned',
        nameKey: 'checks.rolesAssigned.name',
        category: 'participants',
        status: allAssigned ? 'pass' : rolesAssigned > 0 ? 'warning' : 'fail',
        weight: 20,
        current: rolesAssigned,
        target: input.totalRoles,
        details: allAssigned
          ? 'All roles assigned'
          : `${rolesAssigned}/${input.totalRoles} roles assigned`,
        detailsKey: allAssigned ? 'checks.rolesAssigned.pass' : 'checks.rolesAssigned.partial',
        detailsParams: { assigned: rolesAssigned, total: input.totalRoles },
        critical: false,
      });
    }
    
    // =======================================================================
    // Content checks
    // =======================================================================
    
    // Has steps
    const hasStepsPass = input.hasSteps;
    result.push({
      id: 'has_steps',
      name: 'Steps defined',
      nameKey: 'checks.hasSteps.name',
      category: 'content',
      status: hasStepsPass ? 'pass' : 'fail',
      weight: 25,
      current: hasStepsPass ? 1 : 0,
      target: 1,
      details: hasStepsPass
        ? `${input.stepCount ?? 1} steps defined`
        : 'No steps in game',
      detailsKey: hasStepsPass ? 'checks.hasSteps.pass' : 'checks.hasSteps.fail',
      detailsParams: { count: input.stepCount ?? 1 },
      critical: true,
    });
    
    // Leader script
    if (input.hasLeaderScript !== undefined) {
      result.push({
        id: 'leader_script',
        name: 'Leader script',
        nameKey: 'checks.leaderScript.name',
        category: 'content',
        status: input.hasLeaderScript ? 'pass' : 'skip',
        weight: 5,
        current: input.hasLeaderScript ? 1 : 0,
        target: 1,
        details: input.hasLeaderScript
          ? 'Leader script available'
          : 'No leader script (optional)',
        detailsKey: input.hasLeaderScript ? 'checks.leaderScript.pass' : 'checks.leaderScript.skip',
        critical: false,
      });
    }
    
    // =======================================================================
    // Trigger checks
    // =======================================================================
    
    if (input.triggerCount > 0) {
      // Armed triggers
      const triggersStatus = input.armedTriggerCount === input.triggerCount
        ? 'pass' as const
        : input.armedTriggerCount > 0
          ? 'warning' as const
          : 'fail' as const;
      result.push({
        id: 'triggers_armed',
        name: 'Triggers armed',
        nameKey: 'checks.triggersArmed.name',
        category: 'triggers',
        status: triggersStatus,
        weight: 10,
        current: input.armedTriggerCount,
        target: input.triggerCount,
        details: `${input.armedTriggerCount}/${input.triggerCount} triggers ready`,
        detailsKey: 'checks.triggersArmed.status',
        detailsParams: { armed: input.armedTriggerCount, total: input.triggerCount },
        critical: false,
      });
      
      // Error triggers
      if (input.errorTriggerCount > 0) {
        result.push({
          id: 'triggers_errors',
          name: 'Trigger errors',
          nameKey: 'checks.triggersErrors.name',
          category: 'triggers',
          status: 'warning',
          weight: 15,
          current: input.errorTriggerCount,
          target: 0,
          details: `${input.errorTriggerCount} trigger(s) have errors`,
          detailsKey: 'checks.triggersErrors.warning',
          detailsParams: { count: input.errorTriggerCount },
          critical: false,
        });
      }
    }
    
    // =======================================================================
    // Artifact checks
    // =======================================================================
    
    if (input.artifactCount > 0) {
      const configuredPercent = (input.configuredArtifactCount / input.artifactCount) * 100;
      const artifactsStatus = configuredPercent === 100
        ? 'pass' as const
        : configuredPercent >= 50
          ? 'warning' as const
          : 'fail' as const;
      result.push({
        id: 'artifacts_configured',
        name: 'Artifacts configured',
        nameKey: 'checks.artifactsConfigured.name',
        category: 'artifacts',
        status: artifactsStatus,
        weight: 15,
        current: input.configuredArtifactCount,
        target: input.artifactCount,
        details: `${input.configuredArtifactCount}/${input.artifactCount} artifacts ready`,
        detailsKey: 'checks.artifactsConfigured.status',
        detailsParams: { configured: input.configuredArtifactCount, total: input.artifactCount },
        critical: false,
      });
    }
    
    // =======================================================================
    // Signal checks
    // =======================================================================
    
    if (input.signalPresetsCount !== undefined) {
      const signalPass = input.signalPresetsCount > 0;
      result.push({
        id: 'signal_presets',
        name: 'Signal presets',
        nameKey: 'checks.signalPresets.name',
        category: 'signals',
        status: signalPass ? 'pass' : 'skip',
        weight: 5,
        current: input.signalPresetsCount,
        target: 1,
        details: signalPass
          ? `${input.signalPresetsCount} presets configured`
          : 'No signal presets (optional)',
        detailsKey: signalPass ? 'checks.signalPresets.pass' : 'checks.signalPresets.skip',
        detailsParams: { count: input.signalPresetsCount },
        critical: false,
      });
    }
    
    if (input.hasTimeBankConfig !== undefined) {
      result.push({
        id: 'timebank_config',
        name: 'Time bank',
        nameKey: 'checks.timebankConfig.name',
        category: 'signals',
        status: input.hasTimeBankConfig ? 'pass' : 'skip',
        weight: 5,
        current: input.hasTimeBankConfig ? 1 : 0,
        target: 1,
        details: input.hasTimeBankConfig
          ? 'Time bank configured'
          : 'No time bank (optional)',
        detailsKey: input.hasTimeBankConfig ? 'checks.timebankConfig.pass' : 'checks.timebankConfig.skip',
        critical: false,
      });
    }
    
    // =======================================================================
    // Configuration checks
    // =======================================================================
    
    result.push({
      id: 'join_code',
      name: 'Join code',
      nameKey: 'checks.joinCode.name',
      category: 'configuration',
      status: input.hasJoinCode ? 'pass' : 'fail',
      weight: 20,
      current: input.hasJoinCode ? 1 : 0,
      target: 1,
      details: input.hasJoinCode
        ? 'Join code generated'
        : 'No join code',
      detailsKey: input.hasJoinCode ? 'checks.joinCode.pass' : 'checks.joinCode.fail',
      critical: true,
    });
    
    if (input.sessionName !== undefined) {
      const hasName = input.sessionName && input.sessionName.trim().length > 0;
      result.push({
        id: 'session_name',
        name: 'Session name',
        nameKey: 'checks.sessionName.name',
        category: 'configuration',
        status: hasName ? 'pass' : 'skip',
        weight: 2,
        current: hasName ? 1 : 0,
        target: 1,
        details: input.sessionName || 'No name (optional)',
        detailsKey: hasName ? 'checks.sessionName.pass' : 'checks.sessionName.skip',
        detailsParams: { name: input.sessionName || '' },
        critical: false,
      });
    }
    
    return result;
  }, [input]);
  
  // Calculate overall readiness
  const { readinessPercent, readinessLabel, readinessLabelKey, readinessColor } = useMemo(() => {
    // Only count non-skip checks
    const activeChecks = checks.filter((c) => c.status !== 'skip');
    if (activeChecks.length === 0) {
      return { readinessPercent: 100, readinessLabel: 'Ready', readinessLabelKey: 'labels.ready', readinessColor: 'green' as const };
    }
    
    const totalWeight = activeChecks.reduce((sum, c) => sum + c.weight, 0);
    const earnedWeight = activeChecks.reduce((sum, c) => {
      if (c.status === 'pass') return sum + c.weight;
      if (c.status === 'warning') return sum + c.weight * 0.5;
      return sum;
    }, 0);
    
    const percent = Math.round((earnedWeight / totalWeight) * 100);
    
    let label: string;
    let labelKey: string;
    let color: 'red' | 'yellow' | 'green';
    
    if (percent >= 90) {
      label = 'Ready to start';
      labelKey = 'labels.readyToStart';
      color = 'green';
    } else if (percent >= 70) {
      label = 'Almost ready';
      labelKey = 'labels.almostReady';
      color = 'yellow';
    } else if (percent >= 50) {
      label = 'Preparing';
      labelKey = 'labels.preparing';
      color = 'yellow';
    } else {
      label = 'Not ready';
      labelKey = 'labels.notReady';
      color = 'red';
    }
    
    return { readinessPercent: percent, readinessLabel: label, readinessLabelKey: labelKey, readinessColor: color };
  }, [checks]);
  
  // Group by category
  const checksByCategory = useMemo(() => {
    const grouped: Record<ReadinessCategory, ReadinessCheck[]> = {
      participants: [],
      content: [],
      triggers: [],
      artifacts: [],
      signals: [],
      configuration: [],
    };
    
    for (const check of checks) {
      grouped[check.category].push(check);
    }
    
    return grouped;
  }, [checks]);
  
  // Critical issues and warnings
  const criticalIssues = useMemo(
    () => checks.filter((c) => c.critical && c.status === 'fail'),
    [checks]
  );
  
  const warnings = useMemo(
    () => checks.filter((c) => c.status === 'warning' || (!c.critical && c.status === 'fail')),
    [checks]
  );
  
  // Can start
  const canStart = criticalIssues.length === 0;
  
  // Summary
  const { summary, summaryKey, summaryParams } = useMemo(() => {
    if (canStart && readinessPercent >= 90) {
      return { 
        summary: 'Session is ready to start!', 
        summaryKey: 'summary.ready',
        summaryParams: {} 
      };
    } else if (canStart) {
      return { 
        summary: `${warnings.length} thing(s) to improve, but you can start.`, 
        summaryKey: 'summary.canStart',
        summaryParams: { count: warnings.length } 
      };
    } else {
      return { 
        summary: `${criticalIssues.length} critical issue(s) must be resolved before start.`, 
        summaryKey: 'summary.blocked',
        summaryParams: { count: criticalIssues.length } 
      };
    }
  }, [canStart, readinessPercent, warnings.length, criticalIssues.length]);
  
  return {
    readinessPercent,
    readinessLabel,
    readinessLabelKey,
    readinessColor,
    checks,
    checksByCategory,
    criticalIssues,
    warnings,
    canStart,
    summary,
    summaryKey,
    summaryParams,
  };
}

export { CATEGORY_LABELS as READINESS_CATEGORY_LABELS };
export { CATEGORY_KEYS as READINESS_CATEGORY_KEYS };
