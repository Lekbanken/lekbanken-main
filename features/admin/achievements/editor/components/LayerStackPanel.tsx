'use client';

import { useMemo } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Square3Stack3DIcon } from '@heroicons/react/24/solid';
import { AchievementIconConfig } from '../../types';

type LayerInfo = {
  id: string;
  type: 'base' | 'background' | 'foreground' | 'symbol';
  label: string;
  removable: boolean;
  order: number;
};

type LayerStackPanelProps = {
  icon: AchievementIconConfig;
  hiddenLayers?: Set<string>;
  onToggleVisibility?: (layerId: string) => void;
  onRemoveLayer?: (type: 'background' | 'foreground', id: string) => void;
  onMoveLayer?: (type: 'backgrounds' | 'foregrounds', fromIndex: number, toIndex: number) => void;
};

const typeColors: Record<string, string> = {
  background: 'bg-teal-500/20 text-teal-600 border-teal-500/30',
  base: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  foreground: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  symbol: 'bg-rose-500/20 text-rose-600 border-rose-500/30',
};

const typeLabels: Record<string, string> = {
  background: 'BG',
  base: 'Base',
  foreground: 'FG',
  symbol: 'Sym',
};

/**
 * Visual layer stack showing all active layers with visibility toggles.
 * Displays layers in z-order from top (symbol) to bottom (background).
 */
export function LayerStackPanel({
  icon,
  hiddenLayers = new Set(),
  onToggleVisibility,
  onRemoveLayer,
  onMoveLayer,
}: LayerStackPanelProps) {
  // Build layer list in z-order (top to bottom)
  const layers = useMemo(() => {
    const result: LayerInfo[] = [];

    // Symbol is on top
    if (icon.symbol?.id) {
      result.push({
        id: icon.symbol.id,
        type: 'symbol',
        label: formatLabel(icon.symbol.id),
        removable: false,
        order: 100,
      });
    }

    // Foregrounds
    (icon.foregrounds ?? []).forEach((item, idx) => {
      result.push({
        id: `fg-${item.id}-${idx}`,
        type: 'foreground',
        label: formatLabel(item.id),
        removable: true,
        order: 80 - idx,
      });
    });

    // Base
    if (icon.base?.id) {
      result.push({
        id: icon.base.id,
        type: 'base',
        label: formatLabel(icon.base.id),
        removable: false,
        order: 50,
      });
    }

    // Backgrounds
    (icon.backgrounds ?? []).forEach((item, idx) => {
      result.push({
        id: `bg-${item.id}-${idx}`,
        type: 'background',
        label: formatLabel(item.id),
        removable: true,
        order: 20 - idx,
      });
    });

    return result.sort((a, b) => b.order - a.order);
  }, [icon]);

  if (layers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 text-center">
        <Square3Stack3DIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">Inga lager valda</p>
        <p className="text-xs text-muted-foreground/70">Välj en base shape för att börja</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Square3Stack3DIcon className="h-3.5 w-3.5" />
          Lager ({layers.length})
        </h4>
        <span className="text-[10px] text-muted-foreground/60">Topp → Botten</span>
      </div>

      <div className="space-y-1 rounded-lg border border-border/40 bg-muted/10 p-1.5">
        {layers.map((layer, index) => {
          const isHidden = hiddenLayers.has(layer.id);
          const canMoveUp = layer.removable && index > 0 && layers[index - 1]?.type === layer.type;
          const canMoveDown =
            layer.removable &&
            index < layers.length - 1 &&
            layers[index + 1]?.type === layer.type;

          return (
            <div
              key={layer.id}
              className={`
                flex items-center gap-2 rounded-md border px-2 py-1.5 transition-all
                ${typeColors[layer.type]}
                ${isHidden ? 'opacity-40' : ''}
              `}
            >
              {/* Visibility toggle */}
              {onToggleVisibility && (
                <button
                  type="button"
                  onClick={() => onToggleVisibility(layer.id)}
                  className="p-0.5 rounded hover:bg-white/20 transition-colors"
                  title={isHidden ? 'Visa lager' : 'Dölj lager'}
                >
                  {isHidden ? (
                    <EyeSlashIcon className="h-3.5 w-3.5" />
                  ) : (
                    <EyeIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              )}

              {/* Type badge */}
              <span className="text-[10px] font-semibold uppercase w-8">
                {typeLabels[layer.type]}
              </span>

              {/* Label */}
              <span className="flex-1 text-xs font-medium truncate">{layer.label}</span>

              {/* Move controls for stackable layers */}
              {layer.removable && onMoveLayer && (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    disabled={!canMoveUp}
                    onClick={() => {
                      const stackType = layer.type === 'foreground' ? 'foregrounds' : 'backgrounds';
                      const stackIndex = getStackIndex(icon, stackType, layer.id);
                      if (stackIndex > 0) onMoveLayer(stackType, stackIndex, stackIndex - 1);
                    }}
                    className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 transition-colors"
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={!canMoveDown}
                    onClick={() => {
                      const stackType = layer.type === 'foreground' ? 'foregrounds' : 'backgrounds';
                      const stack = icon[stackType] ?? [];
                      const stackIndex = getStackIndex(icon, stackType, layer.id);
                      if (stackIndex < stack.length - 1)
                        onMoveLayer(stackType, stackIndex, stackIndex + 1);
                    }}
                    className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 transition-colors"
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Remove button */}
              {layer.removable && onRemoveLayer && (
                <button
                  type="button"
                  onClick={() => {
                    const id = layer.id.replace(/^(fg|bg)-/, '').replace(/-\d+$/, '');
                    onRemoveLayer(layer.type as 'background' | 'foreground', id);
                  }}
                  className="p-0.5 rounded hover:bg-red-500/20 hover:text-red-600 transition-colors"
                  title="Ta bort lager"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatLabel(id: string): string {
  return id
    .replace(/^(base_|bg_|fg_|ic_)/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStackIndex(
  _icon: AchievementIconConfig,
  _stackType: 'backgrounds' | 'foregrounds',
  layerId: string
): number {
  const idMatch = layerId.match(/^(?:fg|bg)-(.+)-(\d+)$/);
  if (!idMatch) return -1;
  return parseInt(idMatch[2], 10);
}
