'use client';

import { Suspense } from 'react';
import { SpatialEditor } from '@/features/admin/library/spatial-editor/components/SpatialEditor';

export function SpatialEditorPage({ artifactId }: { artifactId?: string }) {
  return (
    // Negative margins cancel AdminShellV2's p-4 / lg:p-6 / xl:p-8 wrapper padding.
    // h-[calc(100vh-3.5rem)] accounts for AdminTopbarV2 (h-14 = 3.5rem).
    // The extra padding (2×p-4 = 2rem etc.) is reclaimed by negative margins.
    <div className="-m-4 lg:-m-6 xl:-m-8 h-[calc(100vh-3.5rem)] overflow-hidden">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-gray-400">Laddar editor…</div>}>
        <SpatialEditor initialArtifactId={artifactId} />
      </Suspense>
    </div>
  );
}
