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
  const setBackground = useSpatialEditorStore((s) => s.setBackground);

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

  // Import map snapshot from Spatial Capture tool via sessionStorage
  useEffect(() => {
    const mapParam = searchParams.get('mapSnapshot');
    if (!mapParam) return;
    try {
      const raw = sessionStorage.getItem('spatial-capture-snapshot');
      if (!raw) return;
      const snapshot = JSON.parse(raw) as {
        dataUrl: string;
        exportSize: { w: number; h: number };
        centerLatLng?: { lat: number; lon: number };
        zoom?: number;
        provider?: string;
        capturedAt?: string;
      };
      setBackground({
        type: 'image',
        src: snapshot.dataUrl,
        imageWidth: snapshot.exportSize.w,
        imageHeight: snapshot.exportSize.h,
        opacity: 0.6,
      });
      sessionStorage.removeItem('spatial-capture-snapshot');
    } catch (err) {
      console.warn('[spatial-editor] failed to import map snapshot:', err);
    }
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
