'use client';

// =============================================================================
// TopToolbar – Floating centered toolbar with 4 popover buttons
// =============================================================================
// Replaces the old sidebar + inline top buttons.
// Layout: [Save] [Background] [Objects] [Info]
// =============================================================================

import { SavePopover } from './SavePopover';
import { BackgroundPopover } from './BackgroundPopover';
import { ObjectsPopover } from './ObjectsPopover';
import { InfoDialog } from './InfoDialog';

export function TopToolbar({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <SavePopover svgRef={svgRef} />
      <BackgroundPopover />
      <ObjectsPopover />
      <InfoDialog />
    </div>
  );
}
