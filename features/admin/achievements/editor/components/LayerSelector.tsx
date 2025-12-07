'use client';

import { AchievementAsset, AchievementAssetType } from "../../types";

type LayerSelectorProps = {
  title: string;
  type: AchievementAssetType;
  assets: AchievementAsset[];
  selectedId?: string;
  onSelect: (type: AchievementAssetType, id: string) => void;
};

export function LayerSelector({ title, type, assets, selectedId, onSelect }: LayerSelectorProps) {
  const options = assets.filter((asset) => asset.type === type);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onSelect(type, asset.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:border-primary/50 ${
              selectedId === asset.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 text-foreground"
            }`}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-background text-xs font-medium">
              {asset.label.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{asset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
