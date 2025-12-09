'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useTypography, useColors, useSpacing, useViewport, useSandboxStore } from '../../store/sandbox-store';
import { fontFamilies, typeScales } from '../../tokens/fonts';
import { accentPresets } from '../../tokens/colors';
import { viewportConfig, type ViewportMode } from '../../types/sandbox';
import {
  SliderControl,
  SelectControl,
  ButtonGroupControl,
} from '../shell/ControlsPanel';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border pb-4 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {title}
        {isOpen ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronRightIcon className="h-4 w-4" />
        )}
      </button>
      {isOpen && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

export function GlobalControls() {
  const {
    fontPrimary,
    fontSecondary,
    baseFontSize,
    typeScaleRatio,
    setTypography,
  } = useTypography();

  const { colorScheme, accentHue, setColors } = useColors();
  const { spacingBase, borderRadius, setSpacing } = useSpacing();
  const { viewport, setViewport } = useViewport();
  const resetAll = useSandboxStore((s) => s.resetAll);

  const fontOptions = fontFamilies.map((f) => ({
    value: f.id,
    label: f.name,
  }));

  const scaleOptions = typeScales.map((scale) => ({
    value: String(scale.value),
    label: scale.label,
  }));

  const viewportOptions = (Object.keys(viewportConfig) as ViewportMode[]).map((mode) => ({
    value: mode,
    label: viewportConfig[mode].label,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Global Settings
        </span>
        <button
          type="button"
          onClick={resetAll}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Reset
        </button>
      </div>

      {/* Viewport */}
      <CollapsibleSection title="Viewport" defaultOpen>
        <ButtonGroupControl
          label="Viewport Mode"
          value={viewport}
          options={viewportOptions}
          onChange={(v) => setViewport(v as ViewportMode)}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Simulera olika skärmstorlekar i förhandsvisningen.
        </p>
      </CollapsibleSection>

      {/* Theme */}
      <CollapsibleSection title="Theme" defaultOpen>
        <ButtonGroupControl
          label="Color Scheme"
          value={colorScheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => setColors({ colorScheme: v as 'light' | 'dark' })}
        />
      </CollapsibleSection>

      {/* Typography */}
      <CollapsibleSection title="Typography">
        <SelectControl
          label="Primary Font"
          value={fontPrimary}
          options={fontOptions}
          onChange={(v) => setTypography({ fontPrimary: v })}
        />
        <SelectControl
          label="Secondary Font"
          value={fontSecondary}
          options={fontOptions}
          onChange={(v) => setTypography({ fontSecondary: v })}
        />
        <SliderControl
          label="Base Size"
          value={baseFontSize}
          min={12}
          max={20}
          step={1}
          unit="px"
          onChange={(v) => setTypography({ baseFontSize: v })}
        />
        <SelectControl
          label="Type Scale"
          value={String(typeScaleRatio)}
          options={scaleOptions}
          onChange={(v) => setTypography({ typeScaleRatio: parseFloat(v) })}
        />
      </CollapsibleSection>

      {/* Colors */}
      <CollapsibleSection title="Colors">
        <SliderControl
          label="Accent Hue"
          value={accentHue}
          min={0}
          max={360}
          step={1}
          unit="°"
          onChange={(v) => setColors({ accentHue: v })}
        />
        <div className="flex flex-wrap gap-2">
          {accentPresets.map((preset) => (
            <button
              key={preset.hue}
              type="button"
              onClick={() => setColors({ accentHue: preset.hue })}
              className={cn(
                'h-6 w-6 rounded-full transition-transform hover:scale-110',
                accentHue === preset.hue && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
              )}
              style={{ backgroundColor: `hsl(${preset.hue}, 70%, 50%)` }}
              title={preset.name}
            />
          ))}
        </div>
      </CollapsibleSection>

      {/* Spacing */}
      <CollapsibleSection title="Spacing">
        <SliderControl
          label="Base Unit"
          value={spacingBase}
          min={2}
          max={8}
          step={1}
          unit="px"
          onChange={(v) => setSpacing({ spacingBase: v })}
        />
        <SliderControl
          label="Border Radius"
          value={borderRadius}
          min={0}
          max={16}
          step={2}
          unit="px"
          onChange={(v) => setSpacing({ borderRadius: v })}
        />
      </CollapsibleSection>
    </div>
  );
}
