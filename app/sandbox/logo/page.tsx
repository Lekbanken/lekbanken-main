'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { LogoControls } from '../components/controls';
import { LogoLockup } from '../components/previews';

export default function LogoPage() {
  return (
    <SandboxShellV2
      moduleId="logo"
      title="Logo & Wordmark"
      description="Configure logo layout, sizing, and text treatments for brand consistency."
      controls={<LogoControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <LogoLockup />
        </div>
      </div>
    </SandboxShellV2>
  );
}
