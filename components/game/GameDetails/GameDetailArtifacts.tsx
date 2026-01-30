'use client';

import { useState, useEffect } from 'react';
import { CubeTransparentIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { GameArtifact } from '@/lib/game-display';
import type { GameDetailArtifactsProps } from './types';

/**
 * GameDetailArtifacts - Lazy-loaded artifacts/props for games
 *
 * Fetches artifacts on mount from /api/games/[gameId]/artifacts.
 * Shows game props, cards, tokens, and other physical/digital items.
 */
export function GameDetailArtifacts({
  game,
  labels = {},
  className = '',
}: GameDetailArtifactsProps) {
  const [artifacts, setArtifacts] = useState<GameArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const titleLabel = labels.title ?? 'Artefakter';
  const loadingLabel = labels.loading ?? 'Laddar artefakter...';
  const errorLabel = labels.error ?? 'Kunde inte ladda artefakter';
  const variantsLabel = labels.variants ?? 'Varianter';
  const useLabel = labels.use ?? 'Användning';

  useEffect(() => {
    const fetchArtifacts = async () => {
      try {
        const res = await fetch(`/api/games/${game.id}/artifacts`);
        if (!res.ok) throw new Error('Failed to fetch artifacts');
        const data = await res.json();
        setArtifacts(data.artifacts ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchArtifacts();
  }, [game.id]);

  // Don't render if no artifacts after loading
  if (!loading && artifacts.length === 0 && !error) return null;

  // Get artifact type badge color
  const getTypeColor = (type?: string) => {
    if (!type) return 'bg-muted text-muted-foreground';
    const typeMap: Record<string, string> = {
      card: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      token: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      prop: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      document: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      digital: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    };
    return typeMap[type.toLowerCase()] ?? 'bg-muted text-muted-foreground';
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
          <CubeTransparentIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {titleLabel}
          </h2>
          {!loading && artifacts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({artifacts.length})
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

          {!loading && !error && artifacts.length > 0 && (
            <div className="space-y-3">
              {artifacts.map((artifact, idx) => (
                <div
                  key={artifact.id ?? idx}
                  className="rounded-xl border border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {artifact.title}
                    </h3>
                    {artifact.type && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeColor(artifact.type)}`}
                      >
                        {artifact.type}
                      </span>
                    )}
                  </div>

                  {artifact.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {artifact.description}
                    </p>
                  )}

                  {artifact.use && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">{useLabel}:</span> {artifact.use}
                    </p>
                  )}

                  {/* Tags */}
                  {artifact.tags && artifact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {artifact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Variants */}
                  {artifact.variants && artifact.variants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {variantsLabel} ({artifact.variants.length})
                      </p>
                      <div className="space-y-2">
                        {artifact.variants.map((variant, vIdx) => (
                          <div
                            key={vIdx}
                            className="text-sm bg-background/50 rounded-lg p-2"
                          >
                            {variant.title && (
                              <p className="font-medium text-foreground">
                                {variant.title}
                              </p>
                            )}
                            {variant.body && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {variant.body}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
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
