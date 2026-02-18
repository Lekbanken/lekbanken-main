'use client';

import { Suspense } from 'react';
import { SpatialEditor } from '@/features/admin/library/spatial-editor/components/SpatialEditor';

export function SpatialEditorPage({ artifactId }: { artifactId?: string }) {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-gray-400">Laddar editor…</div>}>
        <SpatialEditor initialArtifactId={artifactId} />
      </Suspense>
    </div>
  );
}
