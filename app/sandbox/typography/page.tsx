'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { TypographyControls } from '../components/controls';
import { HeadingRamp, BodyTextPreview } from '../components/previews';

export default function TypographyPage() {
  return (
    <SandboxShellV2
      moduleId="typography"
      title="Typography"
      description="Explore font families, sizes, weights, and type scales. Changes apply globally."
      controls={<TypographyControls />}
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
