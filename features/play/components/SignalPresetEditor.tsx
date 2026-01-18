/**
 * SignalPresetEditor Component
 * 
 * CRUD component for creating and editing signal presets.
 * Used in Game Builder to define reusable signal configurations.
 * 
 * Task 4.2 - Session Cockpit Architecture
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  LightBulbIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BellIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  Bars3Icon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export type SignalType = 'torch' | 'audio' | 'vibration' | 'screen_flash' | 'notification';

export type SignalPattern = 
  | 'single'     // Single pulse
  | 'double'     // Two quick pulses
  | 'triple'     // Three quick pulses
  | 'sos'        // SOS morse code
  | 'pulse'      // Continuous pulsing
  | 'custom';    // Custom pattern

export interface SignalStep {
  id: string;
  /** On duration in ms */
  onDuration: number;
  /** Off duration in ms (before next step) */
  offDuration: number;
}

export interface SignalPreset {
  id: string;
  name: string;
  type: SignalType;
  pattern: SignalPattern;
  /** Custom pattern steps (only for 'custom' pattern) */
  customSteps?: SignalStep[];
  /** For audio: URL or 'beep' */
  audioUrl?: string;
  /** For audio: volume 0-1 */
  volume?: number;
  /** For screen_flash: color */
  color?: string;
  /** For notification: title */
  notificationTitle?: string;
  /** For notification: body */
  notificationBody?: string;
  /** How many times to repeat the pattern (1 = play once) */
  repeatCount: number;
  /** Delay between repeats in ms */
  repeatDelay: number;
}

export interface SignalPresetEditorProps {
  /** Current presets */
  presets: SignalPreset[];
  /** Callback when presets change */
  onChange: (presets: SignalPreset[]) => void;
  /** Optional: test signal function */
  onTestSignal?: (preset: SignalPreset) => Promise<void>;
  /** Optional: className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const SIGNAL_TYPE_OPTIONS = [
  { value: 'torch', labelKey: 'torch' },
  { value: 'audio', labelKey: 'audio' },
  { value: 'vibration', labelKey: 'vibration' },
  { value: 'screen_flash', labelKey: 'screenFlash' },
  { value: 'notification', labelKey: 'notification' },
];

const SIGNAL_TYPE_ICONS: Record<SignalType, React.ReactNode> = {
  torch: <LightBulbIcon className="h-4 w-4" />,
  audio: <SpeakerWaveIcon className="h-4 w-4" />,
  vibration: <DevicePhoneMobileIcon className="h-4 w-4" />,
  screen_flash: <ComputerDesktopIcon className="h-4 w-4" />,
  notification: <BellIcon className="h-4 w-4" />,
};

const PATTERN_OPTIONS = [
  { value: 'single', labelKey: 'single' },
  { value: 'double', labelKey: 'double' },
  { value: 'triple', labelKey: 'triple' },
  { value: 'sos', labelKey: 'sos' },
  { value: 'pulse', labelKey: 'pulse' },
  { value: 'custom', labelKey: 'custom' },
];

const PATTERN_DESCRIPTIONS: Record<SignalPattern, string> = {
  single: 'singleDesc',
  double: 'doubleDesc',
  triple: 'tripleDesc',
  sos: 'sosDesc',
  pulse: 'pulseDesc',
  custom: 'customDesc',
};

const PRESET_PATTERNS: Record<Exclude<SignalPattern, 'custom'>, SignalStep[]> = {
  single: [{ id: '1', onDuration: 500, offDuration: 0 }],
  double: [
    { id: '1', onDuration: 200, offDuration: 100 },
    { id: '2', onDuration: 200, offDuration: 0 },
  ],
  triple: [
    { id: '1', onDuration: 150, offDuration: 100 },
    { id: '2', onDuration: 150, offDuration: 100 },
    { id: '3', onDuration: 150, offDuration: 0 },
  ],
  sos: [
    // S: ...
    { id: '1', onDuration: 100, offDuration: 100 },
    { id: '2', onDuration: 100, offDuration: 100 },
    { id: '3', onDuration: 100, offDuration: 300 },
    // O: ---
    { id: '4', onDuration: 300, offDuration: 100 },
    { id: '5', onDuration: 300, offDuration: 100 },
    { id: '6', onDuration: 300, offDuration: 300 },
    // S: ...
    { id: '7', onDuration: 100, offDuration: 100 },
    { id: '8', onDuration: 100, offDuration: 100 },
    { id: '9', onDuration: 100, offDuration: 0 },
  ],
  pulse: [
    { id: '1', onDuration: 200, offDuration: 200 },
  ],
};

const AUDIO_OPTIONS = [
  { value: 'beep', labelKey: 'beep' },
  { value: 'bell', labelKey: 'bell' },
  { value: 'chime', labelKey: 'chime' },
  { value: 'alert', labelKey: 'alert' },
];

const REPEAT_OPTIONS = [
  { value: '1', labelKey: 'once' },
  { value: '2', labelKey: 'twice' },
  { value: '3', labelKey: 'thrice' },
  { value: '5', labelKey: 'fiveTimes' },
  { value: '0', labelKey: 'infinite' },
];

const COLOR_PRESETS = [
  { value: '#ffffff', labelKey: 'white' },
  { value: '#ff0000', labelKey: 'red' },
  { value: '#00ff00', labelKey: 'green' },
  { value: '#0000ff', labelKey: 'blue' },
  { value: '#ffff00', labelKey: 'yellow' },
  { value: '#ff00ff', labelKey: 'magenta' },
  { value: '#00ffff', labelKey: 'cyan' },
];

// =============================================================================
// Helper: Generate ID
// =============================================================================

const generateId = () => Math.random().toString(36).substring(2, 10);

// =============================================================================
// Helper: Create Default Preset
// =============================================================================

const createDefaultPreset = (
  t: ReturnType<typeof useTranslations<'play.signalPresetEditor'>>,
  type: SignalType = 'screen_flash'
): SignalPreset => ({
  id: generateId(),
  name: t('defaults.name'),
  type,
  pattern: 'single',
  repeatCount: 1,
  repeatDelay: 500,
  color: '#ffffff',
  volume: 0.5,
  audioUrl: 'beep',
  notificationTitle: t('defaults.notificationTitle'),
  notificationBody: '',
});

// =============================================================================
// Sub-Component: PresetCard
// =============================================================================

interface PresetCardProps {
  preset: SignalPreset;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (preset: SignalPreset) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onTest?: () => Promise<void>;
  isTesting: boolean;
  t: ReturnType<typeof useTranslations<'play.signalPresetEditor'>>;
}

function PresetCard({
  preset,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onTest,
  isTesting,
  t,
}: PresetCardProps) {
  const patternOption = PATTERN_OPTIONS.find((o) => o.value === preset.pattern);
  
  if (!isEditing) {
    // Collapsed view
    return (
      <Card className="group cursor-pointer hover:border-primary/50" onClick={onEdit}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Bars3Icon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2">
              {SIGNAL_TYPE_ICONS[preset.type]}
              <span className="font-medium">{preset.name}</span>
            </div>
            <Badge variant="outline" className="ml-auto">
              {patternOption ? t(`patterns.${patternOption.labelKey}` as Parameters<typeof t>[0]) : preset.pattern}
            </Badge>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onTest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTest();
                  }}
                  disabled={isTesting}
                  className="h-8 w-8 p-0"
                >
                  {isTesting ? (
                    <PauseIcon className="h-4 w-4" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="h-8 w-8 p-0"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Expanded editing view
  return (
    <Card className="border-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('editSignal')}</CardTitle>
          <div className="flex items-center gap-1">
            {onTest && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <PauseIcon className="h-4 w-4 mr-1" />
                    {t('playing')}
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-1" />
                    {t('test')}
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {t('configureProperties')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor={`preset-name-${preset.id}`}>{t('labels.name')}</Label>
          <Input
            id={`preset-name-${preset.id}`}
            value={preset.name}
            onChange={(e) => onUpdate({ ...preset, name: e.target.value })}
            placeholder={t('placeholders.signalName')}
          />
        </div>
        
        {/* Type */}
        <div className="space-y-2">
          <Label>{t('labels.signalType')}</Label>
          <Select
            value={preset.type}
            onChange={(e) => onUpdate({ ...preset, type: e.target.value as SignalType })}
            options={SIGNAL_TYPE_OPTIONS.map(o => ({ value: o.value, label: t(`signalTypes.${o.labelKey}` as Parameters<typeof t>[0]) }))}
          />
        </div>
        
        {/* Pattern */}
        <div className="space-y-2">
          <Label>{t('labels.pattern')}</Label>
          <Select
            value={preset.pattern}
            onChange={(e) => {
              const value = e.target.value as SignalPattern;
              onUpdate({
                ...preset,
                pattern: value,
                customSteps: value === 'custom' 
                  ? [{ id: generateId(), onDuration: 200, offDuration: 200 }]
                  : undefined,
              });
            }}
            options={PATTERN_OPTIONS.map(o => ({ value: o.value, label: t(`patterns.${o.labelKey}` as Parameters<typeof t>[0]) }))}
          />
          <p className="text-xs text-muted-foreground">
            {t(`patternDescriptions.${PATTERN_DESCRIPTIONS[preset.pattern]}` as Parameters<typeof t>[0])}
          </p>
        </div>
        
        {/* Custom Pattern Editor */}
        {preset.pattern === 'custom' && preset.customSteps && (
          <CustomPatternEditor
            steps={preset.customSteps}
            onChange={(steps) => onUpdate({ ...preset, customSteps: steps })}
            t={t}
          />
        )}
        
        {/* Type-specific options */}
        {preset.type === 'screen_flash' && (
          <div className="space-y-2">
            <Label>{t('labels.color')}</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => onUpdate({ ...preset, color: color.value })}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all
                    ${preset.color === color.value ? 'border-primary scale-110' : 'border-transparent'}
                  `}
                  style={{ backgroundColor: color.value }}
                  title={t(`colors.${color.labelKey}` as Parameters<typeof t>[0])}
                />
              ))}
              <Input
                type="color"
                value={preset.color || '#ffffff'}
                onChange={(e) => onUpdate({ ...preset, color: e.target.value })}
                className="w-8 h-8 p-0 border-0"
              />
            </div>
          </div>
        )}
        
        {preset.type === 'audio' && (
          <>
            <div className="space-y-2">
              <Label>{t('labels.audioSource')}</Label>
              <Select
                value={preset.audioUrl || 'beep'}
                onChange={(e) => onUpdate({ ...preset, audioUrl: e.target.value })}
                options={AUDIO_OPTIONS.map(o => ({ value: o.value, label: t(`audioTypes.${o.labelKey}` as Parameters<typeof t>[0]) }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('labels.volume', { percent: Math.round((preset.volume || 0.5) * 100) })}</Label>
              <Slider
                value={[(preset.volume || 0.5) * 100]}
                onValueChange={(values) => onUpdate({ ...preset, volume: values[0] / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </>
        )}
        
        {preset.type === 'notification' && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`preset-notif-title-${preset.id}`}>{t('labels.title')}</Label>
              <Input
                id={`preset-notif-title-${preset.id}`}
                value={preset.notificationTitle || ''}
                onChange={(e) => onUpdate({ ...preset, notificationTitle: e.target.value })}
                placeholder={t('placeholders.notificationTitle')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`preset-notif-body-${preset.id}`}>{t('labels.message')}</Label>
              <Input
                id={`preset-notif-body-${preset.id}`}
                value={preset.notificationBody || ''}
                onChange={(e) => onUpdate({ ...preset, notificationBody: e.target.value })}
                placeholder={t('placeholders.optionalMessage')}
              />
            </div>
          </>
        )}
        
        {/* Repeat settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`preset-repeat-${preset.id}`}>{t('labels.repeat')}</Label>
            <Select
              value={preset.repeatCount.toString()}
              onChange={(e) => onUpdate({ ...preset, repeatCount: parseInt(e.target.value) })}
              options={REPEAT_OPTIONS.map(o => ({ value: o.value, label: t(`repeatOptions.${o.labelKey}` as Parameters<typeof t>[0]) }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`preset-delay-${preset.id}`}>{t('labels.pause')}</Label>
            <Input
              id={`preset-delay-${preset.id}`}
              type="number"
              value={preset.repeatDelay}
              onChange={(e) => onUpdate({ ...preset, repeatDelay: parseInt(e.target.value) || 0 })}
              min={0}
              max={5000}
              step={100}
            />
          </div>
        </div>
        
        {/* Done button */}
        <div className="pt-2">
          <Button variant="outline" onClick={onEdit} className="w-full">
            {t('done')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Sub-Component: CustomPatternEditor
// =============================================================================

interface CustomPatternEditorProps {
  steps: SignalStep[];
  onChange: (steps: SignalStep[]) => void;
  t: ReturnType<typeof useTranslations<'play.signalPresetEditor'>>;
}

function CustomPatternEditor({ steps, onChange, t }: CustomPatternEditorProps) {
  const addStep = () => {
    onChange([
      ...steps,
      { id: generateId(), onDuration: 200, offDuration: 200 },
    ]);
  };
  
  const updateStep = (id: string, updates: Partial<SignalStep>) => {
    onChange(
      steps.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      )
    );
  };
  
  const removeStep = (id: string) => {
    onChange(steps.filter((step) => step.id !== id));
  };
  
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t('patternSteps')}</Label>
        <Button variant="outline" size="sm" onClick={addStep}>
          <PlusIcon className="h-4 w-4 mr-1" />
          {t('add')}
        </Button>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center gap-2 p-2 bg-background rounded border"
          >
            <span className="text-sm text-muted-foreground w-6">
              {index + 1}.
            </span>
            
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={step.onDuration}
                  onChange={(e) => updateStep(step.id, {
                    onDuration: parseInt(e.target.value) || 0,
                  })}
                  className="h-8"
                  min={50}
                  max={5000}
                  step={50}
                />
                <span className="text-xs text-muted-foreground">{t('on')}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={step.offDuration}
                  onChange={(e) => updateStep(step.id, {
                    offDuration: parseInt(e.target.value) || 0,
                  })}
                  className="h-8"
                  min={0}
                  max={5000}
                  step={50}
                />
                <span className="text-xs text-muted-foreground">{t('off')}</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeStep(step.id)}
              disabled={steps.length <= 1}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      {/* Pattern visualization */}
      <PatternVisualization steps={steps} t={t} />
    </div>
  );
}

// =============================================================================
// Sub-Component: PatternVisualization
// =============================================================================

interface PatternVisualizationProps {
  steps: SignalStep[];
  t: ReturnType<typeof useTranslations<'play.signalPresetEditor'>>;
}

function PatternVisualization({ steps, t }: PatternVisualizationProps) {
  const totalDuration = steps.reduce(
    (sum, step) => sum + step.onDuration + step.offDuration,
    0
  );
  
  if (totalDuration === 0) return null;
  
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{t('preview')}</Label>
      <div className="flex h-6 bg-muted rounded overflow-hidden">
        {steps.map((step) => {
          const onWidth = (step.onDuration / totalDuration) * 100;
          const offWidth = (step.offDuration / totalDuration) * 100;
          
          return (
            <React.Fragment key={step.id}>
              <div
                className="bg-primary h-full"
                style={{ width: `${onWidth}%` }}
                title={t('onDuration', { ms: step.onDuration })}
              />
              {step.offDuration > 0 && (
                <div
                  className="bg-muted-foreground/20 h-full"
                  style={{ width: `${offWidth}%` }}
                  title={t('offDuration', { ms: step.offDuration })}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {t('total', { ms: totalDuration })}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SignalPresetEditor({
  presets,
  onChange,
  onTestSignal,
  className,
}: SignalPresetEditorProps) {
  const t = useTranslations('play.signalPresetEditor');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  const addPreset = useCallback(() => {
    const newPreset = createDefaultPreset(t);
    onChange([...presets, newPreset]);
    setEditingId(newPreset.id);
  }, [presets, onChange, t]);
  
  const updatePreset = useCallback((preset: SignalPreset) => {
    onChange(presets.map((p) => (p.id === preset.id ? preset : p)));
  }, [presets, onChange]);
  
  const deletePreset = useCallback((id: string) => {
    onChange(presets.filter((p) => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  }, [presets, onChange, editingId]);
  
  const duplicatePreset = useCallback((preset: SignalPreset) => {
    const newPreset: SignalPreset = {
      ...preset,
      id: generateId(),
      name: t('copySuffix', { name: preset.name }),
    };
    onChange([...presets, newPreset]);
    setEditingId(newPreset.id);
  }, [presets, onChange, t]);
  
  const testPreset = useCallback(async (preset: SignalPreset) => {
    if (!onTestSignal) return;
    
    setTestingId(preset.id);
    try {
      await onTestSignal(preset);
    } finally {
      setTestingId(null);
    }
  }, [onTestSignal]);
  
  return (
    <div className={className}>
      <div className="space-y-3">
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isEditing={editingId === preset.id}
            onEdit={() => setEditingId(editingId === preset.id ? null : preset.id)}
            onUpdate={updatePreset}
            onDelete={() => deletePreset(preset.id)}
            onDuplicate={() => duplicatePreset(preset)}
            onTest={onTestSignal ? () => testPreset(preset) : undefined}
            isTesting={testingId === preset.id}
            t={t}
          />
        ))}
        
        {presets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <SpeakerWaveIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('noSignalsDefined')}</p>
            <p className="text-sm">{t('addSignalsHint')}</p>
          </div>
        )}
        
        <Button
          variant="outline"
          onClick={addPreset}
          className="w-full"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('addSignal')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { PRESET_PATTERNS, SIGNAL_TYPE_OPTIONS, PATTERN_OPTIONS, COLOR_PRESETS };
