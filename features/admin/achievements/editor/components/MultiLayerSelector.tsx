'use client';

import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { AchievementAsset, AchievementAssetType, AchievementLayerStackItem } from "../../types";
import Image from "next/image";

type MultiLayerSelectorProps = {
  title: string;
  description: string;
  type: AchievementAssetType;
  assets: AchievementAsset[];
  selected: AchievementLayerStackItem[];
  onChange: (next: AchievementLayerStackItem[]) => void;
};

export function MultiLayerSelector({ title, description, type: _type, assets, selected, onChange }: MultiLayerSelectorProps) {
  const selectedMap = new Set(selected.map((s) => s.id));
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const toggleAsset = (id: string) => {
    if (selectedMap.has(id)) {
      onChange(selected.filter((s) => s.id !== id));
    } else {
      onChange([...selected, { id, order: selected.length }]);
    }
  };

  const move = (from: number, delta: number) => {
    const to = from + delta;
    if (to < 0 || to >= selected.length) return;
    const next = [...selected];
    const temp = next[from];
    next[from] = next[to];
    next[to] = temp;
    onChange(next.map((item, idx) => ({ ...item, order: idx })));
  };

  const remove = (id: string) => {
    onChange(selected.filter((s) => s.id !== id).map((item, idx) => ({ ...item, order: idx })));
  };

  return (
    <div className="space-y-3" data-layer-type={_type}>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {/* Selected stack */}
      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        {selected.length === 0 ? (
          <p className="text-xs text-muted-foreground">Inga valda {title.toLowerCase()} än.</p>
        ) : (
          selected.map((item, idx) => {
            const asset = assetMap.get(item.id);
            return (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {asset?.sizes.sm && (
                    <Image src={asset.sizes.sm} alt={asset.label} width={32} height={32} className="rounded" unoptimized />
                  )}
                  <div className="text-sm font-medium text-foreground">{asset?.label ?? item.id}</div>
                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-md border border-border/60 p-1 text-xs hover:border-primary/40"
                    onClick={() => move(idx, -1)}
                  >
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border/60 p-1 text-xs hover:border-primary/40"
                    onClick={() => move(idx, 1)}
                  >
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border/60 p-1 text-xs hover:border-destructive/50"
                    onClick={() => remove(item.id)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-2">
        {assets.map((asset) => {
          const isSelected = selectedMap.has(asset.id);
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => toggleAsset(asset.id)}
              className={`
                group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left 
                transition-all duration-200 ease-out
                ${isSelected 
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 scale-[1.02]" 
                  : "border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-lg hover:scale-[1.01]"
                }
              `}
            >
              <span className={`
                flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-muted
                transition-transform duration-200 group-hover:scale-110
                ${isSelected ? "scale-105" : ""}
              `}>
                <Image src={asset.sizes.sm} alt={asset.label} width={32} height={32} unoptimized />
              </span>
              <span className={`text-sm font-medium truncate ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>
                {asset.label}
              </span>
              {isSelected && (
                <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-md animate-in zoom-in-50 duration-200">
                  <CheckIcon className="h-3 w-3" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
