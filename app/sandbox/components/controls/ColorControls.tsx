'use client';

import { useColors } from '../../store/sandbox-store';
import { accentPresets, surfaceShades } from '../../tokens/colors';
import {
  ControlGroup,
  SliderControl,
  SelectControl,
  ButtonGroupControl,
} from '../shell/ControlsPanel';

export function ColorControls() {
  const { colorScheme, accentHue, surfaceShade, setColors } = useColors();

  const surfaceOptions = surfaceShades.map((s) => ({
    value: s.id,
    label: s.label,
  }));

  return (
    <div className="space-y-6">
      {/* Color Scheme */}
      <ControlGroup label="Color Scheme">
        <ButtonGroupControl
          label="Theme"
          value={colorScheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => setColors({ colorScheme: v as 'light' | 'dark' })}
        />
      </ControlGroup>

      {/* Accent Color */}
      <ControlGroup label="Accent Color">
        <SliderControl
          label="Accent Hue"
          value={accentHue}
          min={0}
          max={360}
          step={1}
          unit="°"
          onChange={(v) => setColors({ accentHue: v })}
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {accentPresets.map((preset) => (
            <button
              key={preset.hue}
              type="button"
              onClick={() => setColors({ accentHue: preset.hue })}
              className="group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-muted"
              title={preset.name}
            >
              <div
                className="h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition-shadow group-hover:ring-primary"
                style={{ backgroundColor: `hsl(${preset.hue}, 70%, 50%)` }}
              />
              <span className="text-[10px] text-muted-foreground">{preset.name}</span>
            </button>
          ))}
        </div>
      </ControlGroup>

      {/* Surface Color */}
      <ControlGroup label="Surface">
        <SelectControl
          label="Background"
          value={surfaceShade}
          options={surfaceOptions}
          onChange={(v) => setColors({ surfaceShade: v as typeof surfaceShade })}
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {surfaceShades.map((shade) => (
            <button
              key={shade.id}
              type="button"
              onClick={() => setColors({ surfaceShade: shade.id as typeof surfaceShade })}
              className={`h-10 rounded-md border transition-shadow hover:ring-2 hover:ring-primary hover:ring-offset-2 ${
                surfaceShade === shade.id ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              style={{ backgroundColor: colorScheme === 'light' ? shade.light : shade.dark }}
              title={shade.label}
            />
          ))}
        </div>
      </ControlGroup>

      {/* Preview swatch */}
      <ControlGroup label="Preview">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-4">
            <div
              className="h-16 w-16 rounded-lg"
              style={{ backgroundColor: `hsl(${accentHue}, 70%, 50%)` }}
            />
            <div className="flex-1 space-y-2">
              <div className="text-sm font-medium">Accent Color</div>
              <div className="font-mono text-xs text-muted-foreground">
                hsl({accentHue}, 70%, 50%)
              </div>
            </div>
          </div>
        </div>
      </ControlGroup>
    </div>
  );
}
