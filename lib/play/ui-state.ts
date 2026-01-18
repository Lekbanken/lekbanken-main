export type UiMode = 'lobby' | 'live' | 'paused' | 'ended' | 'locked';
export type ConnectionHealth = 'connected' | 'degraded' | 'offline';
export type SessionBanner =
  | 'waiting'
  | 'paused'
  | 'locked'
  | 'ended'
  | 'degraded'
  | 'offline'
  | 'none';

export type AllowedActions = {
  start: boolean;
  pause: boolean;
  resume: boolean;
  end: boolean;
  advanceStep: boolean;
  revealArtifacts: boolean;
  fireManualTriggers: boolean;
};

export type UiState = {
  uiMode: UiMode;
  banner: SessionBanner;
  connection: ConnectionHealth;
  allowed: AllowedActions;
};

const TEN_SECONDS = 10_000;
const THIRTY_SECONDS = 30_000;

export function resolveConnectionHealth(input: {
  lastRealtimeAt?: string | null;
  lastPollAt?: string | null;
  now?: number;
}): ConnectionHealth {
  const now = input.now ?? Date.now();
  const realtimeAge = input.lastRealtimeAt ? now - new Date(input.lastRealtimeAt).getTime() : Number.POSITIVE_INFINITY;
  const pollAge = input.lastPollAt ? now - new Date(input.lastPollAt).getTime() : Number.POSITIVE_INFINITY;

  if (realtimeAge < TEN_SECONDS) return 'connected';
  if (pollAge < THIRTY_SECONDS) return 'degraded';
  return 'offline';
}

export function resolveUiMode(input: {
  status: string | null | undefined;
  startedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
}): UiMode {
  const status = input.status ?? 'active';

  if (input.endedAt) return 'ended';
  if (status === 'ended' || status === 'archived' || status === 'cancelled') return 'ended';
  if (status === 'paused' || input.pausedAt) return 'paused';
  if (status === 'locked') return 'locked';
  if (status === 'active' && !input.startedAt) return 'lobby';
  if (status === 'active' && input.startedAt) return 'live';

  return 'lobby';
}

export function resolveSessionBanner(uiMode: UiMode, connection: ConnectionHealth): SessionBanner {
  if (connection === 'offline') return 'offline';
  if (connection === 'degraded') return 'degraded';

  switch (uiMode) {
    case 'lobby':
      return 'waiting';
    case 'paused':
      return 'paused';
    case 'locked':
      return 'locked';
    case 'ended':
      return 'ended';
    case 'live':
    default:
      return 'none';
  }
}

export function resolveAllowedActions(uiMode: UiMode): AllowedActions {
  return {
    start: uiMode === 'lobby',
    pause: uiMode === 'live',
    resume: uiMode === 'paused',
    end: uiMode === 'live' || uiMode === 'paused' || uiMode === 'locked' || uiMode === 'lobby',
    advanceStep: uiMode === 'live',
    revealArtifacts: uiMode === 'live',
    fireManualTriggers: uiMode === 'live',
  };
}

export function resolveUiState(input: {
  status: string | null | undefined;
  startedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
  lastRealtimeAt?: string | null;
  lastPollAt?: string | null;
}): UiState {
  const uiMode = resolveUiMode({
    status: input.status,
    startedAt: input.startedAt,
    pausedAt: input.pausedAt,
    endedAt: input.endedAt,
  });
  const connection = resolveConnectionHealth({ lastRealtimeAt: input.lastRealtimeAt, lastPollAt: input.lastPollAt });
  const banner = resolveSessionBanner(uiMode, connection);
  const allowed = resolveAllowedActions(uiMode);

  return { uiMode, banner, connection, allowed };
}
