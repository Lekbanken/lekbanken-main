/**
 * Play Session API Client
 * 
 * Client-side API for fetching session data for the Legendary Play runtime.
 * Used by both host (FacilitatorDashboard) and participant views.
 * 
 * NOTE: Uses temporary type assertions for a few newer tables.
 */

import type { SessionRuntimeState, SessionRole } from '@/types/play-runtime';
import type { BoardTheme } from '@/types/games';

// Local step/phase types for API responses
// Must match StepPhaseNavigation.StepInfo and ParticipantPlayView.StepData
export interface StepInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  content?: string;
  durationMinutes?: number;
  duration?: number | null;
  display_mode?: 'instant' | 'typewriter' | 'dramatic' | null;
  media?: { type: string; url: string };
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
  leaderScript?: string;
}

export interface PhaseInfo {
  id: string;
  index: number;
  name: string;
  description?: string;
  duration?: number | null;
}

export interface AdminOverrides {
  steps?: Array<{
    id: string;
    title?: string;
    description?: string;
    durationMinutes?: number;
    order?: number;
    display_mode?: 'instant' | 'typewriter' | 'dramatic' | null;
  }>;
  phases?: Array<{
    id: string;
    name?: string;
    description?: string;
    duration?: number | null;
    order?: number;
  }>;
  safety?: {
    safetyNotes?: string;
    accessibilityNotes?: string;
    spaceRequirements?: string;
    leaderTips?: string;
  };
}

// =============================================================================
// Types
// =============================================================================

export interface PlaySessionData {
  /** Session ID */
  sessionId: string;
  /** Game ID (if linked) */
  gameId: string | null;
  /** Game title */
  gameTitle: string;
  /** Steps from game */
  steps: StepInfo[];
  /** Phases from game */
  phases: PhaseInfo[];
  /** Roles snapshotted to session */
  sessionRoles: SessionRole[];
  /** Current runtime state */
  runtimeState: Partial<SessionRuntimeState>;
  /** Board theme (from game board config) */
  boardTheme?: BoardTheme;
  /** Enabled tools for this game's toolbelt */
  tools: Array<{ tool_key: string; enabled?: boolean; scope?: string }>;
  /** Participant count */
  participantCount: number;
}

export interface ParticipantPlayData extends PlaySessionData {
  /** Current participant's assigned role (if any) */
  assignedRole: SessionRole | null;
  /** Participant display name */
  participantName: string;
  /** Participant ID */
  participantId: string;
  /** Whether this participant is marked as next starter */
  isNextStarter?: boolean;

  /** When this participant has revealed their own secret role instructions */
  secretRoleRevealedAt: string | null;
}

// =============================================================================
// Host API
// =============================================================================

/**
 * Fetch full session data for facilitator dashboard.
 */
export async function getHostPlaySession(sessionId: string): Promise<PlaySessionData | null> {
  try {
    // Fetch session with game
    const sessionRes = await fetch(`/api/play/sessions/${sessionId}`, {
      cache: 'no-store',
    });
    
    if (!sessionRes.ok) {
      console.error('[getHostPlaySession] Session fetch failed:', sessionRes.status);
      return null;
    }
    
    const { session } = await sessionRes.json();
    
    if (!session) {
      return null;
    }
    
    // Default empty data if no game linked
    let steps: StepInfo[] = [];
    let phases: PhaseInfo[] = [];
    let gameTitle = session.displayName || 'Session';
    let boardTheme: BoardTheme | undefined;
    let tools: Array<{ tool_key: string; enabled?: boolean; scope?: string }> = [];

    // If game is linked, fetch game+steps/phases through Play API
    if (session.gameId) {
      const gameRes = await fetch(`/api/play/sessions/${sessionId}/game`, {
        cache: 'no-store',
      });

      if (gameRes.ok) {
        const gameData = await gameRes.json();
        gameTitle = gameData.title || gameTitle;
        steps = gameData.steps || [];
        phases = gameData.phases || [];
        boardTheme = gameData.board?.theme;
        tools = Array.isArray(gameData.tools) ? gameData.tools : [];
      }
    }
    
    // Fetch session roles
    const rolesRes = await fetch(`/api/play/sessions/${sessionId}/roles`, {
      cache: 'no-store',
    });
    
    let sessionRoles: SessionRole[] = [];
    if (rolesRes.ok) {
      const rolesData = await rolesRes.json();
      sessionRoles = rolesData.roles || [];
    }
    
    // Build runtime state from session
    // Use -1 as default to indicate "not started yet"
    const runtimeState: Partial<SessionRuntimeState> = {
      current_step_index: session.currentStepIndex ?? -1,
      current_phase_index: session.currentPhaseIndex ?? -1,
      timer_state: session.timerState ?? null,
      board_state: session.boardState ?? null,
      status: session.status ?? 'active',
    };
    
    return {
      sessionId,
      gameId: session.gameId || null,
      gameTitle,
      steps,
      phases,
      sessionRoles,
      runtimeState,
      boardTheme,
      tools,
      participantCount: session.participantCount ?? 0,
    };
  } catch (error) {
    console.error('[getHostPlaySession] Error:', error);
    return null;
  }
}

// =============================================================================
// Admin Overrides API
// =============================================================================

export async function getSessionOverrides(sessionId: string): Promise<AdminOverrides | null> {
  try {
    const res = await fetch(`/api/play/sessions/${sessionId}/overrides`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { overrides?: AdminOverrides };
    return data.overrides ?? null;
  } catch (error) {
    console.error('[getSessionOverrides] Error:', error);
    return null;
  }
}

export async function updateSessionOverrides(
  sessionId: string,
  overrides: AdminOverrides
): Promise<boolean> {
  try {
    const res = await fetch(`/api/play/sessions/${sessionId}/overrides`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides),
    });
    return res.ok;
  } catch (error) {
    console.error('[updateSessionOverrides] Error:', error);
    return false;
  }
}

export type SessionRoleUpdate = {
  id: string;
  name?: string;
  public_description?: string;
  private_instructions?: string;
  min_count?: number;
  max_count?: number | null;
  icon?: string | null;
  color?: string | null;
};

export async function updateSessionRoles(
  sessionId: string,
  roles: SessionRoleUpdate[]
): Promise<boolean> {
  try {
    const res = await fetch(`/api/play/sessions/${sessionId}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles }),
    });
    return res.ok;
  } catch (error) {
    console.error('[updateSessionRoles] Error:', error);
    return false;
  }
}

/**
 * Update session runtime state.
 */
export async function updatePlaySessionState(
  sessionId: string,
  updates: Partial<SessionRuntimeState>,
  previousState?: Partial<SessionRuntimeState>
): Promise<boolean> {
  try {
    // Session status is updated through the session endpoint
    if (typeof updates.status === 'string') {
      const action =
        updates.status === 'paused'
          ? 'pause'
          : updates.status === 'active'
            ? 'resume'
            : updates.status === 'ended'
              ? 'end'
              : null;

      if (action) {
        const statusRes = await fetch(`/api/play/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        if (!statusRes.ok) return false;
      }
    }

    // Step/phase/timer/board updates are handled via the runtime state endpoint
    if (typeof updates.current_step_index === 'number') {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_step', step_index: updates.current_step_index }),
      });
      if (!res.ok) return false;
    }

    if (typeof updates.current_phase_index === 'number') {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_phase', phase_index: updates.current_phase_index }),
      });
      if (!res.ok) return false;
    }

    if (updates.timer_state !== undefined) {
      const prev = previousState?.timer_state ?? null;
      const next = updates.timer_state ?? null;

      if (next === null) {
        const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'timer_reset' }),
        });
        if (!res.ok) return false;
      } else if (prev === null) {
        const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'timer_start', duration_seconds: next.duration_seconds }),
        });
        if (!res.ok) return false;
      } else if (prev.paused_at === null && next.paused_at !== null) {
        const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'timer_pause' }),
        });
        if (!res.ok) return false;
      } else if (prev.paused_at !== null && next.paused_at === null) {
        const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'timer_resume' }),
        });
        if (!res.ok) return false;
      } else if (
        prev.started_at !== next.started_at ||
        prev.duration_seconds !== next.duration_seconds
      ) {
        const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'timer_start', duration_seconds: next.duration_seconds }),
        });
        if (!res.ok) return false;
      }
    }

    if (updates.board_state !== undefined) {
      const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_board_message',
          message: updates.board_state?.message ?? null,
          overrides: updates.board_state?.overrides,
        }),
      });
      if (!res.ok) return false;
    }

    return true;
  } catch (error) {
    console.error('[updatePlaySessionState] Error:', error);
    return false;
  }
}

// =============================================================================
// Participant API
// =============================================================================

/**
 * Fetch session data for participant play view.
 */
export async function getParticipantPlaySession(
  sessionCode: string,
  participantToken: string
): Promise<ParticipantPlayData | null> {
  try {
    // Fetch participant info with session
    const meRes = await fetch(`/api/play/me?session_code=${sessionCode}`, {
      headers: {
        'x-participant-token': participantToken,
      },
      cache: 'no-store',
    });
    
    if (!meRes.ok) {
      console.error('[getParticipantPlaySession] Me fetch failed:', meRes.status);
      return null;
    }
    
    const { participant, session } = await meRes.json();
    
    if (!participant || !session) {
      return null;
    }
    
    // Default empty data
    let steps: StepInfo[] = [];
    let phases: PhaseInfo[] = [];
    let gameTitle = session.displayName || 'Session';
    let boardTheme: BoardTheme | undefined;
    let tools: Array<{ tool_key: string; enabled?: boolean; scope?: string }> = [];
    
    // If game is linked, fetch public game data
    if (session.gameId) {
      // Note: This needs a public game endpoint
      // For now we just use the session's display name
      try {
        const gameRes = await fetch(`/api/play/sessions/${session.id}/game`, {
          headers: {
            'x-participant-token': participantToken,
          },
          cache: 'no-store',
        });
        
        if (gameRes.ok) {
          const gameData = await gameRes.json();
          gameTitle = gameData.title || gameTitle;
          steps = gameData.steps || [];
          phases = gameData.phases || [];
          boardTheme = gameData.board?.theme;
          tools = Array.isArray(gameData.tools) ? gameData.tools : [];
        }
      } catch {
        // Game data fetch failed, continue with defaults
      }
    }
    
    // Fetch participant's assigned role
    let assignedRole: SessionRole | null = null;
    let secretRoleRevealedAt: string | null = null;
    try {
      const roleRes = await fetch(`/api/play/me/role?session_code=${sessionCode}`, {
        headers: {
          'x-participant-token': participantToken,
        },
        cache: 'no-store',
      });
      
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        assignedRole = roleData.role || null;
        secretRoleRevealedAt = roleData.secretRevealedAt || null;
      }
    } catch {
      // Role fetch failed, continue without role
    }
    
    // Build runtime state
    // Use -1 as default to indicate "not started yet"
    const runtimeState: Partial<SessionRuntimeState> = {
      current_step_index: session.currentStepIndex ?? -1,
      current_phase_index: session.currentPhaseIndex ?? -1,
      timer_state: session.timerState ?? null,
      board_state: session.boardState ?? null,
      secret_instructions_unlocked_at: session.secretInstructionsUnlockedAt ?? null,
      secret_instructions_unlocked_by: session.secretInstructionsUnlockedBy ?? null,
      status: session.status ?? 'active',
    };
    
    return {
      sessionId: session.id,
      gameId: session.gameId || null,
      gameTitle,
      steps,
      phases,
      sessionRoles: [], // Participants don't see all roles
      runtimeState,
      boardTheme,
      tools,
      participantCount: session.participantCount ?? 0,
      assignedRole,
      participantName: participant.displayName,
      participantId: participant.id,
      isNextStarter: Boolean(participant.isNextStarter),
      secretRoleRevealedAt,
    };
  } catch (error) {
    console.error('[getParticipantPlaySession] Error:', error);
    return null;
  }
}
