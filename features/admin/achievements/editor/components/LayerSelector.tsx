'use client';

import { AchievementLayer, AchievementLayerType } from "../../types";

type LayerSelectorProps = {
  title: string;
  type: AchievementLayerType;
  layers: AchievementLayer[];
  selectedId?: string;
  onSelect: (type: AchievementLayerType, id: string) => void;
};

export function LayerSelector({ title, type, layers, selectedId, onSelect }: LayerSelectorProps) {
  const options = layers.filter((layer) => layer.type === type);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onSelect(type, layer.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:border-primary/50 ${
              selectedId === layer.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 text-foreground"
            }`}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-background text-xs font-medium">
              {layer.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{layer.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
