/**
 * Play Session API Client
 * 
 * Client-side API for fetching session data for the Legendary Play runtime.
 * Used by both host (FacilitatorDashboard) and participant views.
 * 
 * NOTE: Uses 'as any' casts for new tables not in generated Supabase types yet.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SessionRuntimeState, SessionRole } from '@/types/play-runtime';

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
  media?: { type: string; url: string };
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
}

export interface PhaseInfo {
  id: string;
  index: number;
  name: string;
  description?: string;
  duration?: number | null;
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
    const phases: PhaseInfo[] = [];
    let gameTitle = session.displayName || 'Session';
    
    // If game is linked, fetch game data
    if (session.gameId) {
      const gameRes = await fetch(`/api/games/${session.gameId}`, {
        cache: 'no-store',
      });
      
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        gameTitle = gameData.game?.name || gameTitle;
        
        // Fetch game steps
        const stepsRes = await fetch(`/api/games/${session.gameId}/steps`, {
          cache: 'no-store',
        });
        
        if (stepsRes.ok) {
          const stepsData = await stepsRes.json();
          steps = (stepsData.steps || []).map((s: any, index: number) => ({
            id: s.id || `step-${index}`,
            index,
            title: s.title || `Steg ${index + 1}`,
            description: s.description || s.content || '',
            content: s.content || s.description || '',
            durationMinutes: s.duration_minutes || (s.duration_seconds ? Math.ceil(s.duration_seconds / 60) : undefined),
            duration: s.duration_seconds || null,
            media: s.media_url ? { type: 'image', url: s.media_url } : undefined,
            materials: s.materials || undefined,
            safety: s.safety || undefined,
            tag: s.tag || undefined,
            note: s.note || undefined,
          }));
        }
        
        // TODO: Fetch phases when phases API exists
        // For now, phases are empty or derived from steps
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
    const runtimeState: Partial<SessionRuntimeState> = {
      current_step_index: session.currentStepIndex ?? 0,
      current_phase_index: session.currentPhaseIndex ?? 0,
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
      participantCount: session.participantCount ?? 0,
    };
  } catch (error) {
    console.error('[getHostPlaySession] Error:', error);
    return null;
  }
}

/**
 * Update session runtime state.
 */
export async function updatePlaySessionState(
  sessionId: string,
  updates: Partial<SessionRuntimeState>
): Promise<boolean> {
  try {
    const res = await fetch(`/api/play/sessions/${sessionId}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    return res.ok;
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
        }
      } catch {
        // Game data fetch failed, continue with defaults
      }
    }
    
    // Fetch participant's assigned role
    let assignedRole: SessionRole | null = null;
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
      }
    } catch {
      // Role fetch failed, continue without role
    }
    
    // Build runtime state
    const runtimeState: Partial<SessionRuntimeState> = {
      current_step_index: session.currentStepIndex ?? 0,
      current_phase_index: session.currentPhaseIndex ?? 0,
      timer_state: session.timerState ?? null,
      board_state: session.boardState ?? null,
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
      participantCount: session.participantCount ?? 0,
      assignedRole,
      participantName: participant.displayName,
      participantId: participant.id,
    };
  } catch (error) {
    console.error('[getParticipantPlaySession] Error:', error);
    return null;
  }
}
