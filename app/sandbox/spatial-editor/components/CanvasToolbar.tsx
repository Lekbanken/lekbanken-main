'use client';

// =============================================================================
// CanvasToolbar – Floating toolbar at the bottom of the canvas
// =============================================================================
// Shows:
// 1. Tool buttons (Select / Hand) — always visible
// 2. Object-specific quick controls (Color, Label) — when object is selected
// 3. Delete button — when object is selected
// =============================================================================

import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { CORE_OBJECT_TYPES, LANDMARK_OBJECT_TYPES, GAME_ASSET_TYPES, INDOOR_OBJECT_TYPES, HELPER_OBJECT_TYPES } from '../lib/types';
import type { SpatialObjectBase } from '../lib/types';
import { useCallback, useState } from 'react';

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
  // Surroundings with label support
  'tree', 'bush', 'house', 'building', 'bridge', 'hill', 'bench', 'fence',
  // Game objects with label
  'flag-start', 'trophy', 'x-mark', 'treasure', 'key', 'clue', 'danger',
  // Indoor
  'table', 'chair', 'whiteboard', 'door',
  // Core
  'player', 'checkpoint',
  // Label object uses "text" prop instead
  'label',
]);

// Types that have color support
const ALL_COLORED_TYPES = new Set<string>([
  ...CORE_OBJECT_TYPES, ...LANDMARK_OBJECT_TYPES, ...GAME_ASSET_TYPES, ...INDOOR_OBJECT_TYPES, ...HELPER_OBJECT_TYPES,
]);

// ---------------------------------------------------------------------------
// Quick color picker (inline)
// ---------------------------------------------------------------------------

function QuickColorPicker({ obj }: { obj: SpatialObjectBase }) {
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
          title="Anpassad färg"
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
  const activeTool = useSpatialEditorStore((s) => s.activeTool);
  const setTool = useSpatialEditorStore((s) => s.setTool);
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const doc = useSpatialEditorStore((s) => s.doc);
  const deleteSelected = useSpatialEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useSpatialEditorStore((s) => s.duplicateSelected);
  const updateObjectProps = useSpatialEditorStore((s) => s.updateObjectProps);

  // Find selected object (single selection only for property editing)
  const selectedObj = selectedIds.length === 1
    ? doc.layers.flatMap((l) => l.objects).find((o) => o.id === selectedIds[0]) ?? null
    : null;

  const showColor = selectedObj && ALL_COLORED_TYPES.has(selectedObj.type);
  const showLabel = selectedObj && LABEL_TYPES.has(selectedObj.type);
  const typeName = selectedObj ? (TYPE_LABELS[selectedObj.type] ?? selectedObj.type) : null;

  return (
    <div
      className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1 rounded-xl bg-white/90 px-2 py-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur-md dark:bg-gray-800/90 dark:ring-white/10"
      // Prevent pointer events from reaching the canvas when clicking toolbar
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ---- Tool buttons ---- */}
      <div className="flex items-center gap-0.5">
        <ToolBtn
          active={activeTool === 'select'}
          onClick={() => setTool('select')}
          title="Välj / Flytta (V)"
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

      {/* ---- Divider ---- */}
      {selectedObj && (
        <div className="mx-1 h-6 w-px bg-gray-300/60 dark:bg-gray-600/60" />
      )}

      {/* ---- Object-specific controls ---- */}
      {selectedObj && (
        <div className="flex items-center gap-2">
          {/* Type badge */}
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
            {typeName}
          </span>

          {/* Color picker */}
          {showColor && <QuickColorPicker obj={selectedObj} />}

          {/* Border color for label */}
          {selectedObj.type === 'label' && (
            <>
              <div className="h-5 w-px bg-gray-300/40 dark:bg-gray-600/40" />
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-gray-400">Border:</span>
                <input
                  type="color"
                  value={(selectedObj.props.borderColor as string) ?? '#ffffff'}
                  onChange={(e) => updateObjectProps(selectedObj.id, { borderColor: e.target.value })}
                  className="h-5 w-6 cursor-pointer rounded border border-gray-300/60"
                />
              </div>
            </>
          )}

          {/* Divider between color and label */}
          {showColor && showLabel && (
            <div className="h-5 w-px bg-gray-300/40 dark:bg-gray-600/40" />
          )}

          {/* Label editor */}
          {showLabel && <QuickLabelEditor obj={selectedObj} />}
        </div>
      )}

      {/* ---- Selection actions ---- */}
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
              title="Ta bort (Del)"
              label="🗑️"
            />
          </div>
        </>
      )}
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
