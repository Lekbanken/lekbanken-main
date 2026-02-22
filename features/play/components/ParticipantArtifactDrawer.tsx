/**
 * ParticipantArtifactDrawer v2 — Tactility + Clarity
 *
 * Collapsible drawer showing participant-visible artifacts.
 * Follows the 2A rule: artifacts are always secondary to the Stage.
 *
 * v2 additions:
 * - 3-state system: Used → Highlighted → Available
 *   (No "locked" state — server doesn't send placeholders, so showing locked
 *    cards would create false anticipation. If server adds placeholder teasers
 *    with `access_state: 'locked'` in the future, re-add locked rendering here.)
 * - Inventory summary strip (highlighted / available / done counts)
 * - "Show latest" one-tap scroll to first highlighted
 * - Card → Expand pattern: body collapsed by default, one-line excerpt shown
 * - No auto-open — all interactions are user-driven (2A compliance)
 *
 * Renders: standard artifacts, keypad artifacts, puzzle artifacts,
 * conversation cards. Each type is handled inline since they were
 * already in the monolith.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { hapticTap, HAPTIC_LIGHT } from '../haptics';
import { playSfx, SFX_TAP } from '../sound';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  ParticipantSessionArtifact,
  ParticipantSessionArtifactVariant,
  SanitizedKeypadMetadata,
} from '@/features/play/api';

// ---------------------------------------------------------------------------
// Lazy-loaded heavy renderers — only fetched when the drawer is actually open
// ---------------------------------------------------------------------------
const PuzzleArtifactRenderer = dynamic(
  () =>
    import('@/features/play/components/PuzzleArtifactRenderer').then((m) => ({
      default: m.PuzzleArtifactRenderer,
    })),
  { ssr: false, loading: () => <div className="rounded-md border border-border p-3 animate-pulse h-24" /> },
);

const ConversationCardsCollectionArtifact = dynamic(
  () =>
    import('@/features/play/components/ConversationCardsCollectionArtifact').then((m) => ({
      default: m.ConversationCardsCollectionArtifact,
    })),
  { ssr: false, loading: () => <div className="rounded-md border border-border p-3 animate-pulse h-24" /> },
);

// =============================================================================
// Types
// =============================================================================

export interface ParticipantArtifactDrawerProps {
  sessionId: string;
  participantToken: string;
  artifacts: ParticipantSessionArtifact[];
  variantsByArtifactId: Map<string, ParticipantSessionArtifactVariant[]>;
  artifactsError: string | null;
  onRefresh: () => void;
  onClose: () => void;
  /** When true, drawer just opened — triggers autoscroll to first highlighted */
  isOpen?: boolean;
  /** Keypad state (lifted from parent) */
  keypadCodes: Record<string, string>;
  keypadSubmitting: Record<string, boolean>;
  keypadMessages: Record<string, { type: 'success' | 'error'; text: string } | null>;
  onKeypadCodeChange: (artifactId: string, value: string) => void;
  onKeypadSubmit: (artifactId: string, code: string) => void;
  onKeypadClearMessage: (artifactId: string) => void;
  /** Callback when artifacts state changes (e.g. puzzle solved) */
  onArtifactStateChange: () => void;
}

// Puzzle artifact types that trigger PuzzleArtifactRenderer
const PUZZLE_TYPES = [
  'riddle',
  'counter',
  'audio',
  'multi_answer',
  'qr_gate',
  'hint_container',
  'hotspot',
  'tile_puzzle',
  'cipher',
  'logic_grid',
  'prop_confirmation',
  'location_check',
  'sound_level',
  'replay_marker',
];

// Standard content types rendered as variant cards
const V1_STANDARD_TYPES: ReadonlySet<string> = new Set([
  'card', 'document', 'image',
  'signal_generator', 'time_bank_step', 'empty_artifact',
]);

// All known v1 artifact types — used for dev-only unknown-type detection
const V1_KNOWN_TYPES: ReadonlySet<string> = new Set([
  ...PUZZLE_TYPES,
  ...V1_STANDARD_TYPES,
  'conversation_cards_collection',
  'keypad',
]);

// =============================================================================
// UI LAW: No "locked" artifact state
// =============================================================================
//
// ✘ Server does NOT send placeholder/teaser variants.
// ✘ If a participant receives a variant, they have full access. Period.
// ✘ Do NOT re-introduce a "locked" rendering state unless the API returns
//   an explicit `access_state: 'locked'` field on placeholder objects.
//
// Rationale: showing locked cards without real placeholders creates false
// anticipation and confusion when things never unlock.
// =============================================================================

// =============================================================================
// Canonical "used" detection
// =============================================================================

/**
 * CANONICAL USED CHECK — the *single* source of truth for "is this variant done?"
 *
 * Priority: `used_at` column (v1.1 canonical) > metadata flags (v1 compat).
 * When the `used_at` DB migration lands and all writes use it, remove the
 * metadata fallback and simplify to `return Boolean(usedAt)`.
 *
 * RULE: UI must ONLY call this function. Never check metadata.solved/used inline.
 */
function isVariantUsed(metadata: unknown, usedAt?: string | null): boolean {
  // v1.1: canonical column takes precedence
  if (usedAt != null) return true;
  // v1 compat: derive from metadata bag
  // TODO: Remove metadata fallback when `used_at` is guaranteed populated
  //       by DB migration and backfill. After that: `return usedAt != null;`
  const meta = metadata as Record<string, unknown> | null | undefined;
  return Boolean(meta && (meta.solved === true || meta.used === true));
}

// =============================================================================
// Inventory summary helper — counts variant states across all standard artifacts
// =============================================================================

interface InventoryCounts {
  highlighted: number;
  available: number;
  used: number;
}

/** Classify every standard variant into exactly one bucket */
function computeInventoryCounts(
  artifacts: ParticipantSessionArtifact[],
  variantsByArtifactId: Map<string, ParticipantSessionArtifactVariant[]>,
): InventoryCounts {
  const counts: InventoryCounts = { highlighted: 0, available: 0, used: 0 };
  for (const a of artifacts) {
    // Skip non-standard types — they have their own state management
    if (
      a.artifact_type === 'conversation_cards_collection' ||
      a.artifact_type === 'keypad' ||
      PUZZLE_TYPES.includes(a.artifact_type ?? '')
    ) continue;

    // Dev-only: warn on unknown artifact types
    if (process.env.NODE_ENV === 'development' && a.artifact_type && !V1_KNOWN_TYPES.has(a.artifact_type)) {
      console.warn(`[ArtifactDrawer] Unknown artifact type: "${a.artifact_type}"`);
    }

    const vars = variantsByArtifactId.get(a.id) ?? [];
    for (const v of vars) {
      const isUsed = isVariantUsed(v.metadata, v.used_at);
      const isHighlighted = Boolean(v.highlighted_at);

      if (isUsed) counts.used++;
      else if (isHighlighted) counts.highlighted++;
      else counts.available++;
    }
  }
  return counts;
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantArtifactDrawer({
  sessionId,
  participantToken,
  artifacts,
  variantsByArtifactId,
  artifactsError,
  onRefresh,
  onClose: _onClose,
  isOpen = false,
  keypadCodes,
  keypadSubmitting,
  keypadMessages,
  onKeypadCodeChange,
  onKeypadSubmit,
  onKeypadClearMessage,
  onArtifactStateChange,
}: ParticipantArtifactDrawerProps) {
  const t = useTranslations('play.participantView');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Guard: only autoscroll once per open transition (false→true)
  const didAutoScrollRef = useRef(false);
  // Track which variant cards are expanded (card→expand pattern)
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((variantId: string) => {
    hapticTap(HAPTIC_LIGHT);
    playSfx(SFX_TAP);
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  }, []);

  // ── Inventory summary (memoised) ──
  const inventory = useMemo(
    () => computeInventoryCounts(artifacts, variantsByArtifactId),
    [artifacts, variantsByArtifactId],
  );

  const hasHighlighted = inventory.highlighted > 0;

  // ── "Show latest" scroll handler — user-driven, no auto-open ──
  const scrollToHighlighted = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const target = container.querySelector('[data-highlighted="true"]');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  // ── Autoscroll to first highlighted variant on open (once per transition) ──
  useEffect(() => {
    if (!isOpen) {
      // Reset when drawer closes so next open will autoscroll again
      didAutoScrollRef.current = false;
      return;
    }
    if (didAutoScrollRef.current) return;
    didAutoScrollRef.current = true;
    // Wait one frame for DOM to render
    const raf = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const target = container.querySelector('[data-highlighted="true"]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  return (
    <Card className="p-4 space-y-3">
      {/* Refresh — title + X are now in DrawerOverlay */}
      <div className="flex items-center justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onRefresh} className="h-7 w-7 p-0" aria-label="Refresh">
          ↻
        </Button>
      </div>

      {/* Inventory summary — compact stat strip */}
      {artifacts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {inventory.highlighted > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {inventory.highlighted} {t('artifactsDrawer.summaryNew')}
            </span>
          )}
          {inventory.available > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {inventory.available} {t('artifactsDrawer.summaryAvailable')}
            </span>
          )}
          {inventory.used > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/70">
              {inventory.used} {t('artifactsDrawer.summaryDone')}
            </span>
          )}
        </div>
      )}

      {/* "Show latest" — one-tap scroll to first highlighted (user-driven, not auto-open) */}
      {hasHighlighted && (
        <button
          type="button"
          onClick={scrollToHighlighted}
          className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.98]"
        >
          {t('artifactsDrawer.showLatest')}
        </button>
      )}

      {/* Error */}
      {artifactsError && <p className="text-sm text-destructive">{artifactsError}</p>}

      {/* Empty state */}
      {artifacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('artifactsDrawer.noArtifacts')}</p>
      ) : (
        <div ref={scrollContainerRef} className="space-y-3">
          {artifacts
            .slice()
            .sort((a, b) => (a.artifact_order ?? 0) - (b.artifact_order ?? 0))
            .map((a) => {
              const vars = variantsByArtifactId.get(a.id) ?? [];

              // Conversation cards collection
              if (a.artifact_type === 'conversation_cards_collection') {
                return (
                  <ConversationCardsCollectionArtifact
                    key={a.id}
                    sessionId={sessionId}
                    participantToken={participantToken}
                    artifactTitle={a.title ?? null}
                    artifactDescription={a.description ?? null}
                    metadata={(a.metadata ?? null) as Record<string, unknown> | null}
                  />
                );
              }

              // Keypad artifact
              if (a.artifact_type === 'keypad') {
                return (
                  <KeypadArtifact
                    key={a.id}
                    artifact={a}
                    variants={vars}
                    enteredCode={keypadCodes[a.id] || ''}
                    isSubmitting={Boolean(keypadSubmitting[a.id])}
                    message={keypadMessages[a.id] ?? null}
                    onCodeChange={(val) => onKeypadCodeChange(a.id, val)}
                    onSubmit={(code) => onKeypadSubmit(a.id, code)}
                    onClearMessage={() => onKeypadClearMessage(a.id)}
                    t={t}
                  />
                );
              }

              // Puzzle artifacts
              if (PUZZLE_TYPES.includes(a.artifact_type ?? '')) {
                return (
                  <PuzzleArtifactRenderer
                    key={a.id}
                    artifact={{
                      id: a.id,
                      title: a.title ?? null,
                      description: a.description ?? null,
                      artifact_type: a.artifact_type ?? null,
                      artifact_order: a.artifact_order ?? undefined,
                      metadata: a.metadata as Record<string, unknown> | null,
                    }}
                    sessionId={sessionId}
                    participantToken={participantToken}
                    onStateChange={onArtifactStateChange}
                  />
                );
              }

              // Standard artifact with variants
              if (vars.length === 0) return null;

              return (
                <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">{a.title ?? t('artifactStates.artifact')}</p>
                  {a.description && (
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  )}
                  <div className="space-y-2">
                    {vars.map((v) => {
                      const visibility = v.visibility ?? 'public';
                      const isPublicRevealed = visibility === 'public' && Boolean(v.revealed_at);
                      const isHighlighted = Boolean(v.highlighted_at);

                      // 3-state: used → highlighted → available
                      // No "locked" state — server filters access; if participant
                      // receives a variant, they have access. Period.
                      const isUsed = isVariantUsed(v.metadata, v.used_at);

                      const stateClasses = isUsed
                        ? 'bg-muted/20 border border-border opacity-70'
                        : isHighlighted
                          ? 'bg-primary/5 border-2 border-primary/30 shadow-sm'
                          : 'bg-muted/30';

                      const isExpanded = expandedVariants.has(v.id);
                      const hasBody = Boolean(v.body);

                      return (
                        <button
                          type="button"
                          key={v.id}
                          data-highlighted={isHighlighted && !isUsed ? 'true' : undefined}
                          onClick={() => hasBody && toggleExpand(v.id)}
                          className={`w-full rounded-lg p-2.5 text-left transition-colors select-none ${hasBody ? 'active:scale-[0.98] cursor-pointer' : ''} ${stateClasses}`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-medium ${isUsed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {v.title ?? t('artifactStates.card')}
                            </p>
                            {isUsed ? (
                              <Badge variant="secondary" className="text-[10px]">✓ {t('artifactStates.used')}</Badge>
                            ) : isPublicRevealed ? (
                              <Badge variant="secondary" className="text-[10px]">{t('artifactStates.public')}</Badge>
                            ) : visibility === 'role_private' ? (
                              <Badge variant="secondary" className="text-[10px]">{t('artifactStates.rolePrivate')}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">{t('artifactStates.private')}</Badge>
                            )}
                            {isHighlighted && !isUsed && (
                              <Badge variant="default" className="text-[10px] animate-pulse">{t('artifactStates.highlighted')}</Badge>
                            )}
                            {/* Expand chevron when body exists */}
                            {hasBody && (
                              <span className={`ml-auto text-xs text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                ▾
                              </span>
                            )}
                          </div>
                          {/* Body — card→expand: collapsed by default, revealed on tap */}
                          {hasBody && isExpanded && (
                            <p className={`mt-1.5 text-sm leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200 ${isUsed ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                              {v.body}
                            </p>
                          )}
                          {/* One-line excerpt when collapsed + has body */}
                          {hasBody && !isExpanded && (
                            <p className="mt-1 text-xs text-muted-foreground/50 truncate">
                              {v.body}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Keypad sub-component (extracted from monolith)
// =============================================================================

interface KeypadArtifactProps {
  artifact: ParticipantSessionArtifact;
  variants: ParticipantSessionArtifactVariant[];
  enteredCode: string;
  isSubmitting: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  onCodeChange: (value: string) => void;
  onSubmit: (code: string) => void;
  onClearMessage: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function KeypadArtifact({
  artifact: a,
  variants: vars,
  enteredCode,
  isSubmitting,
  message,
  onCodeChange,
  onSubmit,
  onClearMessage,
  t,
}: KeypadArtifactProps) {
  const meta = (a.metadata ?? {}) as Partial<SanitizedKeypadMetadata>;
  const keypadState = meta.keypadState ?? { isUnlocked: false, isLockedOut: false, attemptCount: 0 };
  const codeLength = meta.codeLength ?? 4;
  const maxAttempts = meta.maxAttempts;
  const successMessage = meta.successMessage || t('keypadArtifact.codeCorrect');
  const lockedMessage = meta.lockedMessage || t('keypadArtifact.keypadLocked');

  const isUnlocked = keypadState.isUnlocked;
  const isLockedOut = keypadState.isLockedOut;
  const attemptsRemaining =
    maxAttempts != null ? Math.max(0, maxAttempts - keypadState.attemptCount) : null;

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{isLockedOut ? '🔒' : isUnlocked ? '🔓' : '🔐'}</span>
          <p className="text-sm font-medium text-foreground">{a.title ?? 'Keypad'}</p>
        </div>
        <Badge variant={isUnlocked ? 'default' : isLockedOut ? 'destructive' : 'secondary'}>
          {isUnlocked
            ? t('keypad.unlocked')
            : isLockedOut
              ? t('keypad.locked')
              : t('keypad.lock')}
        </Badge>
      </div>
      {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}

      {isUnlocked ? (
        <div className="rounded bg-green-500/10 border border-green-500/30 p-2 text-center">
          <p className="text-xs font-medium text-green-600 dark:text-green-400">
            ✓ {successMessage}
          </p>
          {vars.length > 0 && (
            <div className="mt-2 space-y-1 text-left">
              {vars.map((v) => (
                <div key={v.id} className="rounded bg-muted/30 p-2">
                  <p className="text-sm font-medium">{v.title || t('keypad.unlocked')}</p>
                  {v.body && <p className="text-xs text-muted-foreground">{v.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isLockedOut ? (
        <div className="rounded bg-destructive/10 border border-destructive/30 p-2 text-center">
          <p className="text-xs font-medium text-destructive">🔒 {lockedMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={codeLength}
              placeholder={'•'.repeat(codeLength)}
              value={enteredCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, codeLength);
                onCodeChange(val);
                if (message?.type === 'error') {
                  onClearMessage();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && enteredCode.length === codeLength && !isSubmitting) {
                  onSubmit(enteredCode);
                }
              }}
              disabled={isSubmitting}
              className={`text-center text-lg tracking-[0.3em] font-mono h-9 ${
                message?.type === 'error' ? 'animate-shake border-destructive' : ''
              }`}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => onSubmit(enteredCode)}
              disabled={enteredCode.length !== codeLength || isSubmitting}
            >
              {isSubmitting ? '...' : '→'}
            </Button>
          </div>
          {attemptsRemaining !== null && (
            <p className="text-xs text-muted-foreground text-center">
              {t('keypadArtifact.attemptsRemaining', { count: attemptsRemaining })}
            </p>
          )}
          {message && (
            <p
              className={`text-xs text-center ${
                message.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
