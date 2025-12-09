'use client';

import { useLogo } from '../../store/sandbox-store';
import {
  ControlGroup,
  SliderControl,
  ButtonGroupControl,
} from '../shell/ControlsPanel';

export function LogoControls() {
  const { logoLayout, logoCase, logoSize, logoLetterSpacing, setLogo } = useLogo();

  return (
    <div className="space-y-6">
      {/* Layout */}
      <ControlGroup label="Logo Layout">
        <ButtonGroupControl
          label="Icon Position"
          value={logoLayout}
          options={[
            { value: 'icon-left', label: 'Left' },
            { value: 'icon-top', label: 'Top' },
            { value: 'icon-only', label: 'Icon' },
            { value: 'text-only', label: 'Text' },
          ]}
          onChange={(v) => setLogo({ logoLayout: v as typeof logoLayout })}
        />
      </ControlGroup>

      {/* Case */}
      <ControlGroup label="Text Transform">
        <ButtonGroupControl
          label="Case"
          value={logoCase}
          options={[
            { value: 'lowercase', label: 'lower' },
            { value: 'uppercase', label: 'UPPER' },
            { value: 'title', label: 'Title' },
          ]}
          onChange={(v) => setLogo({ logoCase: v as typeof logoCase })}
        />
      </ControlGroup>

      {/* Size */}
      <ControlGroup label="Size">
        <ButtonGroupControl
          label="Logo Size"
          value={logoSize}
          options={[
            { value: 'sm', label: 'S' },
            { value: 'md', label: 'M' },
            { value: 'lg', label: 'L' },
            { value: 'xl', label: 'XL' },
          ]}
          onChange={(v) => setLogo({ logoSize: v as typeof logoSize })}
        />
      </ControlGroup>

      {/* Letter Spacing */}
      <ControlGroup label="Letter Spacing">
        <SliderControl
          label="Tracking"
          value={logoLetterSpacing}
          min={-0.05}
          max={0.2}
          step={0.01}
          unit="em"
          onChange={(v) => setLogo({ logoLetterSpacing: v })}
        />
      </ControlGroup>
    </div>
  );
}
