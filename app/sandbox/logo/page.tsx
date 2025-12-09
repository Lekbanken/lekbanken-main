'use client';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { LogoControls, GlobalControls } from '../components/controls';
import { LogoLockup } from '../components/previews';

function LogoModuleControls() {
  return (
    <>
      <GlobalControls />
      <div className="mt-6 border-t border-border pt-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Module Controls
        </div>
        <LogoControls />
      </div>
    </>
  );
}

export default function LogoPage() {
  return (
    <SandboxShellV2
      moduleId="logo"
      title="Logo & Wordmark"
      description="Configure logo layout, sizing, and text treatments for brand consistency."
      controls={<LogoModuleControls />}
    >
      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <LogoLockup />
        </div>
      </div>
    </SandboxShellV2>
  );
}
