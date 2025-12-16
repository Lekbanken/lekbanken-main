/**
 * Play Broadcast Utilities
 * 
 * Utilities for broadcasting play runtime events via Supabase Realtime.
 * Used by facilitators to push state changes to all session participants.
 */

import { createBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  PlayBroadcastEvent,
  StateChangeBroadcast,
  TimerBroadcast,
  RoleBroadcast,
  BoardBroadcast,
  TimerState,
  BoardState,
} from '@/types/play-runtime';

// =============================================================================
// Channel Name Conventions
// =============================================================================

/**
 * Get the broadcast channel name for a session.
 * Uses existing convention: `session:${sessionId}`
 */
export function getSessionChannelName(sessionId: string): string {
  return `session:${sessionId}`;
}

/**
 * Get the play-specific channel name for a session.
 * Used for play runtime events specifically.
 */
export function getPlayChannelName(sessionId: string): string {
  return `play:${sessionId}`;
}

// =============================================================================
// Broadcast Event Names
// =============================================================================

export const PLAY_BROADCAST_EVENTS = {
  /** General play runtime event */
  PLAY_EVENT: 'play_event',
  /** State change (step/phase) */
  STATE_CHANGE: 'state_change',
  /** Timer update */
  TIMER_UPDATE: 'timer_update',
  /** Role assignment/reveal */
  ROLE_UPDATE: 'role_update',
  /** Board message/config update */
  BOARD_UPDATE: 'board_update',
} as const;

// =============================================================================
// Broadcast Builder Functions
// =============================================================================

/**
 * Create a state change broadcast event.
 */
export function createStateChangeBroadcast(
  payload: StateChangeBroadcast['payload']
): StateChangeBroadcast {
  return {
    type: 'state_change',
    payload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a timer broadcast event.
 */
export function createTimerBroadcast(
  action: 'start' | 'pause' | 'resume' | 'reset',
  timerState: TimerState | null
): TimerBroadcast {
  return {
    type: 'timer_update',
    payload: {
      action,
      timer_state: timerState,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a role broadcast event.
 */
export function createRoleBroadcast(
  action: 'assigned' | 'revealed',
  participantId: string,
  roleId?: string,
  roleName?: string
): RoleBroadcast {
  return {
    type: 'role_update',
    payload: {
      action,
      participant_id: participantId,
      role_id: roleId,
      role_name: roleName,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a board broadcast event.
 */
export function createBoardBroadcast(
  message?: string,
  overrides?: BoardState['overrides']
): BoardBroadcast {
  return {
    type: 'board_update',
    payload: {
      message,
      overrides,
    },
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// PlayBroadcaster Class
// =============================================================================

export interface PlayBroadcasterOptions {
  sessionId: string;
  /** If true, also receive own broadcasts (useful for confirmation) */
  selfBroadcast?: boolean;
}

/**
 * PlayBroadcaster - Manages broadcasting play events for a session.
 * 
 * @example
 * const broadcaster = new PlayBroadcaster({ sessionId: 'abc123' });
 * await broadcaster.connect();
 * 
 * // Send state change
 * await broadcaster.sendStateChange({ current_step_index: 1 });
 * 
 * // Send timer update
 * await broadcaster.sendTimerUpdate('start', timerState);
 * 
 * // Cleanup
 * broadcaster.disconnect();
 */
export class PlayBroadcaster {
  private sessionId: string;
  private channel: RealtimeChannel | null = null;
  private connected = false;
  private selfBroadcast: boolean;
  
  constructor(options: PlayBroadcasterOptions) {
    this.sessionId = options.sessionId;
    this.selfBroadcast = options.selfBroadcast ?? false;
  }
  
  /**
   * Connect to the broadcast channel.
   */
  async connect(): Promise<boolean> {
    if (this.connected) return true;
    
    const supabase = createBrowserClient();
    const channelName = getPlayChannelName(this.sessionId);
    
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: this.selfBroadcast },
      },
    });
    
    return new Promise((resolve) => {
      this.channel!.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.connected = true;
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.connected = false;
          resolve(false);
        }
      });
    });
  }
  
  /**
   * Disconnect from the broadcast channel.
   */
  disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
      this.connected = false;
    }
  }
  
  /**
   * Check if connected to the channel.
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Send a raw broadcast event.
   */
  private async send(event: PlayBroadcastEvent): Promise<boolean> {
    if (!this.channel || !this.connected) {
      console.warn('[PlayBroadcaster] Not connected, cannot send:', event);
      return false;
    }
    
    await this.channel.send({
      type: 'broadcast',
      event: PLAY_BROADCAST_EVENTS.PLAY_EVENT,
      payload: event,
    });
    
    return true;
  }
  
  /**
   * Send a state change broadcast.
   */
  async sendStateChange(
    payload: StateChangeBroadcast['payload']
  ): Promise<boolean> {
    return this.send(createStateChangeBroadcast(payload));
  }
  
  /**
   * Send a timer update broadcast.
   */
  async sendTimerUpdate(
    action: 'start' | 'pause' | 'resume' | 'reset',
    timerState: TimerState | null
  ): Promise<boolean> {
    return this.send(createTimerBroadcast(action, timerState));
  }
  
  /**
   * Send a role update broadcast.
   */
  async sendRoleUpdate(
    action: 'assigned' | 'revealed',
    participantId: string,
    roleId?: string,
    roleName?: string
  ): Promise<boolean> {
    return this.send(createRoleBroadcast(action, participantId, roleId, roleName));
  }
  
  /**
   * Send a board update broadcast.
   */
  async sendBoardUpdate(
    message?: string,
    overrides?: BoardState['overrides']
  ): Promise<boolean> {
    return this.send(createBoardBroadcast(message, overrides));
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a PlayBroadcaster instance for a session.
 */
export function createPlayBroadcaster(sessionId: string): PlayBroadcaster {
  return new PlayBroadcaster({ sessionId });
}
