'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { ColorControls } from '../components/controls';
import { ColorPalettePreview } from '../components/previews';

export default function ColorsPage() {
  return (
    <SandboxShellV2
      moduleId="colors"
      title="Colors"
      description="Define accent colors, surfaces, and semantic color palette."
      controls={<ColorControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <ColorPalettePreview />
        </div>
      </div>
    </SandboxShellV2>
  );
}
