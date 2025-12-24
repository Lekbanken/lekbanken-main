/**
 * Lobby Types for Legendary Play
 * 
 * Hub-and-Spoke navigation model for host session setup
 */

// ============================================================================
// Participant Types
// ============================================================================

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  /** Role assigned to this participant */
  roleId?: string;
  /** Whether participant is connected */
  isConnected: boolean;
  /** When they joined */
  joinedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  /** Secret information only this role sees */
  secrets?: string;
  /** Color for visual distinction */
  color?: string;
  /** Icon emoji */
  icon?: string;
  /** Is this the host role? */
  isHost?: boolean;
}

// ============================================================================
// Content Preview Types
// ============================================================================

export interface ContentStep {
  id: string;
  title: string;
  type: 'intro' | 'activity' | 'decision' | 'reveal' | 'outro';
  /** Is this step ready? */
  isReady: boolean;
  /** Issues with this step */
  issues?: string[];
}

export interface ContentPhase {
  id: string;
  title: string;
  steps: ContentStep[];
}

// ============================================================================
// Readiness Types
// ============================================================================

export type ReadinessLevel = 'ready' | 'warning' | 'error' | 'unknown';

export interface ReadinessCheck {
  key: string;
  label: string;
  status: ReadinessLevel;
  message?: string;
}

export interface SectionReadiness {
  section: string;
  level: ReadinessLevel;
  checks: ReadinessCheck[];
}

// ============================================================================
// Session Settings Types
// ============================================================================

export interface SessionSettings {
  /** Allow participants to see each other's names */
  showParticipantNames: boolean;
  /** Allow participants to chat */
  allowChat: boolean;
  /** Auto-advance when all participants are ready */
  autoAdvance: boolean;
  /** Require all participants to have roles */
  requireRoles: boolean;
  /** Maximum participants */
  maxParticipants: number;
  /** Session duration limit (minutes, 0 = no limit) */
  durationLimit: number;
}

// ============================================================================
// Lobby State
// ============================================================================

export interface LobbyState {
  sessionId: string;
  sessionName: string;
  sessionStatus: 'draft' | 'lobby' | 'active' | 'completed';
  
  participants: Participant[];
  roles: Role[];
  phases: ContentPhase[];
  triggerCount: number;
  
  settings: SessionSettings;
  
  /** Overall readiness */
  readiness: SectionReadiness[];
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  showParticipantNames: true,
  allowChat: true,
  autoAdvance: false,
  requireRoles: false,
  maxParticipants: 20,
  durationLimit: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

/** Calculate overall readiness level from section checks */
export function calculateOverallReadiness(sections: SectionReadiness[]): ReadinessLevel {
  if (sections.some(s => s.level === 'error')) return 'error';
  if (sections.some(s => s.level === 'warning')) return 'warning';
  if (sections.every(s => s.level === 'ready')) return 'ready';
  return 'unknown';
}

/** Count participants without roles */
export function countParticipantsWithoutRoles(participants: Participant[]): number {
  return participants.filter(p => !p.roleId).length;
}

/** Count content issues */
export function countContentIssues(phases: ContentPhase[]): number {
  return phases.reduce(
    (count, phase) => count + phase.steps.reduce(
      (stepCount, step) => stepCount + (step.issues?.length ?? 0),
      0
    ),
    0
  );
}
