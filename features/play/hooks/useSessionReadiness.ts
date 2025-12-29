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
  /** Display name */
  name: string;
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
  /** Optional details */
  details?: string;
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
  /** Readiness label */
  readinessLabel: string;
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
  /** Summary text */
  summary: string;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  participants: 'Deltagare',
  content: 'Innehåll',
  triggers: 'Triggers',
  artifacts: 'Artefakter',
  signals: 'Signaler',
  configuration: 'Konfiguration',
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
    result.push({
      id: 'min_participants',
      name: 'Minsta antal deltagare',
      category: 'participants',
      status: input.participantCount >= minParticipants ? 'pass' : 'fail',
      weight: 30,
      current: input.participantCount,
      target: minParticipants,
      details: input.participantCount >= minParticipants
        ? `${input.participantCount} deltagare anslutna`
        : `Behöver minst ${minParticipants} deltagare`,
      critical: true,
    });
    
    // Role assignment
    if (input.totalRoles && input.totalRoles > 0) {
      const rolesAssigned = input.rolesAssigned ?? 0;
      const allAssigned = rolesAssigned >= input.totalRoles;
      result.push({
        id: 'roles_assigned',
        name: 'Roller tilldelade',
        category: 'participants',
        status: allAssigned ? 'pass' : rolesAssigned > 0 ? 'warning' : 'fail',
        weight: 20,
        current: rolesAssigned,
        target: input.totalRoles,
        details: allAssigned
          ? 'Alla roller tilldelade'
          : `${rolesAssigned}/${input.totalRoles} roller tilldelade`,
        critical: false,
      });
    }
    
    // =======================================================================
    // Content checks
    // =======================================================================
    
    // Has steps
    result.push({
      id: 'has_steps',
      name: 'Steg definierade',
      category: 'content',
      status: input.hasSteps ? 'pass' : 'fail',
      weight: 25,
      current: input.hasSteps ? 1 : 0,
      target: 1,
      details: input.hasSteps
        ? `${input.stepCount ?? 1} steg definierade`
        : 'Inga steg i spelet',
      critical: true,
    });
    
    // Leader script
    if (input.hasLeaderScript !== undefined) {
      result.push({
        id: 'leader_script',
        name: 'Ledarscript',
        category: 'content',
        status: input.hasLeaderScript ? 'pass' : 'skip',
        weight: 5,
        current: input.hasLeaderScript ? 1 : 0,
        target: 1,
        details: input.hasLeaderScript
          ? 'Ledarscript tillgängligt'
          : 'Inget ledarscript (valfritt)',
        critical: false,
      });
    }
    
    // =======================================================================
    // Trigger checks
    // =======================================================================
    
    if (input.triggerCount > 0) {
      // Armed triggers
      result.push({
        id: 'triggers_armed',
        name: 'Triggers aktiverade',
        category: 'triggers',
        status: input.armedTriggerCount === input.triggerCount
          ? 'pass'
          : input.armedTriggerCount > 0
            ? 'warning'
            : 'fail',
        weight: 10,
        current: input.armedTriggerCount,
        target: input.triggerCount,
        details: `${input.armedTriggerCount}/${input.triggerCount} triggers redo`,
        critical: false,
      });
      
      // Error triggers
      if (input.errorTriggerCount > 0) {
        result.push({
          id: 'triggers_errors',
          name: 'Trigger-fel',
          category: 'triggers',
          status: 'warning',
          weight: 15,
          current: input.errorTriggerCount,
          target: 0,
          details: `${input.errorTriggerCount} trigger(s) har fel`,
          critical: false,
        });
      }
    }
    
    // =======================================================================
    // Artifact checks
    // =======================================================================
    
    if (input.artifactCount > 0) {
      const configuredPercent = (input.configuredArtifactCount / input.artifactCount) * 100;
      result.push({
        id: 'artifacts_configured',
        name: 'Artefakter konfigurerade',
        category: 'artifacts',
        status: configuredPercent === 100
          ? 'pass'
          : configuredPercent >= 50
            ? 'warning'
            : 'fail',
        weight: 15,
        current: input.configuredArtifactCount,
        target: input.artifactCount,
        details: `${input.configuredArtifactCount}/${input.artifactCount} artefakter klara`,
        critical: false,
      });
    }
    
    // =======================================================================
    // Signal checks
    // =======================================================================
    
    if (input.signalPresetsCount !== undefined) {
      result.push({
        id: 'signal_presets',
        name: 'Signalpresets',
        category: 'signals',
        status: input.signalPresetsCount > 0 ? 'pass' : 'skip',
        weight: 5,
        current: input.signalPresetsCount,
        target: 1,
        details: input.signalPresetsCount > 0
          ? `${input.signalPresetsCount} presets konfigurerade`
          : 'Inga signalpresets (valfritt)',
        critical: false,
      });
    }
    
    if (input.hasTimeBankConfig !== undefined) {
      result.push({
        id: 'timebank_config',
        name: 'Tidsbank',
        category: 'signals',
        status: input.hasTimeBankConfig ? 'pass' : 'skip',
        weight: 5,
        current: input.hasTimeBankConfig ? 1 : 0,
        target: 1,
        details: input.hasTimeBankConfig
          ? 'Tidsbank konfigurerad'
          : 'Ingen tidsbank (valfritt)',
        critical: false,
      });
    }
    
    // =======================================================================
    // Configuration checks
    // =======================================================================
    
    result.push({
      id: 'join_code',
      name: 'Anslutningskod',
      category: 'configuration',
      status: input.hasJoinCode ? 'pass' : 'fail',
      weight: 20,
      current: input.hasJoinCode ? 1 : 0,
      target: 1,
      details: input.hasJoinCode
        ? 'Anslutningskod genererad'
        : 'Ingen anslutningskod',
      critical: true,
    });
    
    if (input.sessionName !== undefined) {
      result.push({
        id: 'session_name',
        name: 'Sessionsnamn',
        category: 'configuration',
        status: input.sessionName && input.sessionName.trim().length > 0 ? 'pass' : 'skip',
        weight: 2,
        current: input.sessionName ? 1 : 0,
        target: 1,
        details: input.sessionName || 'Inget namn (valfritt)',
        critical: false,
      });
    }
    
    return result;
  }, [input]);
  
  // Calculate overall readiness
  const { readinessPercent, readinessLabel, readinessColor } = useMemo(() => {
    // Only count non-skip checks
    const activeChecks = checks.filter((c) => c.status !== 'skip');
    if (activeChecks.length === 0) {
      return { readinessPercent: 100, readinessLabel: 'Redo', readinessColor: 'green' as const };
    }
    
    const totalWeight = activeChecks.reduce((sum, c) => sum + c.weight, 0);
    const earnedWeight = activeChecks.reduce((sum, c) => {
      if (c.status === 'pass') return sum + c.weight;
      if (c.status === 'warning') return sum + c.weight * 0.5;
      return sum;
    }, 0);
    
    const percent = Math.round((earnedWeight / totalWeight) * 100);
    
    let label: string;
    let color: 'red' | 'yellow' | 'green';
    
    if (percent >= 90) {
      label = 'Redo att starta';
      color = 'green';
    } else if (percent >= 70) {
      label = 'Nästan redo';
      color = 'yellow';
    } else if (percent >= 50) {
      label = 'Förberedelser pågår';
      color = 'yellow';
    } else {
      label = 'Inte redo';
      color = 'red';
    }
    
    return { readinessPercent: percent, readinessLabel: label, readinessColor: color };
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
  const summary = useMemo(() => {
    if (canStart && readinessPercent >= 90) {
      return 'Sessionen är redo att starta!';
    } else if (canStart) {
      return `${warnings.length} sak(er) att förbättra, men du kan starta.`;
    } else {
      return `${criticalIssues.length} kritiska problem måste lösas innan start.`;
    }
  }, [canStart, readinessPercent, warnings.length, criticalIssues.length]);
  
  return {
    readinessPercent,
    readinessLabel,
    readinessColor,
    checks,
    checksByCategory,
    criticalIssues,
    warnings,
    canStart,
    summary,
  };
}

export { CATEGORY_LABELS as READINESS_CATEGORY_LABELS };
