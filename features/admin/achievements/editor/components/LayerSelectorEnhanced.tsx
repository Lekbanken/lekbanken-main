'use client';

import Image from "next/image";
import { CheckIcon } from "@heroicons/react/24/outline";
import type { AchievementAsset, AchievementAssetType } from "../../types";

type LayerSelectorEnhancedProps = {
  title: string;
  description: string;
  type: AchievementAssetType;
  assets: AchievementAsset[];
  selectedId?: string;
  onSelect: (type: AchievementAssetType, id: string) => void;
  onHover?: (type: AchievementAssetType, id: string | null) => void;
};

const categoryColors: Record<AchievementAssetType, string> = {
  base: "from-purple-500/20 to-purple-600/10",
  background: "from-teal-500/20 to-teal-600/10",
  foreground: "from-amber-500/20 to-amber-600/10",
  symbol: "from-rose-500/20 to-rose-600/10",
};

export function LayerSelectorEnhanced({
  title,
  description,
  type,
  assets,
  selectedId,
  onSelect,
  onHover,
}: LayerSelectorEnhancedProps) {
  const options = assets.filter((asset) => asset.type === type);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelect(type, "")}
          className={`
            group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200
            ${
              !selectedId
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-md"
            }
          `}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
            –
          </span>
          <span className={`text-sm font-medium truncate ${!selectedId ? "text-primary" : "text-foreground"}`}>
            None
          </span>
          {!selectedId && (
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
              <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
            </div>
          )}
        </button>

        {options.map((asset) => {
          const isActive = selectedId === asset.id;

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelect(type, asset.id)}
              onMouseEnter={() => onHover?.(type, asset.id)}
              onMouseLeave={() => onHover?.(type, null)}
              className={`
                group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left 
                transition-all duration-200 ease-out
                ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 scale-[1.02]"
                    : "border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-lg hover:scale-[1.01]"
                }
              `}
            >
              <span
                className={`
                  flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden
                  bg-gradient-to-br ${categoryColors[type]}
                  transition-transform duration-200 group-hover:scale-110
                  ${isActive ? "scale-105" : ""}
                `}
              >
                <Image
                  src={asset.sizes.sm}
                  alt={asset.label}
                  width={40}
                  height={40}
                  className="object-contain"
                  unoptimized
                />
              </span>

              <span className={`text-sm font-medium truncate ${isActive ? "text-primary font-semibold" : "text-foreground"}`}>
                {asset.label}
              </span>

              {isActive && (
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
