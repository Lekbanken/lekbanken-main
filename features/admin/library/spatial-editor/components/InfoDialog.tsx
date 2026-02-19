'use client';

// =============================================================================
// InfoDialog – Toggles, keyboard shortcuts, station list
// =============================================================================

import { useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { StationListPanel } from './StationListPanel';
import { WORLD_WIDTH } from '../lib/types';

export function InfoDialog() {
  const snapEnabled = useSpatialEditorStore((s) => s.snapEnabled);
  const toggleSnap = useSpatialEditorStore((s) => s.toggleSnap);
  const constrainToContentBox = useSpatialEditorStore((s) => s.constrainToContentBox);
  const toggleConstrainToContentBox = useSpatialEditorStore((s) => s.toggleConstrainToContentBox);
  const showTrail = useSpatialEditorStore((s) => s.showTrail);
  const toggleShowTrail = useSpatialEditorStore((s) => s.toggleShowTrail);
  const backgroundLocked = useSpatialEditorStore((s) => s.backgroundLocked);
  const toggleBackgroundLocked = useSpatialEditorStore((s) => s.toggleBackgroundLocked);
  const viewBox = useSpatialEditorStore((s) => s.viewBox);
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const doc = useSpatialEditorStore((s) => s.doc);
  const resetView = useSpatialEditorStore((s) => s.resetView);
  const artifactId = useSpatialEditorStore((s) => s.artifactId);
  const artifactTitle = useSpatialEditorStore((s) => s.artifactTitle);

  const objectCount = doc.layers.reduce((sum, l) => sum + l.objects.length, 0);
  const zoomPercent = Math.round((WORLD_WIDTH / viewBox.w) * 100);

  const [showShortcuts, setShowShortcuts] = useState(false);
  const t = useTranslations('admin.library.spatialEditor.info');

  return (
    <Popover className="relative">
      <PopoverButton className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 bg-white/90 shadow-sm ring-1 ring-black/10 hover:bg-gray-50 focus:outline-none dark:bg-gray-800/90 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-gray-700">
        ℹ️ Info
      </PopoverButton>
      <PopoverPanel
        className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/10 dark:bg-gray-800 dark:ring-white/10 max-h-[70vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-3">
          {/* Status info */}
          <div className="flex items-center gap-3 text-[11px] text-gray-600 dark:text-gray-300 font-mono">
            {artifactId && (
              <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium truncate max-w-32" title="Artifact">
                📚 {artifactTitle}
              </span>
            )}
            <span title="Zoom">{zoomPercent}%</span>
            <span title="Objekt">{objectCount} obj</span>
            <span title="Markerade">{selectedIds.length > 0 ? `${selectedIds.length} sel` : '–'}</span>
            <button
              type="button"
              onClick={resetView}
              className="ml-auto underline text-blue-500 hover:text-blue-700 dark:text-blue-400 text-[10px] font-sans"
            >
              {t('resetView')}
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Toggles */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('settings')}
            </h4>
            <Toggle label={t('snapToGrid')} hint={t('snapHint')} checked={snapEnabled} onChange={toggleSnap} />
            <Toggle label={t('constrainToArea')} checked={constrainToContentBox} onChange={toggleConstrainToContentBox} />
            <Toggle label={t('showTrail')} checked={showTrail} onChange={toggleShowTrail} />
            <Toggle label={t('lockBackground')} checked={backgroundLocked} onChange={toggleBackgroundLocked} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Keyboard shortcuts */}
          <div>
            <button
              type="button"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
            >
              ⌨️ {t('keyboardShortcuts')} {showShortcuts ? '▴' : '▾'}
            </button>
            {showShortcuts && (
              <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 space-y-0.5">
                <KBD shortcut="← → ↑ ↓" desc="Flytta (Shift = 5×)" />
                <KBD shortcut="Ctrl+D" desc="Duplicera" />
                <KBD shortcut="Del" desc="Ta bort" />
                <KBD shortcut="Esc" desc="Avbryt / avmarkera" />
                <KBD shortcut="Enter" desc="Slutför stig/polygon" />
                <KBD shortcut="Mellanslag" desc="Panorera (håll)" />
                <KBD shortcut="Scroll" desc="Zooma" />
                <KBD shortcut="Alt" desc="Tillfälligt av snap" />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Station list */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              {t('stations')}
            </h4>
            <StationListPanel />
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Toggle widget
// ---------------------------------------------------------------------------

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-gray-300"
      />
      <span className="text-gray-600 dark:text-gray-300 font-medium">{label}</span>
      {hint && <span className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Keyboard shortcut row
// ---------------------------------------------------------------------------

function KBD({ shortcut, desc }: { shortcut: string; desc: string }) {
  return (
    <p className="flex items-center gap-2">
      <code className="inline-block min-w-16 rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 text-[10px] font-mono text-gray-700 dark:text-gray-300">
        {shortcut}
      </code>
      <span>{desc}</span>
    </p>
  );
}
