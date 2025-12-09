'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { ColorControls, SpacingControls } from '../components/controls';
import { CoinBalance, AchievementBadgePreview } from '../components/previews';

function GamificationModuleControls() {
  return (
    <div className="space-y-6">
      <ColorControls />
      <SpacingControls />
    </div>
  );
}

export default function GamificationPage() {
  return (
    <SandboxShellV2
      moduleId="gamification"
      title="Gamification"
      description="Lekvalutan coin, achievements, progress indicators, and reward UI."
      controls={<GamificationModuleControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <CoinBalance />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <AchievementBadgePreview />
        </div>
      </div>
    </SandboxShellV2>
  );
}
