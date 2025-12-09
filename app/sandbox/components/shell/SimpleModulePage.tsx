'use client';

import { SandboxShell as SandboxShellV2 } from './SandboxShellV2';
import { GlobalControls } from '../controls';

interface SimpleModulePageProps {
  moduleId: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * A simple wrapper for legacy sandbox pages that only need global controls.
 * Provides the new shell structure with minimal changes to existing content.
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
      controls={<GlobalControls />}
    >
      {children}
    </SandboxShellV2>
  );
}
