'use client';

// =============================================================================
// ObjectsPopover – Hierarchical object picker with sticky mode toggle
// =============================================================================
// Categories: Sport, Utomhus, Skattjakt, Inomhus, Special (draw tools)
// =============================================================================

import { useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useTranslations } from 'next-intl';
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
// Asset metadata (label + emoji per type) – from AssetPalette
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
  trophy:       { label: 'Mål',         icon: '🏆', description: 'Målgång' },
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
// Category config – renamed "Grund" → "Sport"
// ---------------------------------------------------------------------------

type ObjCategory = 'sport' | 'outdoor' | 'game' | 'indoor' | 'special';

const CATEGORIES: { id: ObjCategory; label: string; emoji: string }[] = [
  { id: 'sport',   label: 'Sport',     emoji: '⚽' },
  { id: 'outdoor', label: 'Utomhus',   emoji: '🌳' },
  { id: 'game',    label: 'Skattjakt', emoji: '💰' },
  { id: 'indoor',  label: 'Inomhus',   emoji: '🏫' },
  { id: 'special', label: 'Special',   emoji: '✨' },
];

const CATEGORY_TYPES: Record<ObjCategory, readonly string[]> = {
  sport: CORE_OBJECT_TYPES,
  outdoor: [...LANDMARK_OBJECT_TYPES, ...HELPER_OBJECT_TYPES],
  game: GAME_ASSET_TYPES,
  indoor: INDOOR_OBJECT_TYPES,
  special: [], // special handled separately
};

// ---------------------------------------------------------------------------
// Draw tools config for "Special" category
// ---------------------------------------------------------------------------

interface DrawToolDef {
  id: string;
  tool: EditorTool;
  icon: string;
  label: string;
  description: string;
  action: () => void;
}

function getDrawTools(): DrawToolDef[] {
  const store = useSpatialEditorStore.getState();
  return [
    { id: 'arrow', tool: 'arrow', icon: '→', label: 'Pil', description: '2-klick pil', action: () => store.setTool('arrow') },
    { id: 'zone-rect', tool: 'zone', icon: '▭', label: 'Zon (rektangel)', description: '2-klick zon', action: () => store.setTool('zone') },
    { id: 'zone-polygon', tool: 'polygon', icon: '⬡', label: 'Zon (polygon)', description: 'Multi-klick polygon', action: () => store.startPolygon('zone') },
    { id: 'water-polygon', tool: 'polygon', icon: '💧', label: 'Vatten (polygon)', description: 'Multi-klick vatten', action: () => store.startPolygon('water') },
    { id: 'path', tool: 'path', icon: '🛤', label: 'Stig (kedja)', description: 'Multi-klick stig', action: () => store.startPath() },
    { id: 'arrow-chain', tool: 'arrow-chain', icon: '↗🔗', label: 'Pil (kedja)', description: 'Multi-klick pil med pilspets', action: () => store.startArrowChain() },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ObjectsPopover() {
  const activePlaceType = useSpatialEditorStore((s) => s.activePlaceType);
  const activeTool = useSpatialEditorStore((s) => s.activeTool);
  const setActivePlaceType = useSpatialEditorStore((s) => s.setActivePlaceType);
  const placePolicy = useSpatialEditorStore((s) => s.placePolicy);
  const setPlacePolicy = useSpatialEditorStore((s) => s.setPlacePolicy);

  const t = useTranslations('admin.library.spatialEditor.objects');
  const [activeCategory, setActiveCategory] = useState<ObjCategory>('sport');

  const currentTypes = CATEGORY_TYPES[activeCategory];
  const isSpecial = activeCategory === 'special';

  return (
    <Popover className="relative">
      <PopoverButton className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 bg-white/90 shadow-sm ring-1 ring-black/10 hover:bg-gray-50 focus:outline-none dark:bg-gray-800/90 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-gray-700">
        🧩 Objekt
      </PopoverButton>
      <PopoverPanel
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/10 dark:bg-gray-800 dark:ring-white/10 max-h-[70vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-3">
          {/* Category tabs */}
          <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-1 rounded-md px-1 py-1.5 text-[10px] font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span className="block text-sm leading-none">{cat.emoji}</span>
                <span className="block mt-0.5">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Point object grid */}
          {!isSpecial && (
            <div className="grid grid-cols-3 gap-1.5">
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
          )}

          {/* Special / Draw tools */}
          {isSpecial && (
            <div className="flex flex-col gap-1.5">
              {getDrawTools().map((dt) => {
                const isActive = activeTool === dt.tool;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={dt.action}
                    title={dt.description}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-base">{dt.icon}</span>
                    <span>{dt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sticky mode toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex items-center justify-between">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{t('placementMode')}</span>
            <button
              type="button"
              onClick={() => setPlacePolicy(placePolicy === 'sticky' ? 'one-shot' : 'sticky')}
              className="text-[11px] text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {placePolicy === 'sticky' ? `📌 ${t('stickyMode')}` : `☝️ ${t('oneShotMode')}`}
            </button>
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
}
