'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { TypographyControls, GlobalControls } from '../components/controls';
import { HeadingRamp, BodyTextPreview } from '../components/previews';

function TypographyModuleControls() {
  return (
    <>
      <GlobalControls />
      <div className="mt-6 border-t border-border pt-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Module Controls
        </div>
        <TypographyControls />
      </div>
    </>
  );
}

export default function TypographyPage() {
  return (
    <SandboxShellV2
      moduleId="typography"
      title="Typography"
      description="Explore font families, sizes, weights, and type scales. Changes apply globally."
      controls={<TypographyModuleControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <HeadingRamp />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <BodyTextPreview />
        </div>
      </div>
    </SandboxShellV2>
  );
}
