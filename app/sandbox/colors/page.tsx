'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { ColorControls, GlobalControls } from '../components/controls';
import { ColorPalettePreview } from '../components/previews';

function ColorsModuleControls() {
  return (
    <>
      <GlobalControls />
      <div className="mt-6 border-t border-border pt-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Module Controls
        </div>
        <ColorControls />
      </div>
    </>
  );
}

export default function ColorsPage() {
  return (
    <SandboxShellV2
      moduleId="colors"
      title="Colors"
      description="Define accent colors, surfaces, and semantic color palette."
      controls={<ColorsModuleControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <ColorPalettePreview />
        </div>
      </div>
    </SandboxShellV2>
  );
}
