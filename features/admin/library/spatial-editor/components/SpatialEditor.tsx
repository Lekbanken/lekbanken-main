'use client';

// =============================================================================
// SpatialEditor – Main layout: full-width canvas + floating toolbar/popovers
// =============================================================================

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { SpatialCanvas } from './SpatialCanvas';
import { CanvasToolbar } from './CanvasToolbar';
import { TopToolbar } from './TopToolbar';
import type { SpatialDocumentV1 } from '../lib/types';
import { loadSpatialArtifact } from '../lib/artifact-actions';

export function SpatialEditor({ initialArtifactId }: { initialArtifactId?: string } = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const loadArtifactDocument = useSpatialEditorStore((s) => s.loadArtifactDocument);

  const searchParams = useSearchParams();

  // Load artifact from prop (admin route) or ?artifact=<id> query param on mount
  useEffect(() => {
    const targetId = initialArtifactId ?? searchParams.get('artifact');
    if (!targetId) return;
    loadSpatialArtifact(targetId).then((row) => {
      if (row) {
        loadArtifactDocument(row.document as SpatialDocumentV1, row.id, row.title);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
      <SpatialCanvas ref={svgRef} />
      <TopToolbar svgRef={svgRef} />
      <CanvasToolbar />
    </div>
  );
}
