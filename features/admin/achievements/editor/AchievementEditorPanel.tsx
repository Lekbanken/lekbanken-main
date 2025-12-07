'use client';

import { useMemo, useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
  AchievementAssetSize,
  AchievementAssetType,
  AchievementItem,
  AchievementLayerStackItem,
  AchievementTheme,
} from "../types";
import { BadgePreviewEnhanced } from "./components/BadgePreviewEnhanced";
import { ThemeSelectorEnhanced } from "./components/ThemeSelectorEnhanced";
import { ColorControlsEnhanced } from "./components/ColorControlsEnhanced";
import { LayerSelectorEnhanced } from "./components/LayerSelectorEnhanced";
import { MultiLayerSelector } from "./components/MultiLayerSelector";
import { MetadataFormEnhanced } from "./components/MetadataFormEnhanced";
import { PublishingControls } from "./components/PublishingControls";
import { getAssetsByType } from "../assets";
import {
  SwatchIcon,
  Square3Stack3DIcon,
  DocumentTextIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { getEffectiveColor, normalizeIconConfig } from "../icon-utils";

type AchievementEditorPanelProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

export function AchievementEditorPanel({ value, themes, onChange, onCancel }: AchievementEditorPanelProps) {
  const [draft, setDraft] = useState<AchievementItem>({
    ...value,
    icon: normalizeIconConfig(value.icon),
  });
  const [previewSize, setPreviewSize] = useState<AchievementAssetSize>(draft.icon.size || "lg");

  const themeMap = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, t])), [themes]);
  const currentTheme = draft.icon.themeId ? themeMap[draft.icon.themeId] : undefined;

  const handleSingleLayerChange = (type: AchievementAssetType, id: string) => {
    const payload: Partial<AchievementItem["icon"]> = {};
    if (type === "base") payload.base = id ? { id } : null;
    if (type === "symbol") payload.symbol = id ? { id } : null;
    setDraft((prev) => ({
      ...prev,
      icon: { ...prev.icon, ...payload },
    }));
  };

  const handleStackChange = (key: "backgrounds" | "foregrounds", next: AchievementLayerStackItem[]) => {
    setDraft((prev) => ({
      ...prev,
      icon: {
        ...prev.icon,
        [key]: next,
      },
    }));
  };

  const handleColorChange = (colors: Partial<Record<AchievementAssetType, string>>) => {
    setDraft((prev) => ({
      ...prev,
      icon: {
        ...prev.icon,
        mode: "custom",
        customColors: { ...prev.icon.customColors, ...colors },
      },
    }));
  };

  const handleModeChange = (mode: "theme" | "custom") => {
    setDraft((prev) => ({
      ...prev,
      icon: {
        ...prev.icon,
        mode,
        ...(mode === "theme" ? { customColors: undefined } : {}),
      },
    }));
  };

  const handleThemeChange = (themeId: string) => {
    setDraft((prev) => ({
      ...prev,
      icon: {
        ...prev.icon,
        themeId,
        mode: "theme",
        customColors: undefined,
      },
    }));
  };

  const handleMetaChange = (next: Partial<AchievementItem>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const handleSave = () => {
    onChange({ ...draft, icon: normalizeIconConfig(draft.icon) });
  };

  const summaryChips = [
    draft.icon.base?.id ? { label: `Base: ${draft.icon.base.id}`, variant: "outline" as const } : null,
    draft.icon.backgrounds?.length
      ? { label: `BG x${draft.icon.backgrounds.length}`, variant: "secondary" as const }
      : null,
    draft.icon.foregrounds?.length
      ? { label: `FG x${draft.icon.foregrounds.length}`, variant: "primary" as const }
      : null,
    draft.icon.symbol?.id ? { label: `Sym: ${draft.icon.symbol.id}`, variant: "accent" as const } : null,
  ].filter(Boolean) as Array<{ label: string; variant: "outline" | "secondary" | "primary" | "accent" }>;

  return (
    <div className="p-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)]">
        {/* Left Column: Preview (sticky on desktop) */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          <section className="rounded-2xl border border-border/40 bg-gradient-to-br from-muted/20 to-transparent p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <SwatchIcon className="h-4 w-4 text-primary" />
                Badge Preview
              </h3>
              <div className="flex rounded-lg border border-border/40 bg-muted/30 p-1">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPreviewSize(size);
                      setDraft((prev) => ({ ...prev, icon: { ...prev.icon, size } }));
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      previewSize === size
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center py-8">
              <BadgePreviewEnhanced icon={draft.icon} theme={currentTheme} size={previewSize} showGlow />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-border/30">
              {summaryChips.map((chip) => (
                <Badge key={chip.label} variant={chip.variant} size="sm">
                  {chip.label}
                </Badge>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Theme & Colors */}
          <section className="rounded-2xl border border-border/40 bg-card p-5 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <SwatchIcon className="h-4 w-4 text-primary" />
                Theme & Colors
              </h3>
              <Badge variant="outline" size="sm">
                Mode: {draft.icon.mode}
              </Badge>
            </div>
            <ThemeSelectorEnhanced
              themes={themes}
              value={draft.icon.themeId || undefined}
              mode={draft.icon.mode}
              onModeChange={handleModeChange}
              onChange={handleThemeChange}
            />
            <ColorControlsEnhanced
              value={{
                base: getEffectiveColor("base", draft.icon, currentTheme),
                background: getEffectiveColor("background", draft.icon, currentTheme),
                foreground: getEffectiveColor("foreground", draft.icon, currentTheme),
                symbol: getEffectiveColor("symbol", draft.icon, currentTheme),
              }}
              onChange={handleColorChange}
              hasCustomColors={draft.icon.mode === "custom"}
            />
          </section>

          {/* Layer Selection */}
          <section className="rounded-2xl border border-border/40 bg-card p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Square3Stack3DIcon className="h-4 w-4 text-primary" />
              Layer Selection
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <LayerSelectorEnhanced
                title="Base Shape"
                description="Foundation of your badge"
                type="base"
                assets={getAssetsByType("base")}
                selectedId={draft.icon.base?.id || ""}
                onSelect={handleSingleLayerChange}
              />
              <LayerSelectorEnhanced
                title="Symbol"
                description="Central meaningful icon"
                type="symbol"
                assets={getAssetsByType("symbol")}
                selectedId={draft.icon.symbol?.id || ""}
                onSelect={handleSingleLayerChange}
              />
            </div>

            <MultiLayerSelector
              title="Background Decorations"
              description="Wings, laurels, spikes (stackable)"
              type="background"
              assets={getAssetsByType("background")}
              selected={draft.icon.backgrounds ?? []}
              onChange={(next) => handleStackChange("backgrounds", next)}
            />

            <MultiLayerSelector
              title="Foreground Decorations"
              description="Stars, crowns, ribbons (stackable)"
              type="foreground"
              assets={getAssetsByType("foreground")}
              selected={draft.icon.foregrounds ?? []}
              onChange={(next) => handleStackChange("foregrounds", next)}
            />
          </section>

          {/* Metadata */}
          <section className="rounded-2xl border border-border/40 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <DocumentTextIcon className="h-4 w-4 text-primary" />
              Metadata
            </h3>
            <MetadataFormEnhanced value={draft} onChange={handleMetaChange} />
          </section>

          {/* Publishing & Sync */}
          <section className="rounded-2xl border border-border/40 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <GlobeAltIcon className="h-4 w-4 text-primary" />
              Publishing & Sync
            </h3>
            <PublishingControls value={draft} onChange={handleMetaChange} />
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              Save Badge
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
