'use client';

import { useTypography } from '../../store/sandbox-store';
import { fontFamilies, typeScales } from '../../tokens/fonts';
import {
  ControlGroup,
  SliderControl,
  SelectControl,
  ButtonGroupControl,
} from '../shell/ControlsPanel';

export function TypographyControls() {
  const {
    fontPrimary,
    fontSecondary,
    baseFontSize,
    typeScaleRatio,
    fontWeight,
    lineHeight,
    setTypography,
  } = useTypography();

  const fontOptions = fontFamilies.map((f) => ({
    value: f.id,
    label: f.name,
  }));

  const scaleOptions = typeScales.map((scale) => ({
    value: String(scale.value),
    label: scale.label,
  }));

  return (
    <div className="space-y-6">
      {/* Font Families */}
      <ControlGroup label="Font Families">
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
      </ControlGroup>

      {/* Size & Scale */}
      <ControlGroup label="Size & Scale">
        <SliderControl
          label="Base Font Size"
          value={baseFontSize}
          min={12}
          max={24}
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
        <SliderControl
          label="Custom Scale Ratio"
          value={typeScaleRatio}
          min={1.05}
          max={1.7}
          step={0.01}
          onChange={(v) => setTypography({ typeScaleRatio: v })}
        />
      </ControlGroup>

      {/* Font Weight */}
      <ControlGroup label="Font Weight">
        <ButtonGroupControl
          label="Weight"
          value={String(fontWeight)}
          options={[
            { value: '400', label: '400' },
            { value: '500', label: '500' },
            { value: '600', label: '600' },
            { value: '700', label: '700' },
          ]}
          onChange={(v) => setTypography({ fontWeight: parseInt(v) as 300 | 400 | 500 | 600 | 700 | 800 })}
        />
      </ControlGroup>

      {/* Line Height */}
      <ControlGroup label="Line Height">
        <SliderControl
          label="Line Height"
          value={lineHeight}
          min={1}
          max={2}
          step={0.05}
          onChange={(v) => setTypography({ lineHeight: v })}
        />
      </ControlGroup>
    </div>
  );
}
