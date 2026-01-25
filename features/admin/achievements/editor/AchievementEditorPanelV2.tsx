'use client';

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { Button, Badge } from "@/components/ui";
import type {
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
import { QuickActionsBar } from "./components/QuickActionsBar";
import { LayerStackPanel } from "./components/LayerStackPanel";
import { ContrastWarning } from "./components/ContrastWarning";
import { PresetManager } from "./components/PresetManager";
import { useBadgeHistory, useKeyboardShortcuts } from "./hooks";
import { getAssetsByType } from "../assets";
import {
  SwatchIcon,
  Square3Stack3DIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";
import { getEffectiveColor, normalizeIconConfig } from "../icon-utils";

type AchievementEditorPanelProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

// Collapsible section component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant="outline" size="sm">
              {badge}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {isOpen && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </section>
  );
}

export function AchievementEditorPanelV2({ value, themes, onChange, onCancel }: AchievementEditorPanelProps) {
  // Use history hook for undo/redo
  const initialValue = useMemo(
    () => ({
      ...value,
      icon: normalizeIconConfig(value.icon),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only compute on mount
  );

  const { state: draft, setState: setDraft, undo, redo, reset, canUndo, canRedo, historyLength } = useBadgeHistory(initialValue);

  const t = useTranslations('admin.achievements.editor');

  const [previewSize, setPreviewSize] = useState<AchievementAssetSize>(draft.icon.size || "lg");
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [hoverPreview, setHoverPreview] = useState<{ type: AchievementAssetType; id: string } | null>(null);

  const themeMap = useMemo(() => Object.fromEntries(themes.map((t) => [t.id, t])), [themes]);
  const currentTheme = draft.icon.themeId ? themeMap[draft.icon.themeId] : undefined;

  // Keyboard shortcuts
  const handleSave = useCallback(() => {
    onChange({ ...draft, icon: normalizeIconConfig(draft.icon) });
  }, [draft, onChange]);

  useKeyboardShortcuts({
    onUndo: undo,
    onRedo: redo,
    onSave: handleSave,
    onReset: reset,
    enabled: true,
  });

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

  const handleToggleLayerVisibility = (layerId: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const handleRemoveLayer = (type: 'background' | 'foreground', id: string) => {
    const key = type === 'background' ? 'backgrounds' : 'foregrounds';
    setDraft((prev) => ({
      ...prev,
      icon: {
        ...prev.icon,
        [key]: (prev.icon[key] ?? []).filter((item) => item.id !== id),
      },
    }));
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft.icon, null, 2));
      // Could show toast here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `badge-${draft.id || 'untitled'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get effective colors for contrast checking
  const effectiveColors = {
    base: getEffectiveColor("base", draft.icon, currentTheme),
    background: getEffectiveColor("background", draft.icon, currentTheme),
    foreground: getEffectiveColor("foreground", draft.icon, currentTheme),
    symbol: getEffectiveColor("symbol", draft.icon, currentTheme),
  };

  const summaryChips = [
    draft.icon.base?.id ? { label: `Base: ${formatLayerLabel(draft.icon.base.id)}`, variant: "outline" as const } : null,
    draft.icon.backgrounds?.length
      ? { label: `BG ×${draft.icon.backgrounds.length}`, variant: "secondary" as const }
      : null,
    draft.icon.foregrounds?.length
      ? { label: `FG ×${draft.icon.foregrounds.length}`, variant: "secondary" as const }
      : null,
    draft.icon.symbol?.id ? { label: `Sym: ${formatLayerLabel(draft.icon.symbol.id)}`, variant: "outline" as const } : null,
  ].filter(Boolean) as Array<{ label: string; variant: "outline" | "secondary" }>;

  return (
    <div className="p-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Left Column: Preview (sticky on desktop) */}
        <div className="space-y-4 lg:sticky lg:top-20 self-start">
          {/* Preview Card */}
          <section className="rounded-2xl border border-border/40 bg-gradient-to-br from-muted/20 to-transparent p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <SwatchIcon className="h-4 w-4 text-primary" />
                {t('preview')}
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

            {/* Badge Preview - shows hover preview if active */}
            <div className="flex items-center justify-center py-8 min-h-[200px] relative">
              <BadgePreviewEnhanced 
                icon={hoverPreview ? {
                  ...draft.icon,
                  ...(hoverPreview.type === 'base' && { base: { id: hoverPreview.id } }),
                  ...(hoverPreview.type === 'symbol' && { symbol: { id: hoverPreview.id } }),
                } : draft.icon} 
                theme={currentTheme} 
                size={previewSize} 
                showGlow 
              />
              {hoverPreview && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-muted/80 px-2 py-0.5 rounded">
                  {t('previewingLayer', { layer: formatLayerLabel(hoverPreview.id) })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex justify-center pt-4 border-t border-border/30">
              <QuickActionsBar
                onUndo={undo}
                onRedo={redo}
                onReset={reset}
                onCopy={handleCopyConfig}
                onExport={handleExportJson}
                canUndo={canUndo}
                canRedo={canRedo}
                historyLength={historyLength}
              />
            </div>

            {/* Summary chips */}
            {summaryChips.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                {summaryChips.map((chip) => (
                  <Badge key={chip.label} variant={chip.variant} size="sm">
                    {chip.label}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Layer Stack */}
          <section className="rounded-2xl border border-border/40 bg-card p-4">
            <LayerStackPanel
              icon={draft.icon}
              hiddenLayers={hiddenLayers}
              onToggleVisibility={handleToggleLayerVisibility}
              onRemoveLayer={handleRemoveLayer}
            />
          </section>

          {/* Contrast Warning */}
          <ContrastWarning
            colors={{
              base: effectiveColors.base,
              background: effectiveColors.background,
              symbol: effectiveColors.symbol,
            }}
            onAutoFix={(color, layer) => {
              handleColorChange({ [layer]: color });
            }}
          />
        </div>

        {/* Right Column - Collapsible Sections */}
        <div className="space-y-4">
          {/* Theme & Colors */}
          <CollapsibleSection
            title={t('themeAndColors')}
            icon={SwatchIcon}
            badge={draft.icon.mode === 'theme' ? currentTheme?.name : t('custom')}
            defaultOpen={true}
          >
            <ThemeSelectorEnhanced
              themes={themes}
              value={draft.icon.themeId || undefined}
              mode={draft.icon.mode}
              onModeChange={handleModeChange}
              onChange={handleThemeChange}
            />
            <ColorControlsEnhanced
              value={effectiveColors}
              onChange={handleColorChange}
              hasCustomColors={draft.icon.mode === "custom"}
            />
          </CollapsibleSection>

          {/* Layer Selection */}
          <CollapsibleSection
            title={t('layerSelection')}
            icon={Square3Stack3DIcon}
            badge={t('selectedCount', { count: (draft.icon.backgrounds?.length ?? 0) + (draft.icon.foregrounds?.length ?? 0) + (draft.icon.base ? 1 : 0) + (draft.icon.symbol ? 1 : 0) })}
            defaultOpen={true}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <LayerSelectorEnhanced
                title={t('baseShape')}
                description={t('baseDescription')}
                type="base"
                assets={getAssetsByType("base")}
                selectedId={draft.icon.base?.id || ""}
                onSelect={handleSingleLayerChange}
                onHover={(type, id) => setHoverPreview(id ? { type, id } : null)}
              />
              <LayerSelectorEnhanced
                title={t('symbol')}
                description={t('symbolDescription')}
                type="symbol"
                assets={getAssetsByType("symbol")}
                selectedId={draft.icon.symbol?.id || ""}
                onSelect={handleSingleLayerChange}
                onHover={(type, id) => setHoverPreview(id ? { type, id } : null)}
              />
            </div>

            <MultiLayerSelector
              title={t('backgroundDecorations')}
              description={t('backgroundDecorationsDesc')}
              type="background"
              assets={getAssetsByType("background")}
              selected={draft.icon.backgrounds ?? []}
              onChange={(next) => handleStackChange("backgrounds", next)}
            />

            <MultiLayerSelector
              title={t('foregroundDecorations')}
              description={t('foregroundDecorationsDesc')}
              type="foreground"
              assets={getAssetsByType("foreground")}
              selected={draft.icon.foregrounds ?? []}
              onChange={(next) => handleStackChange("foregrounds", next)}
            />
          </CollapsibleSection>

          {/* Metadata */}
          <CollapsibleSection
            title="Metadata"
            icon={DocumentTextIcon}
            defaultOpen={false}
          >
            <MetadataFormEnhanced value={draft} onChange={handleMetaChange} />
          </CollapsibleSection>

          {/* Presets */}
          <CollapsibleSection
            title={t('myPresets')}
            icon={BookmarkIcon}
            defaultOpen={false}
          >
            <PresetManager
              currentIcon={draft.icon}
              onLoadPreset={(icon) => setDraft((prev) => ({ ...prev, icon }))}
              currentTheme={currentTheme}
            />
          </CollapsibleSection>

          {/* Publishing & Sync */}
          <CollapsibleSection
            title={t('publishingAndSync')}
            icon={GlobeAltIcon}
            badge={draft.status === 'published' ? t('published') : t('draft')}
            defaultOpen={false}
          >
            <PublishingControls value={draft} onChange={handleMetaChange} />
          </CollapsibleSection>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">
              {historyLength > 0 && t('changesCount', { count: historyLength })}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onCancel}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} className="gap-2">
                💾 {t('saveBadge')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatLayerLabel(id: string): string {
  return id
    .replace(/^(base_|bg_|fg_|ic_)/, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
