'use client';

import { useState, useEffect } from 'react';
import { UserGroupIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { GameRole } from '@/lib/game-display';
import type { GameDetailRolesProps } from './types';

/**
 * GameDetailRoles - Lazy-loaded roles for participant games
 *
 * Fetches roles on mount from /api/games/[gameId]/roles.
 * Only shown for games with playMode === 'participants'.
 */
export function GameDetailRoles({
  game,
  labels = {},
  className = '',
}: GameDetailRolesProps) {
  const [roles, setRoles] = useState<GameRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const titleLabel = labels.title ?? 'Roller';
  const loadingLabel = labels.loading ?? 'Laddar roller...';
  const errorLabel = labels.error ?? 'Kunde inte ladda roller';
  const countLabel = labels.count ?? 'Antal';

  // Only fetch for participant games
  const shouldFetch = game.playMode === 'participants';

  useEffect(() => {
    if (!shouldFetch) {
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/roles`);
        if (!res.ok) throw new Error('Failed to fetch roles');
        const data = await res.json();
        setRoles(data.roles ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [game.id, shouldFetch]);

  // Don't render if not a participant game or no roles
  if (!shouldFetch) return null;
  if (!loading && roles.length === 0 && !error) return null;

  // Get role color style
  const getRoleColor = (color?: string) => {
    if (!color) return 'bg-primary/10 text-primary';
    // Handle common color names
    const colorMap: Record<string, string> = {
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    };
    return colorMap[color.toLowerCase()] ?? 'bg-primary/10 text-primary';
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
          <UserGroupIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {titleLabel}
          </h2>
          {!loading && roles.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({roles.length})
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

          {!loading && !error && roles.length > 0 && (
            <div className="space-y-3">
              {roles.map((role, idx) => (
                <div
                  key={role.id ?? idx}
                  className="rounded-xl border border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Role icon/badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getRoleColor(role.color)}`}
                    >
                      {role.icon ? (
                        <span className="text-lg">{role.icon}</span>
                      ) : (
                        <span className="text-sm font-bold">
                          {role.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Role content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground">
                        {role.name}
                      </h3>

                      {/* Count info */}
                      {(role.count || role.minCount != null || role.maxCount != null) && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          <span className="font-medium">{countLabel}:</span>{' '}
                          {role.count ?? `${role.minCount ?? 1}-${role.maxCount ?? '∞'}`}
                        </p>
                      )}

                      {/* Public note */}
                      {role.publicNote && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {role.publicNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
