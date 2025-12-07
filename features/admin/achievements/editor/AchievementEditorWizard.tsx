'use client';

import { useState, useCallback } from 'react';
import { WizardStepIndicator, WizardStep } from './components/WizardStepIndicator';
import { LayerDropdownSelector } from './components/LayerDropdownSelector';
import { ColorInputWithPicker } from './components/ColorInputWithPicker';
import { BadgeCardPreview, PreviewModeToggle } from './components/BadgeCardPreview';
import { PreviewBackgroundPickerExtended } from './components/PreviewBackgroundPicker';
import { ContrastTip } from './components/ContrastTip';
import { RandomizeButton, useRandomBadge } from './components/RandomBadgeGenerator';
import { PresetManager } from './components/PresetManager';
import { getAssetsByType, getAssetById, resolveAssetUrl } from '../assets';
import { AchievementItem, AchievementIconConfig, AchievementTheme } from '../types';
import { themes } from '../data';
import { useBadgeHistory } from './hooks/useBadgeHistory';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  CheckIcon,
  SparklesIcon,
  SwatchIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

type AchievementEditorWizardProps = {
  draft: AchievementItem;
  onDraftChange: (draft: AchievementItem) => void;
  onSave: () => void;
  isSaving?: boolean;
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 0, name: 'Lagerval', description: 'Välj form och lager' },
  { id: 1, name: 'Tema & Färger', description: 'Anpassa färger' },
  { id: 2, name: 'Metadata', description: 'Namn och beskrivning' },
  { id: 3, name: 'Publicering', description: 'Granska och spara' },
];

/**
 * Wizard-based Badge Editor
 * 4 steps: Lagerval → Tema & Färger → Metadata → Publicering
 */
export function AchievementEditorWizard({
  draft,
  onDraftChange,
  onSave,
  isSaving = false,
}: AchievementEditorWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [previewMode, setPreviewMode] = useState<'ring' | 'card'>('ring');
  const [previewBackground, setPreviewBackground] = useState('#1F2937');

  // History for undo/redo - using the full AchievementItem
  const { setState: setHistoryState, undo, redo, canUndo, canRedo } = useBadgeHistory(draft);

  // Current theme
  const currentTheme = themes.find((t) => t.id === draft.icon.themeId) || themes[0];

  // Update icon helper
  const updateIcon = useCallback(
    (updates: Partial<AchievementIconConfig>) => {
      const newDraft = { ...draft, icon: { ...draft.icon, ...updates } };
      setHistoryState(newDraft);
      onDraftChange(newDraft);
    },
    [draft, onDraftChange, setHistoryState]
  );

  // Update draft helper
  const updateDraft = useCallback(
    (updates: Partial<AchievementItem>) => {
      const newDraft = { ...draft, ...updates };
      setHistoryState(newDraft);
      onDraftChange(newDraft);
    },
    [draft, onDraftChange, setHistoryState]
  );

  // Random badge utilities
  const { randomizeAll, randomizeColors } = useRandomBadge(draft.icon, (newIcon) => {
    const newDraft = { ...draft, icon: newIcon };
    setHistoryState(newDraft);
    onDraftChange(newDraft);
  });

  // Navigation
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const canGoNext = currentStep < WIZARD_STEPS.length - 1;
  const canGoPrev = currentStep > 0;

  // Load preset
  const handleLoadPreset = (icon: AchievementIconConfig) => {
    const newDraft = { ...draft, icon };
    setHistoryState(newDraft);
    onDraftChange(newDraft);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <LayerStep
            draft={draft}
            updateIcon={updateIcon}
            currentTheme={currentTheme}
            randomizeAll={randomizeAll}
            onLoadPreset={handleLoadPreset}
          />
        );
      case 1:
        return (
          <ColorStep
            draft={draft}
            updateIcon={updateIcon}
            currentTheme={currentTheme}
            randomizeColors={randomizeColors}
          />
        );
      case 2:
        return <MetadataStep draft={draft} updateDraft={updateDraft} />;
      case 3:
        return (
          <PublishStep
            draft={draft}
            updateDraft={updateDraft}
            onSave={onSave}
            isSaving={isSaving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Preview */}
      <div className="lg:w-80 flex-shrink-0">
        <div className="sticky top-4 space-y-4">
          {/* Preview Mode Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Forhandsvisning</h3>
            <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
          </div>

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden border border-border">
            <BadgeCardPreview
              icon={draft.icon}
              theme={currentTheme}
              metadata={{
                name: draft.title,
                description: draft.description || '',
                points: draft.rewardCoins || 0,
                category: 'Utmarkelse',
              }}
              showAsRing={previewMode === 'ring'}
              backgroundColor={previewBackground}
            />
          </div>

          {/* Background Picker */}
          {previewMode === 'ring' && (
            <PreviewBackgroundPickerExtended
              value={previewBackground}
              onChange={setPreviewBackground}
            />
          )}

          {/* Undo/Redo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 hover:bg-muted disabled:opacity-40"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Angra
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 hover:bg-muted disabled:opacity-40"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
              Gor om
            </button>
          </div>
        </div>
      </div>

      {/* Right: Wizard */}
      <div className="flex-1 space-y-6">
        {/* Step Indicator */}
        <WizardStepIndicator
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka
          </button>

          {canGoNext ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Nasta
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? 'Sparar...' : 'Spara badge'}
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 1: LAGERVAL
// ============================================================================

type LayerStepProps = {
  draft: AchievementItem;
  updateIcon: (updates: Partial<AchievementIconConfig>) => void;
  currentTheme: AchievementTheme;
  randomizeAll: () => void;
  onLoadPreset: (icon: AchievementIconConfig) => void;
};

function LayerStep({ draft, updateIcon, currentTheme, randomizeAll, onLoadPreset }: LayerStepProps) {
  const baseAssets = getAssetsByType('base');
  const bgAssets = getAssetsByType('background');
  const fgAssets = getAssetsByType('foreground');
  const symbolAssets = getAssetsByType('symbol');

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            Välj lager
          </h2>
          <p className="text-sm text-muted-foreground">
            Bygg din badge genom att välja bas, bakgrund, förgrund och symbol
          </p>
        </div>
        <RandomizeButton onClick={randomizeAll} label="Slumpa allt" />
      </div>

      {/* Layer Dropdowns */}
      <div className="grid gap-4">
        {/* Base - single select */}
        <LayerDropdownSelector
          label="Bas (form)"
          description="Huvudformen för din badge"
          type="base"
          assets={baseAssets}
          selectedId={draft.icon.base?.id}
          onSelect={(id) => updateIcon({ base: { id } })}
        />

        {/* Backgrounds - multi select */}
        <LayerDropdownSelector
          label="Bakgrund (0-2 lager)"
          description="Dekorationer bakom basen"
          type="background"
          assets={bgAssets}
          multiSelect
          selectedItems={draft.icon.backgrounds || []}
          onMultiSelect={(items) => updateIcon({ backgrounds: items })}
        />

        {/* Foregrounds - multi select */}
        <LayerDropdownSelector
          label="Förgrund (0-2 lager)"
          description="Dekorationer framför basen"
          type="foreground"
          assets={fgAssets}
          multiSelect
          selectedItems={draft.icon.foregrounds || []}
          onMultiSelect={(items) => updateIcon({ foregrounds: items })}
        />

        {/* Symbol - single select */}
        <LayerDropdownSelector
          label="Symbol (ikon)"
          description="Huvudsymbolen i mitten"
          type="symbol"
          assets={symbolAssets}
          selectedId={draft.icon.symbol?.id}
          onSelect={(id) => updateIcon({ symbol: { id } })}
        />
      </div>

      {/* Presets */}
      <div className="pt-4 border-t border-border">
        <PresetManager
          currentIcon={draft.icon}
          currentTheme={currentTheme}
          onLoadPreset={onLoadPreset}
        />
      </div>
    </div>
  );
}

// ============================================================================
// STEP 2: TEMA & FÄRGER
// ============================================================================

type ColorStepProps = {
  draft: AchievementItem;
  updateIcon: (updates: Partial<AchievementIconConfig>) => void;
  currentTheme: AchievementTheme;
  randomizeColors: () => void;
};

function ColorStep({ draft, updateIcon, currentTheme, randomizeColors }: ColorStepProps) {
  // Get current layer colors
  const baseColor = draft.icon.base?.color || draft.icon.customColors?.base || currentTheme.colors.base.color;
  const symbolColor = draft.icon.symbol?.color || draft.icon.customColors?.symbol || currentTheme.colors.symbol.color;

  const updateLayerColor = (layerType: 'base' | 'symbol', color: string) => {
    const layer = draft.icon[layerType];
    if (layer) {
      updateIcon({ [layerType]: { ...layer, color } });
    }
  };

  const updateStackColor = (stackType: 'backgrounds' | 'foregrounds', index: number, color: string) => {
    const stack = draft.icon[stackType];
    if (stack && stack[index]) {
      const newStack = [...stack];
      newStack[index] = { ...newStack[index], color };
      updateIcon({ [stackType]: newStack });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <SwatchIcon className="h-5 w-5 text-primary" />
            Tema & Färger
          </h2>
          <p className="text-sm text-muted-foreground">
            Anpassa färger för varje lager i din badge
          </p>
        </div>
        <RandomizeButton onClick={randomizeColors} label="Slumpa färger" />
      </div>

      {/* Theme selector (quick presets) */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Snabbval tema</p>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => updateIcon({ themeId: theme.id, mode: 'theme' })}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                ${draft.icon.themeId === theme.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Individual layer colors */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Anpassade färger per lager</p>

        {/* Base color */}
        {draft.icon.base && (
          <ColorInputWithPicker
            label="Bas"
            value={baseColor}
            onChange={(color) => updateLayerColor('base', color)}
            layerPreviewSrc={resolveAssetUrl(draft.icon.base.id, 'sm')}
            layerName={getAssetById(draft.icon.base.id)?.label}
          />
        )}

        {/* Background colors */}
        {draft.icon.backgrounds?.map((bg, idx) => (
          <ColorInputWithPicker
            key={`bg-${idx}`}
            label={`Bakgrund ${idx + 1}`}
            value={bg.color || currentTheme.colors.background.color}
            onChange={(color) => updateStackColor('backgrounds', idx, color)}
            layerPreviewSrc={resolveAssetUrl(bg.id, 'sm')}
            layerName={getAssetById(bg.id)?.label}
          />
        ))}

        {/* Foreground colors */}
        {draft.icon.foregrounds?.map((fg, idx) => (
          <ColorInputWithPicker
            key={`fg-${idx}`}
            label={`Förgrund ${idx + 1}`}
            value={fg.color || currentTheme.colors.foreground.color}
            onChange={(color) => updateStackColor('foregrounds', idx, color)}
            layerPreviewSrc={resolveAssetUrl(fg.id, 'sm')}
            layerName={getAssetById(fg.id)?.label}
          />
        ))}

        {/* Symbol color */}
        {draft.icon.symbol && (
          <ColorInputWithPicker
            label="Symbol"
            value={symbolColor}
            onChange={(color) => updateLayerColor('symbol', color)}
            layerPreviewSrc={resolveAssetUrl(draft.icon.symbol.id, 'sm')}
            layerName={getAssetById(draft.icon.symbol.id)?.label}
          />
        )}
      </div>

      {/* Contrast tip */}
      {draft.icon.base && draft.icon.symbol && (
        <ContrastTip foreground={symbolColor} background={baseColor} showAlways />
      )}
    </div>
  );
}

// ============================================================================
// STEP 3: METADATA
// ============================================================================

type MetadataStepProps = {
  draft: AchievementItem;
  updateDraft: (updates: Partial<AchievementItem>) => void;
};

function MetadataStep({ draft, updateDraft }: MetadataStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary" />
          Metadata
        </h2>
        <p className="text-sm text-muted-foreground">
          Beskriv din badge med namn, beskrivning och belöning
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Namn <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
            placeholder="T.ex. Stjärnskott"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Undertitel</label>
          <input
            type="text"
            value={draft.subtitle || ''}
            onChange={(e) => updateDraft({ subtitle: e.target.value })}
            placeholder="T.ex. Första steget"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Beskrivning</label>
          <textarea
            value={draft.description || ''}
            onChange={(e) => updateDraft({ description: e.target.value })}
            placeholder="Beskriv hur man uppnår denna badge..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Reward coins */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Belöning (coins)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={draft.rewardCoins || 0}
              onChange={(e) => updateDraft({ rewardCoins: parseInt(e.target.value) || 0 })}
              min={0}
              step={10}
              className="w-32 px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-sm text-muted-foreground">coins</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tips: 10-50 för vanliga, 100-500 för sällsynta badges
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 4: PUBLICERING
// ============================================================================

type PublishStepProps = {
  draft: AchievementItem;
  updateDraft: (updates: Partial<AchievementItem>) => void;
  onSave: () => void;
  isSaving: boolean;
};

function PublishStep({ draft, updateDraft, onSave, isSaving }: PublishStepProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CloudArrowUpIcon className="h-5 w-5 text-primary" />
          Publicering & Synk
        </h2>
        <p className="text-sm text-muted-foreground">Granska och publicera din badge</p>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <h3 className="font-medium text-foreground">Sammanfattning</h3>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Namn:</span>
            <span className="font-medium">{draft.title || '(inget namn)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Belöning:</span>
            <span className="font-medium">{draft.rewardCoins || 0} coins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lager:</span>
            <span className="font-medium">
              {[
                draft.icon.base && '1 bas',
                draft.icon.backgrounds?.length && `${draft.icon.backgrounds.length} bg`,
                draft.icon.foregrounds?.length && `${draft.icon.foregrounds.length} fg`,
                draft.icon.symbol && '1 symbol',
              ]
                .filter(Boolean)
                .join(', ') || 'Inga'}
            </span>
          </div>
        </div>
      </div>

      {/* Status selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Status</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateDraft({ status: 'draft' })}
            className={`
              flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
              ${draft.status === 'draft'
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-border hover:border-amber-300'
              }
            `}
          >
            Utkast
          </button>
          <button
            type="button"
            onClick={() => updateDraft({ status: 'published' })}
            className={`
              flex-1 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
              ${draft.status === 'published'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-border hover:border-green-300'
              }
            `}
          >
            Publicerad
          </button>
        </div>
      </div>

      {/* Profile Frame Sync */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.profileFrameSync?.enabled || false}
            onChange={(e) =>
              updateDraft({
                profileFrameSync: {
                  ...draft.profileFrameSync,
                  enabled: e.target.checked,
                },
              })
            }
            className="rounded border-border"
          />
          <span className="text-sm font-medium text-foreground">Synka till profilram</span>
        </label>
        <p className="text-xs text-muted-foreground pl-6">
          Låt användare använda denna badge som profilram
        </p>
      </div>

      {/* Save button (large) */}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !draft.title}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
      >
        {isSaving ? 'Sparar...' : 'Spara badge'}
      </button>

      {!draft.title && (
        <p className="text-center text-sm text-red-500">
          Du måste ange ett namn för att spara
        </p>
      )}
    </div>
  );
}
