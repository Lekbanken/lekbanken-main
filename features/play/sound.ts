/**
 * Sound effects utility — premium micro-interactions (v1).
 *
 * Same laws as haptics.ts:
 * - **Only user-initiated actions** (drawer, expand, vote confirm)
 * - **Never** passive events (TriggerLane, realtime, timers, overlays)
 * - **Best-effort / no-throw** — silent on unsupported browsers
 * - **Default OFF** — gated by localStorage `play_sfx`
 * - **Rate-limited** per key (150ms) to prevent mash-spam
 *
 * Asset strategy: tries `/sfx/*.mp3` first, falls back to WebAudio synthesis.
 * To upgrade: drop real mp3s in `/public/sfx/` and they'll be used automatically.
 *
 * iOS note: AudioContext requires a user gesture to resume. We handle this
 * by only calling playSfx from click/tap handlers (which is already enforced
 * by our "only user-initiated" rule).
 */

const isBrowser = typeof window !== 'undefined';

// =============================================================================
// SFX Keys — the only sounds in v1
// =============================================================================

/** Drawer open/close — short, subtle tick */
export const SFX_TICK = 'tick' as const;

/** Artifact expand/collapse — light tap */
export const SFX_TAP = 'tap' as const;

/** Decision confirm/submit — affirmative, slightly longer */
export const SFX_CONFIRM = 'confirm' as const;

export type SfxKey = typeof SFX_TICK | typeof SFX_TAP | typeof SFX_CONFIRM;

// =============================================================================
// Settings gate
// =============================================================================

const SFX_STORAGE_KEY = 'play_sfx';

/** Check if SFX are enabled. Default OFF. */
export function isSfxEnabled(): boolean {
  if (!isBrowser) return false;
  try {
    return localStorage.getItem(SFX_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

/** Toggle SFX preference. */
export function setSfxEnabled(on: boolean): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(SFX_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage full or blocked — silently ignore
  }
}

// =============================================================================
// Rate limiter — prevents mash-spam (150ms per key)
// =============================================================================

const RATE_LIMIT_MS = 150;
const lastPlayedAt = new Map<SfxKey, number>();

function isRateLimited(key: SfxKey): boolean {
  const now = Date.now();
  const last = lastPlayedAt.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) return true;
  lastPlayedAt.set(key, now);
  return false;
}

// =============================================================================
// Audio cache + lazy init
// =============================================================================

/** Cached HTMLAudioElement per key (for mp3 assets) */
const audioCache = new Map<SfxKey, HTMLAudioElement>();

/** Shared AudioContext for WebAudio fallback (lazy) */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!isBrowser) return null;
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}

// =============================================================================
// WebAudio synthesis fallback — tiny programmatic tones
// =============================================================================

interface ToneParams {
  frequency: number;
  duration: number;
  volume: number;
  /** 'sine' | 'triangle' for different timbres */
  type: OscillatorType;
}

const TONE_PRESETS: Record<SfxKey, ToneParams> = {
  tick:    { frequency: 1200, duration: 0.03, volume: 0.08, type: 'sine' },
  tap:     { frequency: 800,  duration: 0.05, volume: 0.06, type: 'triangle' },
  confirm: { frequency: 880,  duration: 0.10, volume: 0.10, type: 'sine' },
};

function playTone(params: ToneParams): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended (iOS requires user gesture)
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = params.type;
  osc.frequency.setValueAtTime(params.frequency, ctx.currentTime);

  gain.gain.setValueAtTime(params.volume, ctx.currentTime);
  // Quick fade-out to avoid clicks
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + params.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + params.duration);
}

// =============================================================================
// Asset paths — mp3 files in /public/sfx/
// =============================================================================

const ASSET_PATHS: Record<SfxKey, string> = {
  tick: '/sfx/ui-tick.mp3',
  tap: '/sfx/ui-tap.mp3',
  confirm: '/sfx/ui-confirm.mp3',
};

/** Try to play cached mp3. Returns true if successful. */
function tryPlayAsset(key: SfxKey): boolean {
  try {
    let audio = audioCache.get(key);
    if (!audio) {
      audio = new Audio(ASSET_PATHS[key]);
      audio.volume = TONE_PRESETS[key].volume;
      audio.preload = 'auto';
      audioCache.set(key, audio);
    }
    // Reset to start if already playing
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise) promise.catch(() => { /* silent — asset missing or blocked */ });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Play a sound effect. Best-effort, never throws.
 *
 * Rules:
 * - Setting gate: respects `play_sfx` localStorage (default OFF)
 * - Rate-limited: 150ms per key
 * - Tries mp3 asset first, falls back to WebAudio synthesis
 * - Only call from user-gesture handlers (click/tap)
 */
export function playSfx(key: SfxKey): void {
  try {
    if (!isBrowser) return;
    if (!isSfxEnabled()) return;
    if (isRateLimited(key)) return;

    // Try mp3 asset first; fall back to WebAudio tone
    if (!tryPlayAsset(key)) {
      playTone(TONE_PRESETS[key]);
    }
  } catch {
    // Absolute safety net — never throw from SFX
  }
}
