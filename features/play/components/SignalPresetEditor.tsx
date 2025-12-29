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
  { value: 'torch', label: 'Ficklampa' },
  { value: 'audio', label: 'Ljud' },
  { value: 'vibration', label: 'Vibration' },
  { value: 'screen_flash', label: 'Skärmblänk' },
  { value: 'notification', label: 'Notifikation' },
];

const SIGNAL_TYPE_ICONS: Record<SignalType, React.ReactNode> = {
  torch: <LightBulbIcon className="h-4 w-4" />,
  audio: <SpeakerWaveIcon className="h-4 w-4" />,
  vibration: <DevicePhoneMobileIcon className="h-4 w-4" />,
  screen_flash: <ComputerDesktopIcon className="h-4 w-4" />,
  notification: <BellIcon className="h-4 w-4" />,
};

const PATTERN_OPTIONS = [
  { value: 'single', label: 'Enkel' },
  { value: 'double', label: 'Dubbel' },
  { value: 'triple', label: 'Trippel' },
  { value: 'sos', label: 'SOS' },
  { value: 'pulse', label: 'Puls' },
  { value: 'custom', label: 'Anpassad' },
];

const PATTERN_DESCRIPTIONS: Record<SignalPattern, string> = {
  single: 'En kort puls',
  double: 'Två snabba pulser',
  triple: 'Tre snabba pulser',
  sos: '... --- ...',
  pulse: 'Kontinuerlig pulsning',
  custom: 'Skapa eget mönster',
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
  { value: 'beep', label: 'Pip (standard)' },
  { value: 'bell', label: 'Ringklocka' },
  { value: 'chime', label: 'Klang' },
  { value: 'alert', label: 'Larm' },
];

const REPEAT_OPTIONS = [
  { value: '1', label: '1 gång' },
  { value: '2', label: '2 gånger' },
  { value: '3', label: '3 gånger' },
  { value: '5', label: '5 gånger' },
  { value: '0', label: 'Oändligt' },
];

const COLOR_PRESETS = [
  { value: '#ffffff', label: 'Vit' },
  { value: '#ff0000', label: 'Röd' },
  { value: '#00ff00', label: 'Grön' },
  { value: '#0000ff', label: 'Blå' },
  { value: '#ffff00', label: 'Gul' },
  { value: '#ff00ff', label: 'Magenta' },
  { value: '#00ffff', label: 'Cyan' },
];

// =============================================================================
// Helper: Generate ID
// =============================================================================

const generateId = () => Math.random().toString(36).substring(2, 10);

// =============================================================================
// Helper: Create Default Preset
// =============================================================================

const createDefaultPreset = (type: SignalType = 'screen_flash'): SignalPreset => ({
  id: generateId(),
  name: 'Ny signal',
  type,
  pattern: 'single',
  repeatCount: 1,
  repeatDelay: 500,
  color: '#ffffff',
  volume: 0.5,
  audioUrl: 'beep',
  notificationTitle: 'Signal',
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
              {patternOption?.label || preset.pattern}
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
          <CardTitle className="text-base">Redigera signal</CardTitle>
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
                    Spelar...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Testa
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
          Konfigurera signalens egenskaper
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor={`preset-name-${preset.id}`}>Namn</Label>
          <Input
            id={`preset-name-${preset.id}`}
            value={preset.name}
            onChange={(e) => onUpdate({ ...preset, name: e.target.value })}
            placeholder="Signalnamn"
          />
        </div>
        
        {/* Type */}
        <div className="space-y-2">
          <Label>Signaltyp</Label>
          <Select
            value={preset.type}
            onChange={(e) => onUpdate({ ...preset, type: e.target.value as SignalType })}
            options={SIGNAL_TYPE_OPTIONS}
          />
        </div>
        
        {/* Pattern */}
        <div className="space-y-2">
          <Label>Mönster</Label>
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
            options={PATTERN_OPTIONS}
          />
          <p className="text-xs text-muted-foreground">
            {PATTERN_DESCRIPTIONS[preset.pattern]}
          </p>
        </div>
        
        {/* Custom Pattern Editor */}
        {preset.pattern === 'custom' && preset.customSteps && (
          <CustomPatternEditor
            steps={preset.customSteps}
            onChange={(steps) => onUpdate({ ...preset, customSteps: steps })}
          />
        )}
        
        {/* Type-specific options */}
        {preset.type === 'screen_flash' && (
          <div className="space-y-2">
            <Label>Färg</Label>
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
                  title={color.label}
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
              <Label>Ljudkälla</Label>
              <Select
                value={preset.audioUrl || 'beep'}
                onChange={(e) => onUpdate({ ...preset, audioUrl: e.target.value })}
                options={AUDIO_OPTIONS}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Volym: {Math.round((preset.volume || 0.5) * 100)}%</Label>
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
              <Label htmlFor={`preset-notif-title-${preset.id}`}>Rubrik</Label>
              <Input
                id={`preset-notif-title-${preset.id}`}
                value={preset.notificationTitle || ''}
                onChange={(e) => onUpdate({ ...preset, notificationTitle: e.target.value })}
                placeholder="Notifikationsrubrik"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`preset-notif-body-${preset.id}`}>Meddelande</Label>
              <Input
                id={`preset-notif-body-${preset.id}`}
                value={preset.notificationBody || ''}
                onChange={(e) => onUpdate({ ...preset, notificationBody: e.target.value })}
                placeholder="Valfritt meddelande"
              />
            </div>
          </>
        )}
        
        {/* Repeat settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`preset-repeat-${preset.id}`}>Upprepa</Label>
            <Select
              value={preset.repeatCount.toString()}
              onChange={(e) => onUpdate({ ...preset, repeatCount: parseInt(e.target.value) })}
              options={REPEAT_OPTIONS}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`preset-delay-${preset.id}`}>Paus (ms)</Label>
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
            Klar
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
}

function CustomPatternEditor({ steps, onChange }: CustomPatternEditorProps) {
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
        <Label className="text-sm font-medium">Steg i mönstret</Label>
        <Button variant="outline" size="sm" onClick={addStep}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Lägg till
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
                <span className="text-xs text-muted-foreground">på</span>
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
                <span className="text-xs text-muted-foreground">av</span>
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
      <PatternVisualization steps={steps} />
    </div>
  );
}

// =============================================================================
// Sub-Component: PatternVisualization
// =============================================================================

interface PatternVisualizationProps {
  steps: SignalStep[];
}

function PatternVisualization({ steps }: PatternVisualizationProps) {
  const totalDuration = steps.reduce(
    (sum, step) => sum + step.onDuration + step.offDuration,
    0
  );
  
  if (totalDuration === 0) return null;
  
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Förhandsvisning</Label>
      <div className="flex h-6 bg-muted rounded overflow-hidden">
        {steps.map((step) => {
          const onWidth = (step.onDuration / totalDuration) * 100;
          const offWidth = (step.offDuration / totalDuration) * 100;
          
          return (
            <React.Fragment key={step.id}>
              <div
                className="bg-primary h-full"
                style={{ width: `${onWidth}%` }}
                title={`På: ${step.onDuration}ms`}
              />
              {step.offDuration > 0 && (
                <div
                  className="bg-muted-foreground/20 h-full"
                  style={{ width: `${offWidth}%` }}
                  title={`Av: ${step.offDuration}ms`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground text-right">
        Total: {totalDuration}ms
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  
  const addPreset = useCallback(() => {
    const newPreset = createDefaultPreset();
    onChange([...presets, newPreset]);
    setEditingId(newPreset.id);
  }, [presets, onChange]);
  
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
      name: `${preset.name} (kopia)`,
    };
    onChange([...presets, newPreset]);
    setEditingId(newPreset.id);
  }, [presets, onChange]);
  
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
          />
        ))}
        
        {presets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <SpeakerWaveIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Inga signaler definierade</p>
            <p className="text-sm">Lägg till signaler som kan triggas under spelet</p>
          </div>
        )}
        
        <Button
          variant="outline"
          onClick={addPreset}
          className="w-full"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Lägg till signal
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { PRESET_PATTERNS, SIGNAL_TYPE_OPTIONS, PATTERN_OPTIONS, COLOR_PRESETS };
