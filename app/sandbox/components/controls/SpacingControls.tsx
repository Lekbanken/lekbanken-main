'use client';

import { useSpacing } from '../../store/sandbox-store';
import { spacingScales, radiusPresets } from '../../tokens/spacing';
import {
  ControlGroup,
  SliderControl,
  SelectControl,
} from '../shell/ControlsPanel';

export function SpacingControls() {
  const { spacingBase, borderRadius, setSpacing } = useSpacing();

  const scaleOptions = spacingScales.map((s) => ({
    value: String(s.base),
    label: s.name,
  }));

  const radiusOptions = radiusPresets.map((r) => ({
    value: String(r.value),
    label: r.name,
  }));

  return (
    <div className="space-y-6">
      {/* Spacing Base */}
      <ControlGroup label="Spacing Scale">
        <SelectControl
          label="Base Unit"
          value={String(spacingBase)}
          options={scaleOptions}
          onChange={(v) => setSpacing({ spacingBase: parseInt(v) })}
        />
        <SliderControl
          label="Custom Base"
          value={spacingBase}
          min={2}
          max={10}
          step={1}
          unit="px"
          onChange={(v) => setSpacing({ spacingBase: v })}
        />
        
        {/* Spacing preview */}
        <div className="mt-4 space-y-2">
          <span className="text-xs text-muted-foreground">Scale Preview</span>
          <div className="flex items-end gap-1">
            {[1, 2, 3, 4, 6, 8].map((mult) => (
              <div
                key={mult}
                className="bg-primary"
                style={{
                  width: spacingBase * mult,
                  height: spacingBase * mult,
                }}
                title={`${mult}x = ${spacingBase * mult}px`}
              />
            ))}
          </div>
          <div className="flex gap-1 text-[10px] text-muted-foreground">
            {[1, 2, 3, 4, 6, 8].map((mult) => (
              <span key={mult} style={{ width: spacingBase * mult }}>
                {spacingBase * mult}
              </span>
            ))}
          </div>
        </div>
      </ControlGroup>

      {/* Border Radius */}
      <ControlGroup label="Border Radius">
        <SelectControl
          label="Preset"
          value={String(borderRadius)}
          options={radiusOptions}
          onChange={(v) => setSpacing({ borderRadius: parseInt(v) })}
        />
        <SliderControl
          label="Custom Radius"
          value={borderRadius}
          min={0}
          max={24}
          step={1}
          unit="px"
          onChange={(v) => setSpacing({ borderRadius: v })}
        />

        {/* Radius preview */}
        <div className="mt-4 flex gap-3">
          {[0, 4, 8, 12, 16].map((r) => (
            <div
              key={r}
              className={`h-12 w-12 border-2 transition-shadow ${
                r === borderRadius ? 'border-primary shadow-md' : 'border-border'
              }`}
              style={{ borderRadius: r }}
              title={`${r}px`}
            />
          ))}
        </div>
      </ControlGroup>
    </div>
  );
}
