'use client';

import { SandboxShell as SandboxShellV2 } from './SandboxShellV2';

interface SimpleModulePageProps {
  moduleId: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * A simple wrapper for legacy sandbox pages that only need global controls.
 * Provides the new shell structure with minimal changes to existing content.
 * GlobalControls are automatically provided by ContextPanel.
 */
export function SimpleModulePage({
  moduleId,
  title,
  description,
  children,
}: SimpleModulePageProps) {
  return (
    <SandboxShellV2
      moduleId={moduleId}
      title={title}
      description={description}
    >
      {children}
    </SandboxShellV2>
  );
}
