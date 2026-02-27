'use client';

// =============================================================================
// CanvasToolbar – Floating bottom toolbar (expanded with inspector features)
// =============================================================================
// Row 1: Tool buttons (Select/Hand/Arrow) + Quick controls (Color, Label, Delete)
// Row 2: Object-specific inspector controls (arrow pattern, zone fill, checkpoint,
//         scale slider, marker selector, etc.) — shown only when object selected
// =============================================================================

import { useSpatialEditorStore } from '../store/spatial-editor-store';
import {
  CORE_OBJECT_TYPES,
  LANDMARK_OBJECT_TYPES,
  GAME_ASSET_TYPES,
  INDOOR_OBJECT_TYPES,
  HELPER_OBJECT_TYPES,
  ALL_PLAYER_MARKERS,
  ALL_BALL_MARKERS,
} from '../lib/types';
import type { SpatialObjectBase, CheckpointKind } from '../lib/types';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';

// ---------------------------------------------------------------------------
// Preset colors for quick picker
// ---------------------------------------------------------------------------

const QUICK_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6b7280', '#1f2937',
];

// ---------------------------------------------------------------------------
// Type display names
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  player: 'Spelare', ball: 'Boll', cone: 'Kon', arrow: 'Pil', zone: 'Zon',
  'arrow-chain': 'Pilkedja',
  label: 'Text', checkpoint: 'Station',
  tree: 'Träd', bush: 'Buske', house: 'Hus', building: 'Byggnad',
  'path-segment': 'Stig', bridge: 'Bro', water: 'Vatten', hill: 'Kulle',
  bench: 'Bänk', fence: 'Staket', playground: 'Lekplats',
  compass: 'Kompass', 'num-badge': 'Nummer',
  'flag-start': 'Startflagga', trophy: 'Mål', 'x-mark': 'Kryss',
  treasure: 'Skatt', key: 'Nyckel', clue: 'Ledtråd', danger: 'Fara',
  table: 'Bord', chair: 'Stol', whiteboard: 'Whiteboard', door: 'Dörr',
};

// Types that support a text label in the toolbar
const LABEL_TYPES = new Set([
  'tree', 'bush', 'house', 'building', 'bridge', 'hill', 'bench', 'fence',
  'flag-start', 'trophy', 'x-mark', 'treasure', 'key', 'clue', 'danger',
  'table', 'chair', 'whiteboard', 'door',
  'player', 'checkpoint', 'label',
]);

// Types that have color support
const ALL_COLORED_TYPES = new Set<string>([
  ...CORE_OBJECT_TYPES, ...LANDMARK_OBJECT_TYPES, ...GAME_ASSET_TYPES, ...INDOOR_OBJECT_TYPES, ...HELPER_OBJECT_TYPES,
  'arrow', 'zone', 'arrow-chain',
]);

// Types that support scale
const SCALABLE_TYPES = new Set<string>([
  ...CORE_OBJECT_TYPES, ...LANDMARK_OBJECT_TYPES, ...GAME_ASSET_TYPES, ...INDOOR_OBJECT_TYPES, ...HELPER_OBJECT_TYPES,
  'label',
]);

// Checkpoint kind options
const CHECKPOINT_KINDS: { value: CheckpointKind; label: string; emoji: string }[] = [
  { value: 'checkpoint', label: 'CP', emoji: '📍' },
  { value: 'station', label: 'Stn', emoji: '🏁' },
  { value: 'start', label: 'Start', emoji: '🟢' },
  { value: 'finish', label: 'Mål', emoji: '🏆' },
];

// ---------------------------------------------------------------------------
// Quick color picker (inline)
// ---------------------------------------------------------------------------

function QuickColorPicker({ obj }: { obj: SpatialObjectBase }) {
  const t = useTranslations('admin.library.spatialEditor.canvasToolbar');
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const current = (obj.props.color as string) ?? '#3b82f6';
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="flex items-center gap-1">
      {QUICK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => updateObjectProps(obj.id, { color: c })}
          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
            current === c
              ? 'border-white ring-2 ring-blue-400 scale-110'
              : 'border-white/40'
          }`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
      <div className="relative ml-0.5">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="h-5 w-5 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 text-[10px] text-gray-400 hover:border-gray-500 flex items-center justify-center"
          title={t('customColor')}
        >
          +
        </button>
        {showCustom && (
          <input
            type="color"
            value={current}
            onChange={(e) => updateObjectProps(obj.id, { color: e.target.value })}
            onBlur={() => setShowCustom(false)}
            className="absolute bottom-full left-0 mb-1 h-7 w-12 cursor-pointer rounded border border-gray-300"
            autoFocus
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick label editor
// ---------------------------------------------------------------------------

function QuickLabelEditor({ obj }: { obj: SpatialObjectBase }) {
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);

  // Different objects store labels differently
  const propKey = obj.type === 'label' ? 'text' : obj.type === 'player' ? 'number' : 'label';
  const currentValue = (obj.props[propKey] as string | number) ?? '';
  const placeholder = obj.type === 'player' ? '#' : obj.type === 'label' ? 'Text...' : 'Label...';

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = obj.type === 'player' ? Number(e.target.value) || 0 : e.target.value;
      updateObjectProps(obj.id, { [propKey]: val });
    },
    [obj.id, obj.type, propKey, updateObjectProps],
  );

  return (
    <input
      type={obj.type === 'player' ? 'number' : 'text'}
      value={currentValue}
      onChange={handleChange}
      placeholder={placeholder}
      className="h-6 w-20 rounded border border-gray-300/60 bg-white/80 px-1.5 text-[11px] text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-gray-600/60 dark:bg-gray-700/80 dark:text-gray-200 dark:placeholder:text-gray-500"
    />
  );
}

// ---------------------------------------------------------------------------
// Main toolbar component
// ---------------------------------------------------------------------------

export function CanvasToolbar() {
  const t = useTranslations('admin.library.spatialEditor.canvasToolbar');
  const activeTool = useSpatialEditorStore((s) => s.activeTool);
  const setTool = useSpatialEditorStore((s) => s.setTool);
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const doc = useSpatialEditorStore((s) => s.doc);
  const deleteSelected = useSpatialEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useSpatialEditorStore((s) => s.duplicateSelected);
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);
  const updateObjectTransform = useSpatialEditorStore((s) => s.updateObjectTransform);

  // Find selected object (single selection only for property editing)
  const selectedObj = selectedIds.length === 1
    ? doc.layers.flatMap((l) => l.objects).find((o) => o.id === selectedIds[0]) ?? null
    : null;

  const showColor = selectedObj && ALL_COLORED_TYPES.has(selectedObj.type);
  const showLabel = selectedObj && LABEL_TYPES.has(selectedObj.type);
  const showScale = selectedObj && SCALABLE_TYPES.has(selectedObj.type);
  const typeName = selectedObj ? (TYPE_LABELS[selectedObj.type] ?? selectedObj.type) : null;

  // Object-specific checks
  const isArrow = selectedObj?.type === 'arrow';
  const isArrowChain = selectedObj?.type === 'arrow-chain';
  const isZone = selectedObj?.type === 'zone';
  const isCheckpoint = selectedObj?.type === 'checkpoint';
  const isLabel = selectedObj?.type === 'label';
  const isPlayer = selectedObj?.type === 'player';
  const isBall = selectedObj?.type === 'ball';
  const isPath = selectedObj?.type === 'path-segment';

  // Whether to show the extra inspector row
  const showExtraRow = selectedObj && (
    isArrow || isArrowChain || isZone || isCheckpoint || isLabel ||
    isPlayer || isBall || isPath || showScale
  );

  return (
    <div
      className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ---- Extra row: object-specific inspector controls ---- */}
      {showExtraRow && selectedObj && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur-md dark:bg-gray-800/90 dark:ring-white/10 max-w-[700px]">
          {/* Scale slider */}
          {showScale && (() => {
            const scale = selectedObj.t.scale ?? 1;
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-400">Storlek</span>
                <input
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.1}
                  value={scale}
                  onChange={(e) => updateObjectTransform(selectedObj.id, { scale: Number(e.target.value) })}
                  className="w-20 h-1 accent-blue-500"
                />
                <span className="text-[10px] font-mono text-gray-500 w-8">{(scale * 100).toFixed(0)}%</span>
                {scale !== 1 && (
                  <button
                    type="button"
                    onClick={() => updateObjectTransform(selectedObj.id, { scale: 1 })}
                    className="text-[9px] text-blue-500 hover:text-blue-700"
                  >
                    ↺
                  </button>
                )}
              </div>
            );
          })()}

          {/* Arrow / Arrow-chain: pattern + arrowhead toggle */}
          {(isArrow || isArrowChain) && (() => {
            const pattern = (selectedObj.props.pattern as string) ?? 'solid';
            const hasArrowhead = selectedObj.props.arrowhead !== false;
            return (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateObjectProps(selectedObj.id, { pattern: pattern === 'solid' ? 'dashed' : 'solid' })}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                    pattern === 'dashed'
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                  }`}
                  title={t('pattern')}
                >
                  {pattern === 'solid' ? '── Heldragen' : '╌╌ Streckad'}
                </button>
                <label className="flex items-center gap-1 text-[10px]">
                  <input
                    type="checkbox"
                    checked={hasArrowhead}
                    onChange={(e) => updateObjectProps(selectedObj.id, { arrowhead: e.target.checked })}
                    className="rounded border-gray-300 h-3 w-3"
                  />
                  <span className="text-gray-500 dark:text-gray-400">Pilspets</span>
                </label>
              </div>
            );
          })()}

          {/* Zone fill opacity */}
          {isZone && (() => {
            const fillOpacity = (selectedObj.props.fillOpacity as number) ?? 0.2;
            const polyPoints = selectedObj.props.points as { x: number; y: number }[] | undefined;
            const isPolygon = polyPoints && polyPoints.length >= 3;
            const variant = selectedObj.props.polygonVariant as string | undefined;
            return (
              <div className="flex items-center gap-1.5">
                {isPolygon && (
                  <span className="text-[10px] text-gray-400">
                    {variant === 'water' ? '💧 Vatten' : '⬡ Polygon'} ({polyPoints.length}p)
                  </span>
                )}
                <span className="text-[9px] text-gray-400">Fyllning</span>
                <input
                  type="range"
                  min={5}
                  max={80}
                  step={5}
                  value={Math.round(fillOpacity * 100)}
                  onChange={(e) => updateObjectProps(selectedObj.id, { fillOpacity: Number(e.target.value) / 100 })}
                  className="w-16 h-1 accent-blue-500"
                />
                <span className="text-[10px] font-mono text-gray-500 w-8">{(fillOpacity * 100).toFixed(0)}%</span>
              </div>
            );
          })()}

          {/* Path / Arrow-chain stroke width */}
          {(isPath || isArrowChain) && (() => {
            const sw = (selectedObj.props.strokeWidth as number) ?? 3;
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-400">Linje</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={sw}
                  onChange={(e) => updateObjectProps(selectedObj.id, { strokeWidth: Number(e.target.value) })}
                  className="w-14 h-1 accent-blue-500"
                />
                <span className="text-[10px] font-mono text-gray-500">{sw}</span>
              </div>
            );
          })()}

          {/* Checkpoint kind + order */}
          {isCheckpoint && (() => {
            const kind = (selectedObj.props.kind as CheckpointKind) ?? 'checkpoint';
            const order = (selectedObj.props.order as number) ?? 1;
            return (
              <div className="flex items-center gap-1.5">
                {CHECKPOINT_KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => updateObjectProps(selectedObj.id, { kind: k.value })}
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                      kind === k.value
                        ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                    }`}
                    title={k.label}
                  >
                    {k.emoji}
                  </button>
                ))}
                <label className="flex items-center gap-1 text-[10px]">
                  <span className="text-gray-400">#</span>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => updateObjectProps(selectedObj.id, { order: Number(e.target.value) })}
                    className="w-10 h-5 rounded border border-gray-300/60 bg-white/80 px-1 text-center text-[10px] font-mono dark:border-gray-600/60 dark:bg-gray-700/80 dark:text-gray-200"
                  />
                </label>
              </div>
            );
          })()}

          {/* Label font size + border color */}
          {isLabel && (() => {
            const fontSize = (selectedObj.props.fontSize as number) ?? 16;
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-400">Str.</span>
                <input
                  type="number"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(e) => updateObjectProps(selectedObj.id, { fontSize: Number(e.target.value) })}
                  className="w-10 h-5 rounded border border-gray-300/60 bg-white/80 px-1 text-center text-[10px] font-mono dark:border-gray-600/60 dark:bg-gray-700/80 dark:text-gray-200"
                />
                <span className="text-[9px] text-gray-400">Border:</span>
                <input
                  type="color"
                  value={(selectedObj.props.borderColor as string) ?? '#ffffff'}
                  onChange={(e) => updateObjectProps(selectedObj.id, { borderColor: e.target.value })}
                  className="h-5 w-6 cursor-pointer rounded border border-gray-300/60"
                />
              </div>
            );
          })()}

          {/* Player marker selector */}
          {isPlayer && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateObjectProps(selectedObj.id, { markerImage: undefined })}
                className={`flex h-6 w-6 items-center justify-center rounded border ${
                  !selectedObj.props.markerImage
                    ? 'border-blue-500 ring-1 ring-blue-200'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
                title={t('noMarker')}
              >
                <span className="text-[8px]">○</span>
              </button>
              {ALL_PLAYER_MARKERS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  onClick={() => updateObjectProps(selectedObj.id, { markerImage: m.src })}
                  className={`h-6 w-6 overflow-hidden rounded border ${
                    selectedObj.props.markerImage === m.src
                      ? 'border-blue-500 ring-1 ring-blue-200'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.label} className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Ball marker selector */}
          {isBall && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateObjectProps(selectedObj.id, { markerImage: undefined })}
                className={`flex h-6 w-6 items-center justify-center rounded border ${
                  !selectedObj.props.markerImage
                    ? 'border-blue-500 ring-1 ring-blue-200'
                    : 'border-gray-200 dark:border-gray-600'
                }`}
                title={t('noMarker')}
              >
                <span className="text-[8px]">○</span>
              </button>
              {ALL_BALL_MARKERS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  onClick={() => updateObjectProps(selectedObj.id, { markerImage: m.src })}
                  className={`h-6 w-6 overflow-hidden rounded border ${
                    selectedObj.props.markerImage === m.src
                      ? 'border-blue-500 ring-1 ring-blue-200'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.label} className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Main row: tool buttons + quick controls ---- */}
      <div className="flex items-center gap-1 rounded-xl bg-white/90 px-2 py-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur-md dark:bg-gray-800/90 dark:ring-white/10">
        {/* Tool buttons */}
        <div className="flex items-center gap-0.5">
          <ToolBtn
            active={activeTool === 'select'}
            onClick={() => setTool('select')}
            title={t('selectMoveTool')}
            label="🖱️"
          />
          <ToolBtn
            active={activeTool === 'hand'}
            onClick={() => setTool('hand')}
            title="Panorera (Mellanslag)"
            label="✋"
          />
          <ToolBtn
            active={activeTool === 'arrow'}
            onClick={() => setTool('arrow')}
            title="Rita pil"
            label="↗"
          />
        </div>

        {/* Divider */}
        {selectedObj && (
          <div className="mx-1 h-6 w-px bg-gray-300/60 dark:bg-gray-600/60" />
        )}

        {/* Object-specific controls */}
        {selectedObj && (
          <div className="flex items-center gap-2">
            {/* Type badge */}
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
              {typeName}
            </span>

            {/* Color picker */}
            {showColor && <QuickColorPicker obj={selectedObj} />}

            {/* Divider between color and label */}
            {showColor && showLabel && (
              <div className="h-5 w-px bg-gray-300/40 dark:bg-gray-600/40" />
            )}

            {/* Label editor */}
            {showLabel && <QuickLabelEditor obj={selectedObj} />}
          </div>
        )}

        {/* Selection actions */}
        {selectedIds.length > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-gray-300/60 dark:bg-gray-600/60" />
            <div className="flex items-center gap-0.5">
              <ActionBtn
                onClick={duplicateSelected}
                title="Duplicera (Ctrl+D)"
                label="📋"
              />
              <ActionBtn
                onClick={deleteSelected}
                title={t('deleteTool')}
                label="🗑️"
              />
            </div>
          </>
        )}

        {/* Multi-select info */}
        {selectedIds.length > 1 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
            {selectedIds.length} markerade
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button primitives
// ---------------------------------------------------------------------------

function ToolBtn({
  active,
  onClick,
  title,
  label,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center h-7 w-7 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:ring-blue-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function ActionBtn({
  onClick,
  title,
  label,
}: {
  onClick: () => void;
  title: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center justify-center h-7 w-7 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
    >
      {label}
    </button>
  );
}
