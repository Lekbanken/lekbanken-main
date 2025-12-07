'use client';

import { useMemo, useState } from "react";
import { Button, Badge } from "@/components/ui";
import {
  AchievementAssetSize,
  AchievementAssetType,
  AchievementItem,
  AchievementTheme,
} from "../types";
import { BadgePreviewEnhanced } from "./components/BadgePreviewEnhanced";
import { ThemeSelectorEnhanced } from "./components/ThemeSelectorEnhanced";
import { ColorControlsEnhanced } from "./components/ColorControlsEnhanced";
import { LayerSelectorEnhanced } from "./components/LayerSelectorEnhanced";
import { MetadataFormEnhanced } from "./components/MetadataFormEnhanced";
import { PublishingControls } from "./components/PublishingControls";
import { getAssetsByType } from "../assets";
import {
  SwatchIcon,
  Square3Stack3DIcon,
  DocumentTextIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

type AchievementEditorPanelProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

const defaultColors = {
  base: "#8661ff",
  background: "#00c7b0",
  foreground: "#ffd166",
  symbol: "#ffffff",
};

export function AchievementEditorPanel({ value, themes, onChange, onCancel }: AchievementEditorPanelProps) {
  const [draft, setDraft] = useState<AchievementItem>({
    ...value,
    icon: value.icon || { mode: "theme", themeId: themes[0]?.id, size: "lg", layers: {} },
  });
  const [previewSize, setPreviewSize] = useState<AchievementAssetSize>(value.icon.size || "lg");

  const themeMap = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, t])), [themes]);
  const currentTheme = draft.icon.themeId ? themeMap[draft.icon.themeId] : undefined;

  const handleLayerChange = (type: AchievementAssetType, id: string) => {
    setDraft((prev) => ({
      ...prev,
      icon: {
        ...prev.icon,
        layers: { ...prev.icon.layers, [type]: id || undefined },
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
    onChange(draft);
  };

  const currentColors = {
    base: draft.icon.customColors?.base || currentTheme?.colors.base.color || defaultColors.base,
    background: draft.icon.customColors?.background || currentTheme?.colors.background.color || defaultColors.background,
    foreground: draft.icon.customColors?.foreground || currentTheme?.colors.foreground.color || defaultColors.foreground,
    symbol: draft.icon.customColors?.symbol || currentTheme?.colors.symbol.color || defaultColors.symbol,
  };

  return (
    <div className="p-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
        {/* Left Column: Visual Builder */}
        <div className="space-y-6">
          {/* Badge Preview */}
          <section className="rounded-2xl border border-border/40 bg-gradient-to-br from-muted/20 to-transparent p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <SwatchIcon className="h-4 w-4 text-primary" />
                Badge Preview
              </h3>
              {/* Size Toggle */}
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

            {/* Centered Preview */}
            <div className="flex items-center justify-center py-8">
              <BadgePreviewEnhanced icon={draft.icon} colors={currentColors} size={previewSize} showGlow />
            </div>

            {/* Active Layers Summary */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-border/30">
              {draft.icon.layers.base && <Badge variant="outline" size="sm">Base: {draft.icon.layers.base}</Badge>}
              {draft.icon.layers.background && <Badge variant="secondary" size="sm">BG {draft.icon.layers.background}</Badge>}
              {draft.icon.layers.foreground && <Badge variant="primary" size="sm">FG {draft.icon.layers.foreground}</Badge>}
              {draft.icon.layers.symbol && <Badge variant="accent" size="sm">SYM {draft.icon.layers.symbol}</Badge>}
            </div>
          </section>

          {/* Theme Selector */}
          <section className="rounded-2xl border border-border/40 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <SwatchIcon className="h-4 w-4 text-primary" />
              Theme & Mode
            </h3>
            <ThemeSelectorEnhanced
              themes={themes}
              value={draft.icon.themeId || undefined}
              mode={draft.icon.mode}
              onModeChange={handleModeChange}
              onChange={handleThemeChange}
            />
          </section>

          {/* Color Controls */}
          <section className="rounded-2xl border border-border/40 bg-card p-5">
            <ColorControlsEnhanced
              value={currentColors}
              onChange={handleColorChange}
              hasCustomColors={draft.icon.mode === "custom"}
            />
          </section>

          {/* Layer Selectors */}
          <section className="rounded-2xl border border-border/40 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Square3Stack3DIcon className="h-4 w-4 text-primary" />
              Layer Selection
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <LayerSelectorEnhanced
                title="Base Shape"
                description="Foundation of your badge"
                type="base"
                assets={getAssetsByType("base")}
                selectedId={draft.icon.layers.base}
                onSelect={handleLayerChange}
              />
              <LayerSelectorEnhanced
                title="Background Decoration"
                description="Wings, laurels, frames"
                type="background"
                assets={getAssetsByType("background")}
                selectedId={draft.icon.layers.background}
                onSelect={handleLayerChange}
              />
              <LayerSelectorEnhanced
                title="Foreground Decoration"
                description="Stars, crowns, accents"
                type="foreground"
                assets={getAssetsByType("foreground")}
                selectedId={draft.icon.layers.foreground}
                onSelect={handleLayerChange}
              />
              <LayerSelectorEnhanced
                title="Symbol"
                description="Central meaningful icon"
                type="symbol"
                assets={getAssetsByType("symbol")}
                selectedId={draft.icon.layers.symbol}
                onSelect={handleLayerChange}
              />
            </div>
          </section>
        </div>

        {/* Right Column: Metadata & Publishing */}
        <div className="space-y-6">
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

          {/* Action Buttons */}
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
