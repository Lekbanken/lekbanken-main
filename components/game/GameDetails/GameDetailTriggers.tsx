'use client';

import { useState, useEffect } from 'react';
import { BoltIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { GameTrigger } from '@/lib/game-display';
import type { GameDetailTriggersProps } from './types';

/**
 * GameDetailTriggers - Lazy-loaded triggers/events for games
 *
 * Fetches triggers on mount from /api/games/[gameId]/triggers.
 * Shows automated events and their conditions/effects.
 */
export function GameDetailTriggers({
  game,
  labels = {},
  className = '',
}: GameDetailTriggersProps) {
  const [triggers, setTriggers] = useState<GameTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const titleLabel = labels.title ?? 'Händelser';
  const loadingLabel = labels.loading ?? 'Laddar händelser...';
  const errorLabel = labels.error ?? 'Kunde inte ladda händelser';
  const conditionLabel = labels.condition ?? 'Villkor';
  const effectLabel = labels.effect ?? 'Effekt';
  const executeOnceLabel = labels.executeOnce ?? 'Körs en gång';
  const delayLabel = labels.delay ?? 'Fördröjning';

  useEffect(() => {
    const fetchTriggers = async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/triggers`);
        if (!res.ok) throw new Error('Failed to fetch triggers');
        const data = await res.json();
        setTriggers(data.triggers ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTriggers();
  }, [game.id]);

  // Don't render if no triggers after loading
  if (!loading && triggers.length === 0 && !error) return null;

  // Format condition for display
  const formatCondition = (condition: string | object): string => {
    if (typeof condition === 'string') return condition;
    try {
      return JSON.stringify(condition, null, 2);
    } catch {
      return String(condition);
    }
  };

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {titleLabel}
          </h2>
          {!loading && triggers.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({triggers.length})
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-4">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              {loadingLabel}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{errorLabel}</p>
          )}

          {!loading && !error && triggers.length > 0 && (
            <div className="space-y-3">
              {triggers.map((trigger, idx) => (
                <div
                  key={trigger.id ?? idx}
                  className="rounded-xl border border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {trigger.title || trigger.name}
                    </h3>
                    {trigger.enabled === false && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inaktiv
                      </span>
                    )}
                  </div>

                  {trigger.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {trigger.description}
                    </p>
                  )}

                  {/* Condition */}
                  <div className="mt-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                      {conditionLabel}
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-mono">
                      {formatCondition(trigger.condition)}
                    </p>
                  </div>

                  {/* Effect */}
                  <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">
                      {effectLabel}
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {trigger.effect}
                    </p>
                  </div>

                  {/* Execution info */}
                  {(trigger.executeOnce || trigger.delaySeconds) && (
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      {trigger.executeOnce && (
                        <span className="flex items-center gap-1">
                          ⚡ {executeOnceLabel}
                        </span>
                      )}
                      {trigger.delaySeconds && (
                        <span className="flex items-center gap-1">
                          ⏱ {delayLabel}: {trigger.delaySeconds}s
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
