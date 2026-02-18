'use client';

// =============================================================================
// StationListPanel – Sorted checkpoint list with auto-number & export
// =============================================================================
// Shows all checkpoints sorted by `order`, allows:
// - Click row → select object on canvas
// - Auto-number (spatial: top→bottom, left→right)
// - Renumber 1..N (preserving current sort)
// - Export manifest (JSON / CSV copy to clipboard)
// =============================================================================

import { useSpatialEditorStore } from '../store/spatial-editor-store';
import type { SpatialObjectBase } from '../lib/types';

export function StationListPanel() {
  const doc = useSpatialEditorStore((s) => s.doc);
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const select = useSpatialEditorStore((s) => s.select);
  const autoNumberCheckpoints = useSpatialEditorStore((s) => s.autoNumberCheckpoints);
  const renumberCheckpoints = useSpatialEditorStore((s) => s.renumberCheckpoints);
  const exportCheckpointManifest = useSpatialEditorStore((s) => s.exportCheckpointManifest);

  // Gather all checkpoints from all layers
  const checkpoints: SpatialObjectBase[] = [];
  doc.layers.forEach((layer) => {
    layer.objects.forEach((obj) => {
      if (obj.type === 'checkpoint') {
        checkpoints.push(obj);
      }
    });
  });

  // Sort by order
  checkpoints.sort(
    (a, b) =>
      (((a.props.order as number) ?? 999) - ((b.props.order as number) ?? 999))
      || a.id.localeCompare(b.id),
  );

  if (checkpoints.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 italic">
        Inga stationer än. Placera checkpoints via paletten.
      </div>
    );
  }

  const handleExportJson = () => {
    const json = exportCheckpointManifest();
    navigator.clipboard.writeText(json);
    alert('Checkpoint-manifest kopierat till urklipp (JSON)');
  };

  const handleExportCsv = () => {
    const headers = 'order,label,kind,nx,ny,notes';
    const rows = checkpoints.map((obj) => {
      const order = (obj.props.order as number) ?? 0;
      const label = ((obj.props.label as string) ?? '').replace(/,/g, ';');
      const kind = (obj.props.kind as string) ?? 'checkpoint';
      const notes = ((obj.props.notes as string) ?? '').replace(/,/g, ';').replace(/\n/g, ' ');
      return `${order},${label},${kind},${obj.t.x.toFixed(4)},${obj.t.y.toFixed(4)},${notes}`;
    });
    const csv = [headers, ...rows].join('\n');
    navigator.clipboard.writeText(csv);
    alert('Checkpoint-lista kopierad till urklipp (CSV)');
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Checkpoint list */}
      <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
        {checkpoints.map((obj) => {
          const order = (obj.props.order as number) ?? '?';
          const label = (obj.props.label as string) ?? '';
          const kind = (obj.props.kind as string) ?? 'checkpoint';
          const notes = (obj.props.notes as string) ?? '';
          const isSelected = selectedIds.includes(obj.id);
          const color = (obj.props.color as string) ?? '#10b981';

          const kindEmoji =
            kind === 'start' ? '🟢' : kind === 'finish' ? '🏆' : kind === 'station' ? '🏁' : '📍';

          return (
            <button
              key={obj.id}
              type="button"
              onClick={() => select(obj.id)}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                isSelected
                  ? 'bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-950 dark:ring-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {/* Order badge */}
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {order}
              </span>

              {/* Label + kind */}
              <span className="flex-1 truncate font-medium text-gray-700 dark:text-gray-200">
                {label || `Station ${order}`}
              </span>

              <span className="text-[10px]" title={kind}>
                {kindEmoji}
              </span>

              {/* Notes indicator */}
              {notes && (
                <span className="text-[10px] text-gray-400" title={notes}>
                  📝
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1 border-t border-gray-200 pt-2 dark:border-gray-700">
        <button
          type="button"
          onClick={autoNumberCheckpoints}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Numrera efter position (uppifrån-ner, vänster-höger)"
        >
          🔢 Auto-nr
        </button>
        <button
          type="button"
          onClick={renumberCheckpoints}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Omnumrera 1..N (behåll ordning)"
        >
          ↕ Omnumrera
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Kopiera manifest som JSON"
        >
          📋 JSON
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Kopiera lista som CSV"
        >
          📊 CSV
        </button>
      </div>

      {/* Count */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        {checkpoints.length} station{checkpoints.length !== 1 ? 'er' : ''}
      </p>
    </div>
  );
}
