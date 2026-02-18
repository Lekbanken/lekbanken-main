'use client';

// =============================================================================
// Spatial Editor – Sandbox page
// =============================================================================

import { Suspense } from 'react';
import { SandboxShell } from '../components/shell/SandboxShellV2';
import { SpatialEditor } from './components/SpatialEditor';

export default function SpatialEditorPage() {
  return (
    <SandboxShell
      moduleId="spatial-editor"
      title="Spatial Editor"
      description="SVG-baserad 2D scene-editor med A4-format, drag & drop, pan/zoom."
      contentWidth="full"
    >
      <div className="h-[calc(100vh-4rem)]">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-gray-400">Laddar editor…</div>}>
          <SpatialEditor />
        </Suspense>
      </div>
    </SandboxShell>
  );
}
