'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { WizardStep } from './components/WizardStepIndicator';
import { WizardStepIndicator } from './components/WizardStepIndicator';
import { LayerDropdownSelector } from './components/LayerDropdownSelector';
import { ColorInputWithPicker } from './components/ColorInputWithPicker';
import { BadgeCardPreview, PreviewModeToggle } from './components/BadgeCardPreview';
import { CircleBackgroundPicker, CardBackgroundPicker } from './components/PreviewBackgroundPicker';
import { ContrastTip } from './components/ContrastTip';
import { RandomizeButton, useRandomBadge } from './components/RandomBadgeGenerator';
import { PresetManager } from './components/PresetManager';
import { getAssetsByType, getAssetById, resolveAssetUrl } from '../assets';
import type { AchievementItem, AchievementIconConfig, AchievementTheme } from '../types';
import { themes } from '../data';
import { useBadgeHistory } from './hooks/useBadgeHistory';
import { validateForPublish, validateForDraft, type ValidationResult } from '../validation';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  SparklesIcon,
  SwatchIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

type AchievementEditorWizardProps = {
  draft: AchievementItem;
  onDraftChange: (draft: AchievementItem) => void;
  onSave: () => void;
  isSaving?: boolean;
};

const WIZARD_STEPS: WizardStep[] = [
  { id: 0, name: 'steps.layers.name', description: 'steps.layers.description' },
  { id: 1, name: 'steps.themeColors.name', description: 'steps.themeColors.description' },
  { id: 2, name: 'steps.metadata.name', description: 'steps.metadata.description' },
  { id: 3, name: 'steps.publishing.name', description: 'steps.publishing.description' },
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
  
  const t = useTranslations('admin.achievements.editor');
  
  // Translate wizard steps
  const translatedSteps = useMemo(() => WIZARD_STEPS.map(step => ({
    ...step,
    name: t(step.name),
    description: step.description ? t(step.description) : undefined,
  })), [t]);
  
  // Preview settings
  const [circleBackground, setCircleBackground] = useState('#1F2937');
  const [cardBackground, setCardBackground] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#1F2937');

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

  // Validation
  const publishValidation = useMemo(() => validateForPublish(draft), [draft]);
  const draftValidation = useMemo(() => validateForDraft(draft), [draft]);
  
  // Determine if save is allowed based on status
  const canSave = draft.status === 'published' 
    ? publishValidation.valid 
    : draftValidation.valid;

  // Navigation
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));
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
            validation={publishValidation}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Preview - wider column */}
      <div className="lg:w-[400px] flex-shrink-0">
        <div className="sticky top-4 space-y-4">
          {/* Preview Mode Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{t('preview')}</h3>
            <PreviewModeToggle mode={previewMode} onChange={setPreviewMode} />
          </div>

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden border border-border">
            <BadgeCardPreview
              icon={draft.icon}
              theme={currentTheme}
              metadata={{
                name: draft.title,
                subtitle: draft.subtitle,
                description: draft.description || '',
                points: draft.rewardCoins || 0,
              }}
              showAsRing={previewMode === 'ring'}
              circleBackground={circleBackground}
              cardBackground={cardBackground}
              textColor={textColor}
            />
          </div>

          {/* Background Pickers */}
          {previewMode === 'ring' ? (
            <CircleBackgroundPicker
              value={circleBackground}
              onChange={setCircleBackground}
            />
          ) : (
            <CardBackgroundPicker
              cardBackground={cardBackground}
              onCardBackgroundChange={setCardBackground}
              textColor={textColor}
              onTextColorChange={setTextColor}
            />
          )}

          {/* Circle background for card mode too */}
          {previewMode === 'card' && (
            <CircleBackgroundPicker
              value={circleBackground}
              onChange={setCircleBackground}
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
              {t('undo')}
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 hover:bg-muted disabled:opacity-40"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
              {t('redo')}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Wizard */}
      <div className="flex-1 space-y-6">
        {/* Step Indicator */}
        <WizardStepIndicator
          steps={translatedSteps}
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
            {t('back')}
          </button>

          {/* Show different buttons based on step */}
          {currentStep < translatedSteps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('next')}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            /* On last step, show save button - text changes based on status */
            <button
              type="button"
              onClick={() => onSave()}
              disabled={isSaving || !canSave}
              title={!canSave ? t('fixValidationErrors') : undefined}
              className={`
                flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-xl disabled:opacity-50 transition-all
                ${draft.status === 'published' 
                  ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:shadow-lg' 
                  : 'border border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100'
                }
              `}
            >
              {isSaving 
                ? t('saving') 
                : draft.status === 'published' 
                  ? t('publish') 
                  : t('saveDraft')
              }
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
  const t = useTranslations('admin.achievements.editor');
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
            {t('selectLayers')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('layersDescription')}
          </p>
        </div>
        <RandomizeButton onClick={randomizeAll} label={t('randomizeAll')} />
      </div>

      {/* Layer Dropdowns */}
      <div className="grid gap-4">
        {/* Base - single select */}
        <LayerDropdownSelector
          label={t('baseLabel')}
          description={t('baseDropdownDesc')}
          type="base"
          assets={baseAssets}
          selectedId={draft.icon.base?.id}
          onSelect={(id) => updateIcon({ base: { id } })}
        />

        {/* Backgrounds - multi select */}
        <LayerDropdownSelector
          label={t('backgroundLabel')}
          description={t('backgroundDropdownDesc')}
          type="background"
          assets={bgAssets}
          multiSelect
          selectedItems={draft.icon.backgrounds || []}
          onMultiSelect={(items) => updateIcon({ backgrounds: items })}
        />

        {/* Foregrounds - multi select */}
        <LayerDropdownSelector
          label={t('foregroundLabel')}
          description={t('foregroundDropdownDesc')}
          type="foreground"
          assets={fgAssets}
          multiSelect
          selectedItems={draft.icon.foregrounds || []}
          onMultiSelect={(items) => updateIcon({ foregrounds: items })}
        />

        {/* Symbol - single select */}
        <LayerDropdownSelector
          label={t('symbolLabel')}
          description={t('symbolDropdownDesc')}
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
  const t = useTranslations('admin.achievements.editor');
  // Get current layer colors
  const baseColor = draft.icon.base?.color || draft.icon.customColors?.base || currentTheme.colors.base.color;
  const symbolColor = draft.icon.symbol?.color || draft.icon.customColors?.symbol || currentTheme.colors.symbol.color;

  const updateLayerColor = (layerType: 'base' | 'symbol', color: string) => {
    const layer = draft.icon[layerType];
    if (layer) {
      // When manually changing colors, switch to custom mode
      updateIcon({ 
        [layerType]: { ...layer, color },
        mode: 'custom',
      });
    }
  };

  const updateStackColor = (stackType: 'backgrounds' | 'foregrounds', index: number, color: string) => {
    const stack = draft.icon[stackType];
    if (stack && stack[index]) {
      const newStack = [...stack];
      newStack[index] = { ...newStack[index], color };
      // When manually changing colors, switch to custom mode
      updateIcon({ 
        [stackType]: newStack,
        mode: 'custom',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <SwatchIcon className="h-5 w-5 text-primary" />
            {t('themeAndColors')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('themeAndColorsDescription')}
          </p>
        </div>
        <RandomizeButton onClick={randomizeColors} label={t('randomizeColors')} />
      </div>

      {/* Theme selector (quick presets) */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t('quickThemeSelect')}</p>
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
        <p className="text-sm font-medium text-foreground">{t('customColorsPerLayer')}</p>

        {/* Base color */}
        {draft.icon.base && (
          <ColorInputWithPicker
            label={t('layerLabels.base')}
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
            label={`${t('layerLabels.background')} ${idx + 1}`}
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
            label={`${t('foreground')} ${idx + 1}`}
            value={fg.color || currentTheme.colors.foreground.color}
            onChange={(color) => updateStackColor('foregrounds', idx, color)}
            layerPreviewSrc={resolveAssetUrl(fg.id, 'sm')}
            layerName={getAssetById(fg.id)?.label}
          />
        ))}

        {/* Symbol color */}
        {draft.icon.symbol && (
          <ColorInputWithPicker
            label={t('layerLabels.symbol')}
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
  const t = useTranslations('admin.achievements.editor');
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary" />
          {t('metadata')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('metadataDescription')}
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t('nameLabel')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
            placeholder={t('namePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('subtitleLabel')}</label>
          <input
            type="text"
            value={draft.subtitle || ''}
            onChange={(e) => updateDraft({ subtitle: e.target.value })}
            placeholder={t('subtitlePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('descriptionLabel')}</label>
          <textarea
            value={draft.description || ''}
            onChange={(e) => updateDraft({ description: e.target.value })}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Reward coins */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('rewardCoinsLabel')}</label>
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
            {t('rewardCoinsTip')}
          </p>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('categoryLabel')}</label>
          <select
            value={draft.category || ''}
            onChange={(e) => updateDraft({ category: e.target.value || undefined })}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('categoryPlaceholder')}</option>
            <option value="spel">{t('categories.games')}</option>
            <option value="social">{t('categories.social')}</option>
            <option value="prestation">{t('categories.achievement')}</option>
            <option value="larande">{t('categories.learning')}</option>
            <option value="event">{t('categories.event')}</option>
            <option value="special">{t('categories.special')}</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {t('categoryTip')}
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t('tagsLabel')}</label>
          <input
            type="text"
            value={(draft.tags || []).join(', ')}
            onChange={(e) => {
              const tags = e.target.value
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
              updateDraft({ tags: tags.length > 0 ? tags : undefined });
            }}
            placeholder={t('tagsPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground">
            {t('tagsTip')}
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
  validation: ValidationResult;
};

function PublishStep({ draft, updateDraft, validation }: PublishStepProps) {
  const t = useTranslations('admin.achievements.editor');
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CloudArrowUpIcon className="h-5 w-5 text-primary" />
          {t('publishing')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('publishingDescription')}</p>
      </div>

      {/* Validation errors - only show when status is published */}
      {draft.status === 'published' && !validation.valid && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-2">
          <h3 className="font-medium text-red-800 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {t('cannotPublish')}
          </h3>
          <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
            {validation.errors.map((error, i) => (
              <li key={i}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <h3 className="font-medium text-foreground">{t('summary')}</h3>

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('summaryName')}:</span>
            <span className={`font-medium ${!draft.title ? 'text-red-500' : ''}`}>
              {draft.title || t('noName')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('summaryReward')}:</span>
            <span className="font-medium">{draft.rewardCoins || 0} coins</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('summaryLayers')}:</span>
            <span className={`font-medium ${!draft.icon.base && !draft.icon.symbol ? 'text-red-500' : ''}`}>
              {[
                draft.icon.base && '1 bas',
                draft.icon.backgrounds?.length && `${draft.icon.backgrounds.length} bg`,
                draft.icon.foregrounds?.length && `${draft.icon.foregrounds.length} fg`,
                draft.icon.symbol && '1 symbol',
              ]
                .filter(Boolean)
                .join(', ') || t('noLayers')}
            </span>
          </div>
        </div>
      </div>

      {/* Status selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('statusLabel')}</label>
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
            {t('statusDraft')}
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
            {t('statusPublished')}
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
          <span className="text-sm font-medium text-foreground">{t('syncToProfileFrame')}</span>
        </label>
        <p className="text-xs text-muted-foreground pl-6">
          {t('syncToProfileFrameDescription')}
        </p>
      </div>

      {/* Info text about save */}
      <p className="text-center text-sm text-muted-foreground">
        {t('saveInfoText', { action: draft.status === 'published' ? t('publish') : t('saveDraft') })}
      </p>
    </div>
  );
}
