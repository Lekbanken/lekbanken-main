'use client';

// =============================================================================
// BackgroundPopover – Hierarchical background picker (Sport → items, Maps → items)
// =============================================================================

import { type ChangeEvent, useCallback, useRef } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { SPORT_FIELD_VARIANTS, MAP_BG_VARIANTS } from './SportFieldBackgrounds';
import Link from 'next/link';

/** Max data-URL size we allow (5 MB) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function BackgroundPopover() {
  const background = useSpatialEditorStore((s) => s.doc.background);
  const setBackground = useSpatialEditorStore((s) => s.setBackground);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_BYTES) {
        alert(`Bilden är för stor (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setBackground({
            type: 'image',
            src: dataUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            opacity: 1,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [setBackground],
  );

  const bgLabel =
    background.type === 'grid'
      ? 'Rutnät'
      : background.type === 'image'
        ? 'Bild'
        : (SPORT_FIELD_VARIANTS.find((v) => v.id === background.variant)?.label ??
           MAP_BG_VARIANTS.find((v) => v.id === background.variant)?.label ??
           background.variant ??
           'Sport');

  return (
    <Popover className="relative">
      <PopoverButton className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 bg-white/90 shadow-sm ring-1 ring-black/10 hover:bg-gray-50 focus:outline-none dark:bg-gray-800/90 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-gray-700">
        🖼 Bakgrund
      </PopoverButton>
      <PopoverPanel
        className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/10 dark:bg-gray-800 dark:ring-white/10 max-h-[70vh] overflow-y-auto"
      >
        {({ close }) => (
          <div className="flex flex-col gap-3">
            {/* Current indicator */}
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Aktiv: <span className="font-medium text-gray-600 dark:text-gray-300">{bgLabel}</span>
            </p>

            {/* Grid (none) */}
            <button
              type="button"
              onClick={() => { setBackground({ type: 'grid' }); close(); }}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                background.type === 'grid'
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-950 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              ⬜ Tom (rutnät)
            </button>

            {/* Sport fields */}
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                Sportplaner
              </h4>
              <div className="flex flex-wrap gap-1">
                {SPORT_FIELD_VARIANTS.filter((v) => v.id !== 'none').map((v) => {
                  const isActive = background.type === 'sport-field' && background.variant === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setBackground({ type: 'sport-field', variant: v.id, opacity: background.opacity ?? 1 }); close(); }}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600'
                      }`}
                    >
                      {v.emoji} {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map backgrounds */}
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                Kartbakgrunder
              </h4>
              <div className="flex flex-wrap gap-1">
                {MAP_BG_VARIANTS.map((v) => {
                  const isActive = background.type === 'sport-field' && background.variant === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => { setBackground({ type: 'sport-field', variant: v.id, opacity: background.opacity ?? 1 }); close(); }}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600'
                      }`}
                    >
                      {v.emoji} {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opacity slider */}
            {(background.type === 'sport-field' || background.type === 'image') && (
              <div className="flex flex-col gap-1">
                <label className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Opacitet</span>
                  <span className="font-mono text-gray-700 dark:text-gray-200">
                    {Math.round((background.opacity ?? 1) * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((background.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    setBackground({ ...background, opacity: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-blue-500"
                />
              </div>
            )}

            {/* Image upload */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex flex-col gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  background.type === 'image'
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                📷 Ladda upp bild
              </button>
              <Link
                href="/sandbox/spatial-capture"
                target="_blank"
                className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors block"
                onClick={() => close()}
              >
                🗺️ Fånga karta (Spatial Capture)
              </Link>
              {background.type === 'image' && background.src && (
                <div className="flex items-center gap-2 px-3 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="truncate flex-1">{background.imageWidth}×{background.imageHeight} px</span>
                  <button
                    type="button"
                    onClick={() => setBackground({ type: 'grid' })}
                    className="text-red-500 hover:text-red-700 dark:text-red-400"
                  >
                    ✕ Ta bort
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverPanel>
    </Popover>
  );
}
