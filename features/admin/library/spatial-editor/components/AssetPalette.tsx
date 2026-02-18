'use client';

// =============================================================================
// AssetPalette – Tabbed asset placement + tools + two-click creation modes
// =============================================================================

import { useState } from 'react';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import type { PointObjectType, EditorTool } from '../lib/types';
import {
  CORE_OBJECT_TYPES,
  LANDMARK_OBJECT_TYPES,
  GAME_ASSET_TYPES,
  HELPER_OBJECT_TYPES,
  INDOOR_OBJECT_TYPES,
} from '../lib/types';

// ---------------------------------------------------------------------------
// Asset metadata (label + emoji per type)
// ---------------------------------------------------------------------------

const ASSET_META: Record<string, { label: string; icon: string; description: string }> = {
  // Core
  player:     { label: 'Spelare',    icon: '👤', description: 'Cirkel med nummer' },
  ball:       { label: 'Boll',       icon: '⚽', description: 'Liten cirkel' },
  cone:       { label: 'Kon',        icon: '🔶', description: 'Triangelmarkör' },
  label:      { label: 'Text',       icon: 'Aa', description: 'Textetikett' },
  checkpoint: { label: 'Station',    icon: '📍', description: 'Checkpoint / station' },
  // Landmarks
  tree:           { label: 'Träd',       icon: '🌳', description: 'Löv- eller barrträd' },
  bush:           { label: 'Buske',      icon: '🌿', description: 'Liten buske' },
  house:          { label: 'Hus',        icon: '🏠', description: 'Bostadshus' },
  building:       { label: 'Byggnad',    icon: '🏢', description: 'Större byggnad' },
  'path-segment': { label: 'Stig',       icon: '🛤', description: 'Väg-/stigsegment' },
  bridge:         { label: 'Bro',        icon: '🌉', description: 'Bro' },
  water:          { label: 'Vatten',     icon: '💧', description: 'Sjö eller å' },
  hill:           { label: 'Kulle',      icon: '⛰', description: 'Kulle / höjd' },
  bench:          { label: 'Bänk',       icon: '🪑', description: 'Parkbänk' },
  fence:          { label: 'Staket',     icon: '🚧', description: 'Staketsegment' },
  playground:     { label: 'Lekplats',   icon: '🛝', description: 'Rutschkana' },
  // Game objects
  'flag-start': { label: 'Startflagga', icon: '🚩', description: 'Startpunkt' },
  trophy:       { label: 'Mål',         icon: '�', description: 'Målgång (rutig flagga)' },
  'x-mark':     { label: 'X-markering', icon: '❌', description: 'X marks the spot' },
  treasure:     { label: 'Skatt',       icon: '🧳', description: 'Skattkista' },
  key:          { label: 'Nyckel',      icon: '🔑', description: 'Nyckel' },
  clue:         { label: 'Ledtråd',     icon: '📜', description: 'Ledtrådspapper' },
  danger:       { label: 'Fara',        icon: '⚠️', description: 'Varning / no-go' },
  // Helpers
  compass:      { label: 'Kompass',     icon: '🧭', description: 'Kompassros' },
  'num-badge':  { label: 'Nummer',      icon: '#',  description: 'Nummerbadge' },
  // Indoor
  table:      { label: 'Bord',        icon: '🪑', description: 'Bord' },
  chair:      { label: 'Stol',        icon: '💺', description: 'Stol' },
  whiteboard: { label: 'Whiteboard',  icon: '📋', description: 'Whiteboard' },
  door:       { label: 'Dörr',        icon: '🚪', description: 'Dörr' },
};

// ---------------------------------------------------------------------------
// Palette tabs
// ---------------------------------------------------------------------------

type PaletteTab = 'core' | 'outdoor' | 'game' | 'indoor';

const TAB_CONFIG: { id: PaletteTab; label: string; emoji: string; types: readonly string[] }[] = [
  { id: 'core',    label: 'Grund',   emoji: '⚽', types: CORE_OBJECT_TYPES },
  { id: 'outdoor', label: 'Utomhus', emoji: '🌳', types: [...LANDMARK_OBJECT_TYPES, ...HELPER_OBJECT_TYPES] },
  { id: 'game',    label: 'Skattjakt', emoji: '💰', types: GAME_ASSET_TYPES },
  { id: 'indoor',  label: 'Inomhus', emoji: '🏫', types: INDOOR_OBJECT_TYPES },
];

function ToolButton({
  tool,
  icon,
  label,
  activeTool,
  onClick,
}: {
  tool: EditorTool;
  icon: string;
  label: string;
  activeTool: EditorTool;
  onClick: () => void;
}) {
  const isActive = activeTool === tool;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
        isActive
          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function AssetPalette() {
  const activePlaceType = useSpatialEditorStore((s) => s.activePlaceType);
  const setActivePlaceType = useSpatialEditorStore((s) => s.setActivePlaceType);
  const activeTool = useSpatialEditorStore((s) => s.activeTool);
  const setTool = useSpatialEditorStore((s) => s.setTool);
  const pendingStart = useSpatialEditorStore((s) => s.pendingStart);
  const snapEnabled = useSpatialEditorStore((s) => s.snapEnabled);
  const toggleSnap = useSpatialEditorStore((s) => s.toggleSnap);
  const constrainToContentBox = useSpatialEditorStore((s) => s.constrainToContentBox);
  const toggleConstrainToContentBox = useSpatialEditorStore((s) => s.toggleConstrainToContentBox);
  const showTrail = useSpatialEditorStore((s) => s.showTrail);
  const toggleShowTrail = useSpatialEditorStore((s) => s.toggleShowTrail);
  const backgroundLocked = useSpatialEditorStore((s) => s.backgroundLocked);
  const toggleBackgroundLocked = useSpatialEditorStore((s) => s.toggleBackgroundLocked);

  const [activeTab, setActiveTab] = useState<PaletteTab>('core');
  const currentTypes = TAB_CONFIG.find((t) => t.id === activeTab)?.types ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Select tool */}
      <ToolButton tool="select" icon="🖱" label="Välj / Flytta" activeTool={activeTool} onClick={() => setTool('select')} />

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            title={tab.label}
          >
            <span className="block text-sm leading-none">{tab.emoji}</span>
            <span className="block mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Asset grid for active tab */}
      <div className="grid grid-cols-2 gap-1.5">
        {currentTypes.map((type) => {
          const meta = ASSET_META[type] ?? { label: type, icon: '?', description: type };
          const isActive = activePlaceType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActivePlaceType(isActive ? null : (type as PointObjectType))}
              title={meta.description}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              <span className="text-base leading-none">{meta.icon}</span>
              <span className="truncate w-full text-center">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Two-click creation modes */}
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Rita
      </p>
      <ToolButton tool="arrow" icon="→" label="Pil" activeTool={activeTool} onClick={() => setTool('arrow')} />
      <ToolButton tool="zone" icon="▭" label="Zon (rektangel)" activeTool={activeTool} onClick={() => setTool('zone')} />
      <ToolButton tool="polygon" icon="⬡" label="Zon (polygon)" activeTool={activeTool} onClick={() => {
        const store = useSpatialEditorStore.getState();
        store.startPolygon('zone');
      }} />
      <ToolButton tool="polygon" icon="💧" label="Vatten (polygon)" activeTool={activeTool} onClick={() => {
        const store = useSpatialEditorStore.getState();
        store.startPolygon('water');
      }} />
      <ToolButton tool="path" icon="🛤" label="Stig (kedja)" activeTool={activeTool} onClick={() => {
        const store = useSpatialEditorStore.getState();
        store.startPath();
      }} />

      {/* Pending indicator */}
      {pendingStart && (activeTool === 'arrow' || activeTool === 'zone') && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
          Klicka på canvasen för att {activeTool === 'arrow' ? 'avsluta pilen' : 'sätta andra hörnet'}
        </p>
      )}
      {activeTool === 'polygon' && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
          Klicka för att sätta hörn. Klicka nära startpunkten för att stänga polygonen. Enter = klar, Esc = avbryt.
        </p>
      )}
      {activeTool === 'path' && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
          Klicka för att sätta stigpunkter. Enter = klar, Esc = avbryt.
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Snap toggle */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={snapEnabled}
          onChange={toggleSnap}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Snap till rutnät</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">(Alt = av)</span>
      </label>

      {/* Constrain to contentBox */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={constrainToContentBox}
          onChange={toggleConstrainToContentBox}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Håll innanför yta</span>
      </label>

      {/* Show trail */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={showTrail}
          onChange={toggleShowTrail}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Visa rutt</span>
      </label>

      {/* Lock background */}
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={backgroundLocked}
          onChange={toggleBackgroundLocked}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600 dark:text-gray-300 font-medium">Lås bakgrund</span>
      </label>

      {/* Keyboard shortcuts hint */}
      <div className="text-[10px] text-gray-400 dark:text-gray-500 space-y-0.5">
        <p>← → ↑ ↓ = Flytta (Shift = 5×)</p>
        <p>Ctrl+D = Duplicera</p>
        <p>Del = Ta bort</p>
        <p>Esc = Avbryt</p>
      </div>
    </div>
  );
}
