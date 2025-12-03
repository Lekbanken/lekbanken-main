'use client';

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { AchievementItem, AchievementLayer, AchievementLayerType, AchievementTheme } from "../types";
import { BadgePreview } from "./components/BadgePreview";
import { LayerSelector } from "./components/LayerSelector";
import { ThemeSelector } from "./components/ThemeSelector";
import { ColorControls } from "./components/ColorControls";
import { MetadataForm } from "./components/MetadataForm";
import { ProfileFrameSync } from "./components/ProfileFrameSync";

type AchievementEditorProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  layers: AchievementLayer[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

export function AchievementEditor({ value, themes, layers, onChange, onCancel }: AchievementEditorProps) {
  const [draft, setDraft] = useState<AchievementItem>(value);

  const themeMap = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, t])), [themes]);
  const currentTheme = draft.themeId ? themeMap[draft.themeId] : undefined;

  const handleLayerChange = (type: AchievementLayerType, id: string) => {
    setDraft((prev) => ({ ...prev, layers: { ...prev.layers, [type]: id } }));
  };

  const handleColorChange = (colors: { base: string; background: string; foreground: string; symbol: string }) => {
    setDraft((prev) => ({
      ...prev,
      themeId: undefined,
      customColors: colors,
    }));
  };

  const handleMetaChange = (next: Partial<AchievementItem>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const handleSave = () => {
    onChange(draft);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-sm">Visual builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-6">
            <BadgePreview
              layers={draft.layers}
              colors={{
                base: draft.customColors?.base || currentTheme?.baseColor || "#8661ff",
                background: draft.customColors?.background || currentTheme?.backgroundColor || "#00c7b0",
                foreground: draft.customColors?.foreground || currentTheme?.foregroundColor || "#ffd166",
                symbol: draft.customColors?.symbol || currentTheme?.symbolColor || "#ffffff",
              }}
            />
          </div>

          <ThemeSelector
            themes={themes}
            value={draft.themeId}
            onChange={(themeId) => setDraft((prev) => ({ ...prev, themeId, customColors: undefined }))}
          />

          <ColorControls
            value={{
              base: draft.customColors?.base || currentTheme?.baseColor || "#8661ff",
              background: draft.customColors?.background || currentTheme?.backgroundColor || "#00c7b0",
              foreground: draft.customColors?.foreground || currentTheme?.foregroundColor || "#ffd166",
              symbol: draft.customColors?.symbol || currentTheme?.symbolColor || "#ffffff",
            }}
            onChange={handleColorChange}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-sm">Layers & metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <LayerSelector title="Base" type="base" layers={layers} selectedId={draft.layers.base} onSelect={handleLayerChange} />
            <LayerSelector title="Background" type="background" layers={layers} selectedId={draft.layers.background} onSelect={handleLayerChange} />
            <LayerSelector title="Foreground" type="foreground" layers={layers} selectedId={draft.layers.foreground} onSelect={handleLayerChange} />
            <LayerSelector title="Symbol" type="symbol" layers={layers} selectedId={draft.layers.symbol} onSelect={handleLayerChange} />
          </div>

          <MetadataForm value={draft} onChange={handleMetaChange} />

          <ProfileFrameSync value={draft.profileFrameSync ?? false} onChange={(v) => handleMetaChange({ profileFrameSync: v })} />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save badge</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
