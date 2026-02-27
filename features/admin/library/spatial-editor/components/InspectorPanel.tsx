'use client';

// =============================================================================
// InspectorPanel – Shows & edits selected object properties
// =============================================================================

import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { useTranslations } from 'next-intl';
import type { SpatialObjectBase } from '../lib/types';
import type { CheckpointKind } from '../lib/types';
import { ALL_PLAYER_MARKERS, ALL_BALL_MARKERS } from '../lib/types';

const TYPE_LABELS: Record<string, string> = {
  player: 'Spelare',
  ball: 'Boll',
  cone: 'Kon',
  arrow: 'Pil',
  zone: 'Zon',
  'path-segment': 'Stig',
  label: 'Text',
  checkpoint: 'Station',
};

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6b7280', '#1f2937',
];

// ---------------------------------------------------------------------------
// Shared inspector widgets
// ---------------------------------------------------------------------------

function ColorPicker({ obj }: { obj: SpatialObjectBase }) {
  const t = useTranslations('admin.library.spatialEditor.inspector');
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const current = (obj.props.color as string) ?? '#3b82f6';
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-gray-500 dark:text-gray-400">{t('color')}</span>
      <div className="flex flex-wrap gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateObjectProps(obj.id, { color: c })}
            className={`h-6 w-6 rounded-full border-2 ${current === c ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-600'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <input
        type="color"
        value={current}
        onChange={(e) => updateObjectProps(obj.id, { color: e.target.value })}
        className="mt-1 h-7 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-600"
      />
    </div>
  );
}

function RotationControls({ obj }: { obj: SpatialObjectBase }) {
  const updateObjectTransform = useSpatialEditorStore((s) => s.updateObjectTransform);
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-gray-500 dark:text-gray-400">Rotation</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateObjectTransform(obj.id, { rotation: (obj.t.rotation ?? 0) - 15 })}
          className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          −15°
        </button>
        <button
          type="button"
          onClick={() => updateObjectTransform(obj.id, { rotation: (obj.t.rotation ?? 0) - 5 })}
          className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          −5°
        </button>
        <input
          type="number"
          value={obj.t.rotation ?? 0}
          onChange={(e) => updateObjectTransform(obj.id, { rotation: Number(e.target.value) })}
          className="w-14 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-center text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
        <button
          type="button"
          onClick={() => updateObjectTransform(obj.id, { rotation: (obj.t.rotation ?? 0) + 5 })}
          className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          +5°
        </button>
        <button
          type="button"
          onClick={() => updateObjectTransform(obj.id, { rotation: (obj.t.rotation ?? 0) + 15 })}
          className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          +15°
        </button>
        {(obj.t.rotation ?? 0) !== 0 && (
          <button
            type="button"
            onClick={() => updateObjectTransform(obj.id, { rotation: 0 })}
            className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400"
          >
            ↺ 0°
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arrow-specific inspector
// ---------------------------------------------------------------------------

function ArrowInspector({ obj }: { obj: SpatialObjectBase }) {
  const t = useTranslations('admin.library.spatialEditor.inspector');
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const pattern = (obj.props.pattern as string) ?? 'solid';
  const hasArrowhead = obj.props.arrowhead !== false;

  return (
    <>
      {/* Endpoints display */}
      {obj.from && obj.to && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">{t('from')}:</span>{' '}
              <span className="font-mono">{(obj.from.x * 100).toFixed(0)}%, {(obj.from.y * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="font-medium">{t('to')}:</span>{' '}
              <span className="font-mono">{(obj.to.x * 100).toFixed(0)}%, {(obj.to.y * 100).toFixed(0)}%</span>
            </div>
          </div>
          <p className="mt-0.5 text-[10px] text-gray-400">{t('dragEndpointsHint')}</p>
        </div>
      )}

      {/* Pattern selector */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="text-gray-500 dark:text-gray-400">{t('pattern')}</span>
        <div className="flex gap-1">
          {(['solid', 'dashed'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateObjectProps(obj.id, { pattern: p })}
              className={`flex-1 rounded border px-2 py-1 text-center text-[11px] font-medium transition-colors ${
                pattern === p
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              {p === 'solid' ? '── Heldragen' : '╌╌ Streckad'}
            </button>
          ))}
        </div>
      </div>

      {/* Arrowhead toggle */}
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={hasArrowhead}
          onChange={(e) => updateObjectProps(obj.id, { arrowhead: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600 dark:text-gray-300">Visa pilspets</span>
      </label>

      {/* Color */}
      <ColorPicker obj={obj} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Zone-specific inspector
// ---------------------------------------------------------------------------

function ZoneInspector({ obj }: { obj: SpatialObjectBase }) {
  const t = useTranslations('admin.library.spatialEditor.inspector');
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const fillOpacity = (obj.props.fillOpacity as number) ?? 0.2;
  const polyPoints = obj.props.points as { x: number; y: number }[] | undefined;
  const isPolygon = polyPoints && polyPoints.length >= 3;
  const variant = obj.props.polygonVariant as string | undefined;

  return (
    <>
      {/* Polygon info */}
      {isPolygon && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">{variant === 'water' ? t('water') : t('zone')}</span>
          <span className="ml-1">({polyPoints.length} {t('corners')})</span>
        </div>
      )}

      {/* Size display (rect zones only) */}
      {!isPolygon && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Bredd</span>
            <span className="ml-1 font-mono">{((obj.props.width as number ?? 0.1) * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t('height')}</span>
            <span className="ml-1 font-mono">{((obj.props.height as number ?? 0.07) * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Fill opacity slider */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="text-gray-500 dark:text-gray-400">{t('fillOpacity', { percent: (fillOpacity * 100).toFixed(0) })}</span>
        <input
          type="range"
          min={0.05}
          max={0.8}
          step={0.05}
          value={fillOpacity}
          onChange={(e) => updateObjectProps(obj.id, { fillOpacity: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Color */}
      <ColorPicker obj={obj} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Checkpoint-specific inspector
// ---------------------------------------------------------------------------

const CHECKPOINT_KINDS: { value: CheckpointKind; label: string; emoji: string }[] = [
  { value: 'checkpoint', label: 'Checkpoint', emoji: '📍' },
  { value: 'station', label: 'Station', emoji: '🏁' },
  { value: 'start', label: 'Start', emoji: '🟢' },
  { value: 'finish', label: 'Mål', emoji: '🏆' },
];

function CheckpointInspector({ obj }: { obj: SpatialObjectBase }) {
  const t = useTranslations('admin.library.spatialEditor.inspector');
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const cpLabel = (obj.props.label as string) ?? '';
  const order = (obj.props.order as number) ?? 1;
  const kind = (obj.props.kind as CheckpointKind) ?? 'checkpoint';
  const notes = (obj.props.notes as string) ?? '';

  return (
    <>
      {/* Label */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Etikett</span>
        <input
          type="text"
          value={cpLabel}
          onChange={(e) => updateObjectProps(obj.id, { label: e.target.value })}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          placeholder="1, A, Start…"
        />
      </label>

      {/* Order */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Ordning</span>
        <input
          type="number"
          min={1}
          value={order}
          onChange={(e) => updateObjectProps(obj.id, { order: Number(e.target.value) })}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />
      </label>

      {/* Kind */}
      <div className="flex flex-col gap-1 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Typ</span>
        <div className="flex flex-wrap gap-1">
          {CHECKPOINT_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => updateObjectProps(obj.id, { kind: k.value })}
              className={`rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
                kind === k.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              {k.emoji} {k.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Anteckningar</span>
        <textarea
          value={notes}
          onChange={(e) => updateObjectProps(obj.id, { notes: e.target.value })}
          rows={2}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          placeholder={t('exerciseDescriptionPlaceholder')}
        />
      </label>

      {/* Color */}
      <ColorPicker obj={obj} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main ObjectInspector
// ---------------------------------------------------------------------------

function ObjectInspector({ obj }: { obj: SpatialObjectBase }) {
  const t = useTranslations('admin.library.spatialEditor.inspector');
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const updateObjectTransform = useSpatialEditorStore((s) => s.updateObjectTransform);
  const deleteSelected = useSpatialEditorStore((s) => s.deleteSelected);

  const showRotation = obj.type !== 'arrow'; // arrows are defined by two endpoints, rotation N/A
  const showPosition = obj.type !== 'arrow'; // arrows show from/to instead
  const showScale = obj.type !== 'arrow' && obj.type !== 'zone'; // arrows + zones don't scale
  const currentScale = obj.t.scale ?? 1;

  // Determine if this object type is a surroundings/game asset (not core, not arrow/zone)
  const isSurrounding = !['player', 'ball', 'cone', 'arrow', 'zone', 'label', 'checkpoint'].includes(obj.type);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {TYPE_LABELS[obj.type] ?? obj.type}
        </h3>
        <button
          type="button"
          onClick={deleteSelected}
          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          Ta bort
        </button>
      </div>

      {/* Position (editable) — not for arrows */}
      {showPosition && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label>
            <span className="text-gray-500 dark:text-gray-400">X</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={Math.round(obj.t.x * 1000) / 10}
              onChange={(e) => {
                const pct = Number(e.target.value);
                if (!isNaN(pct)) updateObjectTransform(obj.id, { x: Math.max(0, Math.min(1, pct / 100)) });
              }}
              className="ml-1 w-16 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-center text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <span className="ml-0.5 text-gray-400">%</span>
          </label>
          <label>
            <span className="text-gray-500 dark:text-gray-400">Y</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={Math.round(obj.t.y * 1000) / 10}
              onChange={(e) => {
                const pct = Number(e.target.value);
                if (!isNaN(pct)) updateObjectTransform(obj.id, { y: Math.max(0, Math.min(1, pct / 100)) });
              }}
              className="ml-1 w-16 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-center text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <span className="ml-0.5 text-gray-400">%</span>
          </label>
        </div>
      )}

      {/* Scale slider */}
      {showScale && (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Storlek</span>
            <span className="font-mono text-gray-600 dark:text-gray-300">{(currentScale * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={3}
            step={0.1}
            value={currentScale}
            onChange={(e) => updateObjectTransform(obj.id, { scale: Number(e.target.value) })}
            className="w-full"
          />
          {currentScale !== 1 && (
            <button
              type="button"
              onClick={() => updateObjectTransform(obj.id, { scale: 1 })}
              className="self-end text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400"
            >
              ↺ 100%
            </button>
          )}
        </div>
      )}

      {/* Rotation — not for arrows */}
      {showRotation && <RotationControls obj={obj} />}

      {/* Arrow-specific inspector */}
      {obj.type === 'arrow' && <ArrowInspector obj={obj} />}

      {/* Zone-specific inspector */}
      {obj.type === 'zone' && <ZoneInspector obj={obj} />}

      {/* Path-segment polyline inspector */}
      {obj.type === 'path-segment' && (() => {
        const pathPts = obj.props.points as { x: number; y: number }[] | undefined;
        if (pathPts && pathPts.length >= 2) {
          return (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Stig</span>
                <span className="ml-1">({pathPts.length} punkter)</span>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-gray-500 dark:text-gray-400">Linjebredd ({(obj.props.strokeWidth as number) ?? 3})</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={(obj.props.strokeWidth as number) ?? 3}
                  onChange={(e) => updateObjectProps(obj.id, { strokeWidth: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <ColorPicker obj={obj} />
            </div>
          );
        }
        return null;
      })()}

      {/* Player number */}
      {obj.type === 'player' && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Nummer</span>
          <input
            type="number"
            value={(obj.props.number as number) ?? 0}
            onChange={(e) => updateObjectProps(obj.id, { number: Number(e.target.value) })}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
        </label>
      )}

      {/* Marker image selector for player */}
      {obj.type === 'player' && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">{t('marker')}</span>
          <div className="flex flex-wrap gap-1.5">
            {/* No-image option */}
            <button
              type="button"
              onClick={() => updateObjectProps(obj.id, { markerImage: undefined })}
              className={`flex h-9 w-9 items-center justify-center rounded border-2 text-[10px] ${!obj.props.markerImage ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-600'}`}
            >
              ○
            </button>
            {ALL_PLAYER_MARKERS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.label}
                onClick={() => updateObjectProps(obj.id, { markerImage: m.src })}
                className={`h-9 w-9 overflow-hidden rounded border-2 ${obj.props.markerImage === m.src ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-600'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.src} alt={m.label} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Marker image selector for ball */}
      {obj.type === 'ball' && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">{t('marker')}</span>
          <div className="flex flex-wrap gap-1.5">
            {/* No-image option */}
            <button
              type="button"
              onClick={() => updateObjectProps(obj.id, { markerImage: undefined })}
              className={`flex h-9 w-9 items-center justify-center rounded border-2 text-[10px] ${!obj.props.markerImage ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-600'}`}
            >
              ○
            </button>
            {ALL_BALL_MARKERS.map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.label}
                onClick={() => updateObjectProps(obj.id, { markerImage: m.src })}
                className={`h-9 w-9 overflow-hidden rounded border-2 ${obj.props.markerImage === m.src ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-600'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.src} alt={m.label} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Label text */}
      {obj.type === 'label' && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Text</span>
          <input
            type="text"
            value={(obj.props.text as string) ?? ''}
            onChange={(e) => updateObjectProps(obj.id, { text: e.target.value })}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
        </label>
      )}

      {/* Checkpoint-specific inspector */}
      {obj.type === 'checkpoint' && <CheckpointInspector obj={obj} />}

      {/* Color for point objects (player, ball, cone) + surroundings + label */}
      {(obj.type === 'player' || obj.type === 'ball' || obj.type === 'cone' || obj.type === 'label' || isSurrounding) && (
        <ColorPicker obj={obj} />
      )}

      {/* Border color for label */}
      {obj.type === 'label' && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">{t('borderColor')}</span>
          <input
            type="color"
            value={(obj.props.borderColor as string) ?? '#ffffff'}
            onChange={(e) => updateObjectProps(obj.id, { borderColor: e.target.value })}
            className="h-8 w-full cursor-pointer rounded border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
          />
        </label>
      )}

      {/* Label font size */}
      {obj.type === 'label' && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Storlek</span>
          <input
            type="number"
            min={8}
            max={72}
            value={(obj.props.fontSize as number) ?? 16}
            onChange={(e) => updateObjectProps(obj.id, { fontSize: Number(e.target.value) })}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
        </label>
      )}

      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        ID: {obj.id}
      </p>
    </div>
  );
}

export function InspectorPanel() {
  const t = useTranslations('admin.library.spatialEditor.inspector');
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const doc = useSpatialEditorStore((s) => s.doc);

  const allObjects = doc.layers.flatMap((l) => l.objects);

  // Find selected objects
  const selectedObjects = selectedIds
    .map((id) => allObjects.find((o) => o.id === id))
    .filter((o): o is SpatialObjectBase => o != null);

  if (selectedObjects.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 italic">
        {t('selectObjectToEdit')}
      </div>
    );
  }

  if (selectedObjects.length > 1) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p className="font-medium">{selectedObjects.length} objekt valda</p>
        <p className="mt-1 text-gray-400 dark:text-gray-500">
          {t('multiSelectHint')}
        </p>
      </div>
    );
  }

  return <ObjectInspector obj={selectedObjects[0]} />;
}
