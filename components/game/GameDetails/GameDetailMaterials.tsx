'use client';

import { CubeIcon } from '@heroicons/react/24/outline';
import type { GameDetailMaterialsProps } from './types';

/**
 * GameDetailMaterials - Display required materials for the game
 *
 * Shows a list of materials/items needed to play the game.
 * Materials are extracted from GameDetailData.materials array.
 */
export function GameDetailMaterials({
  game,
  labels = {},
  className = '',
}: GameDetailMaterialsProps) {
  const materials = game.materials;

  // Don't render if no materials
  if (!materials || materials.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Material';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <CubeIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          {titleLabel}
        </h2>
      </div>

      <ul className="space-y-2">
        {materials.map((material, idx) => (
          <li
            key={idx}
            className="flex items-start gap-3 text-sm"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-foreground font-medium">
                {material.label}
              </span>
              {material.quantity && (
                <span className="text-muted-foreground ml-2">
                  ({material.quantity})
                </span>
              )}
              {material.detail && (
                <p className="text-muted-foreground text-xs mt-0.5">
                  {material.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
