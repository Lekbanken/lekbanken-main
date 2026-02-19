'use client';

// =============================================================================
// SavePopover – File operations: Save, Load, Export, Library
// =============================================================================

import { useCallback, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { copyDocumentJson } from '../lib/storage';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../lib/types';
import type { SpatialDocumentV1 } from '../lib/types';
import { saveSpatialArtifact, uploadArtifactPreview } from '../lib/artifact-actions';
import type { ArtifactVisibility } from '../lib/artifact-actions';
import { generatePreviewBase64 } from '../lib/preview';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// PNG export helper
// ---------------------------------------------------------------------------

function exportPng(svgEl: SVGSVGElement) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(WORLD_WIDTH * 2));
  clone.setAttribute('height', String(WORLD_HEIGHT * 2));
  clone.setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);
  clone.querySelectorAll('[data-selection-ring]').forEach((el) => el.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_WIDTH * 2;
    canvas.height = WORLD_HEIGHT * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = 'spatial-editor.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = url;
}

// ---------------------------------------------------------------------------
// Bundle export helper
// ---------------------------------------------------------------------------

function exportBundle(svgEl: SVGSVGElement, doc: SpatialDocumentV1) {
  const exportManifest = useSpatialEditorStore.getState().exportCheckpointManifest();
  const checkpoints = doc.layers
    .flatMap((l) => l.objects)
    .filter((o) => o.type === 'checkpoint')
    .sort((a, b) =>
      (((a.props.order as number) ?? 999) - ((b.props.order as number) ?? 999))
      || a.id.localeCompare(b.id),
    );

  const csvHeaders = 'order,label,kind,nx,ny,notes';
  const csvRows = checkpoints.map((obj) => {
    const order = (obj.props.order as number) ?? 0;
    const label = ((obj.props.label as string) ?? '').replace(/,/g, ';');
    const kind = (obj.props.kind as string) ?? 'checkpoint';
    const notes = ((obj.props.notes as string) ?? '').replace(/,/g, ';').replace(/\n/g, ' ');
    return `${order},${label},${kind},${obj.t.x.toFixed(4)},${obj.t.y.toFixed(4)},${notes}`;
  });
  const csv = [csvHeaders, ...csvRows].join('\n');

  const downloadBlob = (blob: Blob, filename: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  downloadBlob(new Blob([exportManifest], { type: 'application/json' }), 'manifest.json');
  setTimeout(() => {
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'manifest.csv');
  }, 100);

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(WORLD_WIDTH * 2));
  clone.setAttribute('height', String(WORLD_HEIGHT * 2));
  clone.setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);
  clone.querySelectorAll('[data-selection-ring]').forEach((el) => el.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD_WIDTH * 2;
    canvas.height = WORLD_HEIGHT * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      setTimeout(() => downloadBlob(pngBlob, 'map.png'), 200);
    }, 'image/png');
  };
  img.src = svgUrl;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SavePopover({ svgRef }: { svgRef: React.RefObject<SVGSVGElement | null> }) {
  const doc = useSpatialEditorStore((s) => s.doc);
  const dirty = useSpatialEditorStore((s) => s.dirty);
  const save = useSpatialEditorStore((s) => s.save);
  const load = useSpatialEditorStore((s) => s.load);
  const reset = useSpatialEditorStore((s) => s.reset);
  const artifactId = useSpatialEditorStore((s) => s.artifactId);
  const artifactTitle = useSpatialEditorStore((s) => s.artifactTitle);
  const setArtifactMeta = useSpatialEditorStore((s) => s.setArtifactMeta);

  const t = useTranslations('admin.library.spatialEditor.save');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveVisibility, setSaveVisibility] = useState<ArtifactVisibility>('private');
  const [saving, setSaving] = useState(false);

  const activeTenantId: string | null = null;

  const handleOpenSaveModal = useCallback(() => {
    setSaveTitle(artifactTitle || 'Untitled');
    setSaveVisibility(activeTenantId ? 'tenant' : 'private');
    setShowSaveModal(true);
  }, [artifactTitle, activeTenantId]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!saveTitle.trim()) return;
    setSaving(true);
    const tenantId = saveVisibility === 'tenant' ? activeTenantId : null;

    const result = await saveSpatialArtifact({
      id: artifactId ?? undefined,
      tenantId,
      title: saveTitle.trim(),
      visibility: saveVisibility,
      document: doc,
    });

    if ('error' in result) {
      setSaving(false);
      alert(`Kunde inte spara: ${result.error}`);
      return;
    }

    const savedId = result.id;
    if (svgRef.current) {
      generatePreviewBase64(svgRef.current).then((base64) => {
        if (base64) {
          uploadArtifactPreview(savedId, base64).catch((err) =>
            console.warn('[spatial-editor] preview upload failed:', err),
          );
        }
      });
    }

    setSaving(false);
    setArtifactMeta(result.id, saveTitle.trim());
    setShowSaveModal(false);

    const url = new URL(window.location.href);
    url.searchParams.set('artifact', result.id);
    window.history.replaceState({}, '', url.toString());
  }, [saveTitle, saveVisibility, activeTenantId, artifactId, doc, setArtifactMeta, svgRef]);

  return (
    <>
      <Popover className="relative">
        <PopoverButton className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 bg-white/90 shadow-sm ring-1 ring-black/10 hover:bg-gray-50 focus:outline-none dark:bg-gray-800/90 dark:text-gray-200 dark:ring-white/10 dark:hover:bg-gray-700">
          💾 {t('saveLocal')}{dirty ? ' •' : ''}
        </PopoverButton>
        <PopoverPanel
          className="absolute left-0 top-full mt-2 z-50 w-56 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/10 dark:bg-gray-800 dark:ring-white/10"
        >
          {({ close }) => (
            <div className="flex flex-col gap-0.5">
              <MenuItem icon="💾" label="Spara lokalt" hint={dirty ? '(osparad)' : ''} onClick={() => { save(); close(); }} />
              <MenuItem icon="📂" label="Ladda lokalt" onClick={() => { load(); close(); }} />
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <MenuItem icon="📋" label="Kopiera JSON" onClick={() => { copyDocumentJson(doc); close(); }} />
              <MenuItem icon="🖼" label="Exportera PNG" onClick={() => { if (svgRef.current) exportPng(svgRef.current); close(); }} />
              <MenuItem icon="📦" label="Exportera paket" hint="PNG + JSON + CSV" onClick={() => { if (svgRef.current) exportBundle(svgRef.current, doc); close(); }} />
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <MenuItem
                icon="📚"
                label={artifactId ? 'Uppdatera i bibliotek' : 'Spara till bibliotek'}
                accent
                onClick={() => { handleOpenSaveModal(); close(); }}
              />
              <Link
                href="/admin/library/spatial-editor"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                <span>📂</span>
                <span>{t('openLibrary')}</span>
              </Link>
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <MenuItem icon="🗑" label="Rensa allt" danger onClick={() => { reset(); close(); }} />
            </div>
          )}
        </PopoverPanel>
      </Popover>

      {/* Save to Library modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
          <div className="rounded-xl bg-white p-6 shadow-xl w-80 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {artifactId ? 'Uppdatera artefakt' : 'Spara till bibliotek'}
            </h3>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Titel</label>
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Namnge din karta…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveToLibrary();
                if (e.key === 'Escape') setShowSaveModal(false);
              }}
            />
            <label className="block text-xs text-gray-500 dark:text-gray-400 mt-3 mb-1">Synlighet</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setSaveVisibility('private')}
                className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  saveVisibility === 'private'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                🔒 Privat
              </button>
              {activeTenantId && (
                <button
                  type="button"
                  onClick={() => setSaveVisibility('tenant')}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    saveVisibility === 'tenant'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  👥 Organisation
                </button>
              )}
            </div>
            {artifactId && (
              <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                Uppdaterar befintlig artefakt ({artifactId.slice(0, 8)}…)
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={saving || !saveTitle.trim()}
                className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Sparar…' : '💾 Spara'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MenuItem primitive
// ---------------------------------------------------------------------------

function MenuItem({
  icon,
  label,
  hint,
  accent,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  hint?: string;
  accent?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
          : accent
            ? 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950'
            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      <span>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {hint && <span className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>}
    </button>
  );
}
