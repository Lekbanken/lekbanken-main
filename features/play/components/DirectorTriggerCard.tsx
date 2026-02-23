/**
 * DirectorTriggerCard — Rich trigger card for Director Mode
 *
 * Displays a trigger with:
 *   - Header: Name + condition type badge + status indicator + meta badges
 *   - Body: "Activated by" description + "Effects" list (collapsible)
 *   - Footer: Fire Now / Rearm / Disable with gating + tooltips + pending states
 *   - Meta: Last triggered time, fired count, delay
 *
 * Hardened:
 *   - Null-safe payload adapter (graceful fallback for missing condition/actions)
 *   - Unknown condition/action types render fallback label instead of crashing
 *   - canFire / canArm / canDisable gating with tooltip reasons
 *   - Pending clears on server-ack (status change), 10s fallback with timeout callback
 *   - Director Override Mode: non-manual triggers require `overrideEnabled` to fire
 *   - Collapsible action chips when > MAX_VISIBLE_ACTIONS
 *
 * Uses CockpitTrigger (enriched with structured condition/action data)
 * rather than the full Trigger type to stay decoupled from builder state.
 *
 * QA test plan (9 scenarios + edge cases): docs/qa/director-triggers.md
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CockpitTrigger, TriggerActionResult, TriggerStatus } from '@/types/session-cockpit';
import {
  BoltIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// Constants
// ============================================================================

/** Max action chips visible before collapsing */
const MAX_VISIBLE_ACTIONS = 3;

/** Pending timeout — if server-ack hasn't arrived by now, show warning */
const PENDING_TIMEOUT_MS = 10_000;

/** Debug flag — set `localStorage.setItem('trigger:debug','1')` to enable */
const TRIGGER_DEBUG = typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('trigger:debug') === '1'; } catch { return false; }
})();
function triggerLog(msg: string, data?: Record<string, unknown>) {
  if (!TRIGGER_DEBUG) return;
  console.debug(`[TriggerCard] ${msg}`, data ?? '');
}

/** Inline spinner for pending buttons */
function PendingSpinner() {
  return (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

// ============================================================================
// Condition type metadata
// ============================================================================

interface ConditionTypeMeta {
  icon: string;
  labelKey: string;
  category: 'navigation' | 'puzzle' | 'interaction' | 'system';
}

const CONDITION_TYPE_META: Record<string, ConditionTypeMeta> = {
  phase_started:    { icon: '🎭', labelKey: 'phaseStarted', category: 'navigation' },
  phase_completed:  { icon: '🏁', labelKey: 'phaseCompleted', category: 'navigation' },
  step_started:     { icon: '📍', labelKey: 'stepStarted', category: 'navigation' },
  step_completed:   { icon: '✅', labelKey: 'stepCompleted', category: 'navigation' },
  keypad_correct:   { icon: '🔐', labelKey: 'keypadCorrect', category: 'puzzle' },
  keypad_failed:    { icon: '🚫', labelKey: 'keypadFailed', category: 'puzzle' },
  riddle_correct:   { icon: '🧩', labelKey: 'riddleCorrect', category: 'puzzle' },
  counter_reached:  { icon: '🔢', labelKey: 'counterReached', category: 'puzzle' },
  manual:           { icon: '🎯', labelKey: 'manual', category: 'system' },
  signal_received:  { icon: '📡', labelKey: 'signalReceived', category: 'system' },
  timer_ended:      { icon: '⏱️', labelKey: 'timerEnded', category: 'system' },
  artifact_unlocked:{ icon: '📦', labelKey: 'artifactUnlocked', category: 'interaction' },
  decision_resolved:{ icon: '🗳️', labelKey: 'decisionResolved', category: 'interaction' },
  audio_acknowledged:{ icon: '🔊', labelKey: 'audioAcknowledged', category: 'interaction' },
  multi_answer_complete: { icon: '📝', labelKey: 'multiAnswerComplete', category: 'puzzle' },
  scan_verified:    { icon: '📱', labelKey: 'scanVerified', category: 'puzzle' },
  hint_requested:   { icon: '💡', labelKey: 'hintRequested', category: 'interaction' },
  hotspot_found:    { icon: '🔍', labelKey: 'hotspotFound', category: 'puzzle' },
  hotspot_hunt_complete: { icon: '🎯', labelKey: 'hotspotHuntComplete', category: 'puzzle' },
  tile_puzzle_complete:  { icon: '🧩', labelKey: 'tilePuzzleComplete', category: 'puzzle' },
  cipher_decoded:   { icon: '🔑', labelKey: 'cipherDecoded', category: 'puzzle' },
  prop_confirmed:   { icon: '✋', labelKey: 'propConfirmed', category: 'interaction' },
  prop_rejected:    { icon: '❌', labelKey: 'propRejected', category: 'interaction' },
  location_verified:{ icon: '📍', labelKey: 'locationVerified', category: 'puzzle' },
  logic_grid_solved:{ icon: '🧮', labelKey: 'logicGridSolved', category: 'puzzle' },
  sound_level_triggered: { icon: '🔉', labelKey: 'soundLevelTriggered', category: 'interaction' },
  time_bank_expired:{ icon: '⏳', labelKey: 'timeBankExpired', category: 'system' },
  signal_generator_triggered: { icon: '📡', labelKey: 'signalGeneratorTriggered', category: 'system' },
  replay_marker_added: { icon: '🔖', labelKey: 'replayMarkerAdded', category: 'system' },
};

// ============================================================================
// Action type labels
// ============================================================================

const ACTION_ICON_MAP: Record<string, string> = {
  send_message: '💬',
  reveal_artifact: '📦',
  hide_artifact: '🙈',
  advance_step: '⏭️',
  advance_phase: '🎭',
  play_sound: '🔊',
  start_timer: '⏱️',
  show_countdown: '⏳',
  send_signal: '📡',
  increment_counter: '🔢',
  reset_counter: '🔄',
  send_hint: '💡',
  show_leader_script: '📖',
  time_bank_apply_delta: '⏳',
  time_bank_pause: '⏸️',
  trigger_signal: '📡',
  reset_keypad: '🔄',
  reset_riddle: '🔄',
  unlock_decision: '🗳️',
  lock_decision: '🔒',
  add_replay_marker: '🔖',
};

// ============================================================================
// Status config
// ============================================================================

function getStatusConfig(status: TriggerStatus) {
  switch (status) {
    case 'armed':
      return {
        variant: 'success' as const,
        borderClass: 'border-green-200 dark:border-green-800/50',
        bgClass: 'bg-green-50/50 dark:bg-green-950/10',
      };
    case 'fired':
      return {
        variant: 'secondary' as const,
        borderClass: 'border-border',
        bgClass: 'bg-muted/30',
      };
    case 'disabled':
      return {
        variant: 'secondary' as const,
        borderClass: 'border-border/50',
        bgClass: 'bg-muted/20 opacity-60',
      };
    case 'error':
      return {
        variant: 'error' as const,
        borderClass: 'border-red-200 dark:border-red-800/50',
        bgClass: 'bg-red-50/50 dark:bg-red-950/10',
      };
  }
}

// ============================================================================
// Gating helpers
// ============================================================================

type GateResult = { allowed: true } | { allowed: false; reason: string };

function canFireGate(
  trigger: CockpitTrigger,
  isManual: boolean,
  overrideEnabled: boolean,
  t: ReturnType<typeof useTranslations>,
): GateResult {
  if (trigger.status !== 'armed') return { allowed: false, reason: t('gating.notArmed') };
  if (trigger.executeOnce && trigger.firedCount > 0) return { allowed: false, reason: t('gating.alreadyFiredOnce') };
  if (!isManual && !overrideEnabled) return { allowed: false, reason: t('gating.overrideRequired') };
  return { allowed: true };
}

function canRearmGate(trigger: CockpitTrigger, t: ReturnType<typeof useTranslations>): GateResult {
  if (trigger.status === 'armed') return { allowed: false, reason: t('gating.alreadyArmed') };
  return { allowed: true };
}

function canDisableGate(trigger: CockpitTrigger, t: ReturnType<typeof useTranslations>): GateResult {
  if (trigger.status === 'disabled') return { allowed: false, reason: t('gating.alreadyDisabled') };
  return { allowed: true };
}

// ============================================================================
// Safe i18n accessor — returns key name if translation missing (unknown types)
// ============================================================================

function safeConditionLabel(
  condMeta: ConditionTypeMeta | undefined,
  conditionType: string,
  t: ReturnType<typeof useTranslations>,
): string {
  if (!condMeta) return conditionType; // unknown type: render raw
  try {
    return t(`conditionTypes.${condMeta.labelKey}`);
  } catch {
    return conditionType;
  }
}

function safeActionLabel(actionType: string, t: ReturnType<typeof useTranslations>): string {
  try {
    const label = t(`actionTypes.${actionType}`);
    // next-intl returns the key path if missing — detect that
    if (label === `actionTypes.${actionType}` || label.startsWith('play.directorDrawer.triggerCard.actionTypes.')) {
      return actionType.replace(/_/g, ' ');
    }
    return label;
  } catch {
    return actionType.replace(/_/g, ' ');
  }
}

// ============================================================================
// Props
// ============================================================================

export type PendingAction = 'fire' | 'rearm' | 'disable' | null;

export interface DirectorTriggerCardProps {
  trigger: CockpitTrigger;
  /** Fire this trigger manually */
  onFire?: (triggerId: string) => Promise<TriggerActionResult>;
  /** Re-arm a fired/disabled trigger */
  onRearm?: (triggerId: string) => Promise<TriggerActionResult>;
  /** Disable a single trigger */
  onDisable?: (triggerId: string) => Promise<TriggerActionResult>;
  /** Externally-managed pending action (if parent wants to control it) */
  pendingAction?: PendingAction;
  /** Director Override Mode enabled — allows firing non-manual triggers */
  overrideEnabled?: boolean;
  /** Called when a pending action exceeds the 10s timeout without server-ack */
  onPendingTimeout?: (triggerId: string, action: PendingAction) => void;
  /** Called when the HTTP request fails — provides full error result for diagnostic toasts */
  onRequestError?: (triggerId: string, action: PendingAction, result: Extract<TriggerActionResult, { ok: false }>) => void;
  /** Whether action buttons are disabled (e.g. preview mode) */
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DirectorTriggerCard({
  trigger,
  onFire,
  onRearm,
  onDisable,
  pendingAction: externalPending,
  overrideEnabled = false,
  onPendingTimeout,
  onRequestError,
  disabled = false,
  className,
}: DirectorTriggerCardProps) {
  const t = useTranslations('play.directorDrawer.triggerCard');
  const locale = useLocale();
  const [internalPending, setInternalPending] = useState<PendingAction>(null);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  /** Tracks the last HTTP result for timeout context + debug widget */
  const lastHttpResultRef = useRef<TriggerActionResult | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    httpStatus: number | null;
    durationMs: number | null;
    ackReason: string | null;
    errorCode: string | null;
    kind: string | null;
    executedActions: string[] | null;
    failedActions: Array<{ type: string; error: string }> | null;
  }>({ httpStatus: null, durationMs: null, ackReason: null, errorCode: null, kind: null, executedActions: null, failedActions: null });
  // Ack fingerprint: snapshot relevant fields per action type
  const ackSnapshot = useRef<{
    action: 'fire' | 'rearm' | 'disable';
    status: TriggerStatus;
    firedCount: number;
    lastFiredAt: string | undefined;
  } | null>(null);

  const pending = externalPending ?? internalPending;
  const isPending = pending !== null;

  // ── Null-safe payload adapter ──
  const conditionType = trigger.conditionType || (trigger.condition?.type as string) || 'unknown';
  const actions = Array.isArray(trigger.actions) ? trigger.actions : [];
  const conditionSummary = trigger.conditionSummary || conditionType.replace(/_/g, ' ');

  const statusConfig = getStatusConfig(trigger.status);
  const condMeta = CONDITION_TYPE_META[conditionType];
  const condIcon = condMeta?.icon ?? '⚡';

  const isManual = conditionType === 'manual';

  // ── Server-ack reconciliation via ack fingerprint ──
  // Each action type has its own ack condition (see docs/qa/director-triggers.md):
  //   fire:    firedCount increases OR lastFiredAt changes OR status becomes 'fired'
  //   rearm:   status becomes 'armed'
  //   disable: status becomes 'disabled'
  useEffect(() => {
    const snap = ackSnapshot.current;
    if (!internalPending || !snap) return;

    let acked = false;
    let ackReason = '';
    switch (snap.action) {
      case 'fire':
        if (trigger.firedCount > snap.firedCount) { acked = true; ackReason = 'firedCount increased'; }
        else if (trigger.lastFiredAt !== snap.lastFiredAt && trigger.lastFiredAt != null) { acked = true; ackReason = 'lastFiredAt changed'; }
        else if (trigger.status === 'fired') { acked = true; ackReason = 'status=fired'; }
        break;
      case 'rearm':
        if (trigger.status === 'armed') { acked = true; ackReason = 'status=armed'; }
        break;
      case 'disable':
        if (trigger.status === 'disabled') { acked = true; ackReason = 'status=disabled'; }
        break;
    }

    if (acked) {
      triggerLog('ack', { id: trigger.id, action: snap.action, reason: ackReason });
      const id = requestAnimationFrame(() => {
        setDebugInfo((prev) => ({ ...prev, ackReason }));
        setInternalPending(null);
        setTimedOut(false);
        ackSnapshot.current = null;
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
      });
      return () => cancelAnimationFrame(id);
    }
  }, [trigger.status, trigger.firedCount, trigger.lastFiredAt, trigger.id, internalPending]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, []);

  // ── Gating ──
  const fireGate = canFireGate(trigger, isManual, overrideEnabled, t);
  const rearmGate = canRearmGate(trigger, t);
  const disableGate = canDisableGate(trigger, t);

  // ── Action handlers with request-level ack (primary) + fingerprint reconciliation (secondary) ──
  const startPending = useCallback(
    async (action: 'fire' | 'rearm' | 'disable', handler?: (id: string) => Promise<TriggerActionResult>) => {
      if (!handler || isPending) return;
      // Reset debug info + HTTP ref for new action
      lastHttpResultRef.current = null;
      setDebugInfo({ httpStatus: null, durationMs: null, ackReason: null, errorCode: null, kind: null, executedActions: null, failedActions: null });

      // Snapshot ack fingerprint (secondary — reconciles if realtime update arrives)
      ackSnapshot.current = {
        action,
        status: trigger.status,
        firedCount: trigger.firedCount,
        lastFiredAt: trigger.lastFiredAt,
      };
      setInternalPending(action);
      setTimedOut(false);
      triggerLog('pending:start', { id: trigger.id, action, snap: ackSnapshot.current });

      // Fallback timeout — if neither HTTP response nor ack fingerprint clear pending
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = setTimeout(() => {
        triggerLog('pending:timeout', { id: trigger.id, action, httpReturned: lastHttpResultRef.current != null });
        setTimedOut(true);
        setInternalPending(null);
        ackSnapshot.current = null;
        onPendingTimeout?.(trigger.id, action);
      }, PENDING_TIMEOUT_MS);

      // PRIMARY ack: await HTTP response
      const httpStart = performance.now();
      const result = await handler(trigger.id);
      const durationMs = Math.round(performance.now() - httpStart);
      lastHttpResultRef.current = result;
      triggerLog('pending:httpResult', { id: trigger.id, action, ok: result.ok, durationMs, ...(result.ok ? {} : { errorCode: result.errorCode }) });

      // Update debug widget
      if (result.ok) {
        setDebugInfo((prev) => ({
          ...prev,
          httpStatus: 200,
          durationMs,
          errorCode: null,
          kind: null,
          executedActions: result.executedActions ?? null,
          failedActions: result.failedActions ?? null,
        }));
      } else {
        setDebugInfo((prev) => ({ ...prev, httpStatus: result.httpStatus, durationMs, errorCode: result.errorCode, kind: result.kind, executedActions: null, failedActions: null }));
      }

      // Clear pending on HTTP result (success or error — both mean request completed)
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      ackSnapshot.current = null;

      if (result.ok) {
        setInternalPending(null);
        setTimedOut(false);
      } else {
        // Request failed — clear pending and surface error
        setInternalPending(null);
        setTimedOut(false);
        onRequestError?.(trigger.id, action, result);
      }
    },
    [trigger.id, trigger.status, trigger.firedCount, trigger.lastFiredAt, isPending, onPendingTimeout, onRequestError],
  );

  const handleFire = useCallback(() => startPending('fire', onFire), [startPending, onFire]);
  const handleRearm = useCallback(() => startPending('rearm', onRearm), [startPending, onRearm]);
  const handleDisable = useCallback(() => startPending('disable', onDisable), [startPending, onDisable]);

  // ── Copy debug info ──
  const handleCopyDebug = useCallback(() => {
    const debug = {
      id: trigger.id,
      name: trigger.name,
      status: trigger.status,
      conditionType,
      condition: trigger.condition,
      actions: trigger.actions,
      firedCount: trigger.firedCount,
      lastFiredAt: trigger.lastFiredAt,
    };
    navigator.clipboard.writeText(JSON.stringify(debug, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [trigger, conditionType]);

  // ── Format last fired timestamp ──
  const lastFiredStr = trigger.lastFiredAt
    ? new Date(trigger.lastFiredAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  // ── Actions: visible vs collapsed ──
  const visibleActions = actionsExpanded ? actions : actions.slice(0, MAX_VISIBLE_ACTIONS);
  const hiddenCount = actions.length - MAX_VISIBLE_ACTIONS;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        statusConfig.borderClass,
        statusConfig.bgClass,
        isPending && 'ring-1 ring-primary/30',
        timedOut && 'ring-1 ring-destructive/50',
        className,
      )}
    >
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0" aria-hidden>
            {condIcon}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
              {trigger.name}
            </h4>
            {trigger.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {trigger.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Once badge */}
          {trigger.executeOnce && (
            <Badge variant="outline" size="sm">
              1×
            </Badge>
          )}
          {/* Delay badge */}
          {trigger.delaySeconds != null && trigger.delaySeconds > 0 && (
            <Badge variant="outline" size="sm">
              <ClockIcon className="h-3 w-3 mr-0.5" />
              {trigger.delaySeconds}s
            </Badge>
          )}
          {/* Condition type badge */}
          <Badge variant="outline" size="sm">
            {safeConditionLabel(condMeta, conditionType, t)}
          </Badge>
          {/* Status badge */}
          <Badge variant={statusConfig.variant} size="sm" dot>
            {t(`status.${trigger.status}`)}
          </Badge>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="mt-3 space-y-2">
        {/* Activated by */}
        <div className="flex items-start gap-2 text-xs">
          <span className="font-bold uppercase text-muted-foreground w-8 shrink-0 pt-0.5">
            {t('whenLabel')}
          </span>
          <span className="text-foreground">
            {conditionSummary}
          </span>
        </div>

        {/* Effects */}
        <div className="flex items-start gap-2 text-xs">
          <span className="font-bold uppercase text-muted-foreground w-8 shrink-0 pt-0.5">
            {t('thenLabel')}
          </span>
          <div className="flex flex-wrap gap-1">
            {actions.length > 0 ? (
              <>
                {visibleActions.map((action, i) => {
                  const actionType = (action?.type as string) ?? 'unknown';
                  const icon = ACTION_ICON_MAP[actionType] ?? '▶️';
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-background/80 border px-1.5 py-0.5 text-xs"
                    >
                      <span aria-hidden>{icon}</span>
                      <span>{safeActionLabel(actionType, t)}</span>
                    </span>
                  );
                })}
                {hiddenCount > 0 && !actionsExpanded && (
                  <button
                    type="button"
                    onClick={() => setActionsExpanded(true)}
                    className="inline-flex items-center gap-0.5 rounded-md bg-background/80 border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    +{hiddenCount}
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                )}
                {actionsExpanded && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActionsExpanded(false)}
                    className="inline-flex items-center gap-0.5 rounded-md bg-background/80 border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </button>
                )}
              </>
            ) : (
              <span className="text-muted-foreground italic">
                {trigger.actionSummary || t('noActions')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── META ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {isManual && (
          <span className="flex items-center gap-1">
            <BoltIcon className="h-3 w-3" />
            {t('meta.manual')}
          </span>
        )}
        {trigger.firedCount > 0 && (
          <span className="flex items-center gap-1">
            {t('meta.firedCount', { count: trigger.firedCount })}
          </span>
        )}
        {lastFiredStr && (
          <span className="flex items-center gap-1 font-mono">
            {t('meta.lastFired', { time: lastFiredStr })}
          </span>
        )}
        {trigger.lastError && (
          <span className="flex items-center gap-1 text-destructive">
            <ExclamationTriangleIcon className="h-3 w-3" />
            {trigger.lastError}
          </span>
        )}
        {/* Copy debug — small icon, right-aligned */}
        <button
          type="button"
          onClick={handleCopyDebug}
          className="ml-auto flex items-center gap-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title={t('meta.copyDebug')}
        >
          <DocumentDuplicateIcon className="h-3 w-3" />
          {copied && <span className="text-[9px]">{t('meta.copied')}</span>}
        </button>
      </div>

      {/* ── FOOTER (Director Controls) ── */}
      {!disabled && (onFire || onRearm || onDisable) && (
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-border/50">
          {/* Timed-out warning */}
          {timedOut && (
            <span className="text-[10px] text-destructive flex items-center gap-1 mr-2">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              {t('pending.timedOut')}
            </span>
          )}

          {/* Fire button — gated (manual always, non-manual requires override) */}
          {onFire && (
            <div title={!fireGate.allowed ? fireGate.reason : undefined}>
              <Button
                size="sm"
                variant={isManual && fireGate.allowed ? 'default' : 'outline'}
                onClick={handleFire}
                disabled={!fireGate.allowed || isPending}
                className="gap-1.5"
              >
                {pending === 'fire' ? <PendingSpinner /> : <PlayIcon className="h-4 w-4" />}
                {t(isManual ? 'actions.fire' : 'actions.fireOverride')}
              </Button>
            </div>
          )}

          {/* Rearm button — gated, label reflects "keeps history" */}
          {onRearm && (
            <div title={!rearmGate.allowed ? rearmGate.reason : t('actions.rearmHint')}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRearm}
                disabled={!rearmGate.allowed || isPending}
                className="gap-1.5"
              >
                {pending === 'rearm' ? <PendingSpinner /> : <ArrowPathIcon className="h-4 w-4" />}
                {t('actions.rearm')}
              </Button>
            </div>
          )}

          {/* Disable button — gated, pushed right */}
          {onDisable && (
            <div className="ml-auto" title={!disableGate.allowed ? disableGate.reason : undefined}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisable}
                disabled={!disableGate.allowed || isPending}
                className="gap-1.5 text-muted-foreground hover:text-destructive"
              >
                {pending === 'disable' ? <PendingSpinner /> : <StopIcon className="h-4 w-4" />}
                {t('actions.disable')}
              </Button>
            </div>
          )}
        </div>
      )}
      {/* ── DEBUG MICRO-WIDGET (visible only when trigger:debug=1) ── */}
      {TRIGGER_DEBUG && (
        <div className="mt-2 rounded bg-muted/60 border border-dashed border-muted-foreground/30 px-2 py-1 text-[9px] font-mono text-muted-foreground space-y-0.5">
          <div className="font-bold uppercase tracking-wider text-[8px]">Debug</div>
          <div>
            HTTP: {debugInfo.httpStatus != null ? `${debugInfo.httpStatus}` : '—'}
            {debugInfo.durationMs != null && ` (${debugInfo.durationMs}ms)`}
          </div>
          {debugInfo.ackReason && <div>Ack: {debugInfo.ackReason}</div>}
          {debugInfo.errorCode && (
            <div className="text-destructive">
              Error: {debugInfo.errorCode} ({debugInfo.kind ?? '?'})
            </div>
          )}
          {debugInfo.executedActions && debugInfo.executedActions.length > 0 && (
            <div className="text-green-600 dark:text-green-400">
              Actions: {debugInfo.executedActions.join(', ')}
            </div>
          )}
          {debugInfo.failedActions && debugInfo.failedActions.length > 0 && (
            <div className="text-destructive">
              Failed: {debugInfo.failedActions.map(f => `${f.type}: ${f.error}`).join('; ')}
            </div>
          )}
          <div className="opacity-50">id: {trigger.id.slice(0, 8)}…</div>
        </div>
      )}
    </div>
  );
}

export default DirectorTriggerCard;
