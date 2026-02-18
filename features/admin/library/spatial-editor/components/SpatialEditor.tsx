'use client';

// =============================================================================
// SpatialEditor – Main layout: Canvas + Sidebar (palette + inspector + toolbar)
// =============================================================================

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { SpatialCanvas } from './SpatialCanvas';
import { AssetPalette } from './AssetPalette';
import { InspectorPanel } from './InspectorPanel';
import { CanvasToolbar } from './CanvasToolbar';
import { StationListPanel } from './StationListPanel';
import { copyDocumentJson } from '../lib/storage';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../lib/types';
import type { SpatialDocumentV1 } from '../lib/types';
import { SPORT_FIELD_VARIANTS, MAP_BG_VARIANTS } from './SportFieldBackgrounds';
import { saveSpatialArtifact, loadSpatialArtifact, uploadArtifactPreview } from '../lib/artifact-actions';
import type { ArtifactVisibility } from '../lib/artifact-actions';
import { generatePreviewBase64 } from '../lib/preview';
import Link from 'next/link';

/** Max data-URL size we allow (5 MB) – keeps JSON/localStorage safe */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function SpatialEditor({ initialArtifactId }: { initialArtifactId?: string } = {}) {
  const t = useTranslations('admin.library.spatialEditor');
  const svgRef = useRef<SVGSVGElement>(null);
  const doc = useSpatialEditorStore((s) => s.doc);
  const dirty = useSpatialEditorStore((s) => s.dirty);
  const viewBox = useSpatialEditorStore((s) => s.viewBox);
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const placePolicy = useSpatialEditorStore((s) => s.placePolicy);
  const background = useSpatialEditorStore((s) => s.doc.background);
  const artifactId = useSpatialEditorStore((s) => s.artifactId);
  const artifactTitle = useSpatialEditorStore((s) => s.artifactTitle);
  const save = useSpatialEditorStore((s) => s.save);
  const load = useSpatialEditorStore((s) => s.load);
  const reset = useSpatialEditorStore((s) => s.reset);
  const resetView = useSpatialEditorStore((s) => s.resetView);
  const setPlacePolicy = useSpatialEditorStore((s) => s.setPlacePolicy);
  const setBackground = useSpatialEditorStore((s) => s.setBackground);
  const loadArtifactDocument = useSpatialEditorStore((s) => s.loadArtifactDocument);
  const setArtifactMeta = useSpatialEditorStore((s) => s.setArtifactMeta);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveVisibility, setSaveVisibility] = useState<ArtifactVisibility>('private');
  const [saving, setSaving] = useState(false);

  const searchParams = useSearchParams();

  // Resolve tenant from auth context (admin route) or fallback to null
  const activeTenantId: string | null = null;

  // Load artifact from prop (admin route) or ?artifact=<id> query param on mount
  useEffect(() => {
    const targetId = initialArtifactId ?? searchParams.get('artifact');
    if (!targetId) return;
    loadSpatialArtifact(targetId).then((row) => {
      if (row) {
        loadArtifactDocument(row.document as SpatialDocumentV1, row.id, row.title);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Import map snapshot from Spatial Capture tool via sessionStorage
  useEffect(() => {
    const mapParam = searchParams.get('mapSnapshot');
    if (!mapParam) return;
    try {
      const raw = sessionStorage.getItem('spatial-capture-snapshot');
      if (!raw) return;
      const snapshot = JSON.parse(raw) as {
        dataUrl: string;
        exportSize: { w: number; h: number };
        centerLatLng?: { lat: number; lon: number };
        zoom?: number;
        provider?: string;
        capturedAt?: string;
      };
      // Apply as image background
      setBackground({
        type: 'image',
        src: snapshot.dataUrl,
        imageWidth: snapshot.exportSize.w,
        imageHeight: snapshot.exportSize.h,
        opacity: 0.6,
      });
      // Clean up so it doesn't re-apply on next visit
      sessionStorage.removeItem('spatial-capture-snapshot');
    } catch (err) {
      console.warn('[spatial-editor] failed to import map snapshot:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  const objectCount = doc.layers.reduce((sum, l) => sum + l.objects.length, 0);
  const zoomPercent = Math.round((WORLD_WIDTH / viewBox.w) * 100);

  // Image upload handler – reads file as data URL + detects dimensions
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
        // Detect native dimensions
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

      // Reset input so user can re-upload the same file
      e.target.value = '';
    },
    [setBackground],
  );

  // PNG export via SVG ref → clone → strip selection UI → canvas → blob
  const handleExportPng = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    // Clone SVG and set explicit dimensions for rasterization
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(WORLD_WIDTH * 2));
    clone.setAttribute('height', String(WORLD_HEIGHT * 2));
    clone.setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);

    // Strip selection rings and UI overlays from export
    clone.querySelectorAll('[data-selection-ring]').forEach((el) => el.remove());

    // Add XML namespace for standalone SVG
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
  }, []);

  // --- Export SpatialArtifact bundle: map.png + manifest.json + manifest.csv ---
  const handleExportBundle = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    // 1) Build manifest data from checkpoints
    const exportManifest = useSpatialEditorStore.getState().exportCheckpointManifest();
    const checkpoints = doc.layers
      .flatMap((l) => l.objects)
      .filter((o) => o.type === 'checkpoint')
      .sort((a, b) =>
        (((a.props.order as number) ?? 999) - ((b.props.order as number) ?? 999))
        || a.id.localeCompare(b.id),
      );

    // 2) Generate CSV
    const csvHeaders = 'order,label,kind,nx,ny,notes';
    const csvRows = checkpoints.map((obj) => {
      const order = (obj.props.order as number) ?? 0;
      const label = ((obj.props.label as string) ?? '').replace(/,/g, ';');
      const kind = (obj.props.kind as string) ?? 'checkpoint';
      const notes = ((obj.props.notes as string) ?? '').replace(/,/g, ';').replace(/\n/g, ' ');
      return `${order},${label},${kind},${obj.t.x.toFixed(4)},${obj.t.y.toFixed(4)},${notes}`;
    });
    const csv = [csvHeaders, ...csvRows].join('\n');

    // Helper to trigger a browser download
    const downloadBlob = (blob: Blob, filename: string) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    };

    // 3) Download manifest.json + manifest.csv immediately
    downloadBlob(new Blob([exportManifest], { type: 'application/json' }), 'manifest.json');
    setTimeout(() => {
      downloadBlob(new Blob([csv], { type: 'text/csv' }), 'manifest.csv');
    }, 100);

    // 4) Generate PNG (async) then download
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
  }, [doc.layers]);

  // --- Save to Library ---
  const handleOpenSaveModal = useCallback(() => {
    setSaveTitle(artifactTitle || 'Untitled');
    setSaveVisibility(activeTenantId ? 'tenant' : 'private');
    setShowSaveModal(true);
  }, [artifactTitle, activeTenantId]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!saveTitle.trim()) return;
    setSaving(true);

    // Determine tenantId based on visibility choice
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

    // Generate & upload preview PNG (non-blocking — don't fail the save)
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

    // Update URL without reload so re-save works
    const url = new URL(window.location.href);
    url.searchParams.set('artifact', result.id);
    window.history.replaceState({}, '', url.toString());
  }, [saveTitle, saveVisibility, activeTenantId, artifactId, doc, setArtifactMeta]);

  return (
    <div className="flex h-full">
      {/* ---- Canvas area ---- */}
      <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* Top toolbar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            💾 {t('toolbar.save')}{dirty ? ' •' : ''}
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            📂 {t('toolbar.load')}
          </button>
          <button
            type="button"
            onClick={() => copyDocumentJson(doc)}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            📋 {t('toolbar.json')}
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            🖼 {t('toolbar.png')}
          </button>
          <button
            type="button"
            onClick={handleExportBundle}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
            title={t('toolbar.bundleTooltip')}
          >
            📦 {t('toolbar.bundle')}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm ring-1 ring-gray-200 hover:bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            🗑 {t('toolbar.clear')}
          </button>

          <span className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

          <button
            type="button"
            onClick={handleOpenSaveModal}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            📚 {artifactId ? t('toolbar.save') : t('toolbar.saveToLibrary')}{dirty ? ' •' : ''}
          </button>

          <Link
            href="/admin/library/spatial-editor"
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
          >
            📂 {t('toolbar.library')}
          </Link>
        </div>

        {/* Save to Library modal */}
        {showSaveModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="rounded-xl bg-white p-6 shadow-xl w-80 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                {artifactId ? t('modal.titleUpdate') : t('modal.titleSave')}
              </h3>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('modal.titleLabel')}
              </label>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder={t('modal.titlePlaceholder')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveToLibrary();
                  if (e.key === 'Escape') setShowSaveModal(false);
                }}
              />
              <label className="block text-xs text-gray-500 dark:text-gray-400 mt-3 mb-1">
                {t('modal.visibility')}
              </label>
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
                  🔒 {t('modal.private')}
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
                    👥 {t('modal.tenant')}
                  </button>
                )}
              </div>
              {artifactId && (
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                  {t('modal.updateInfo')}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={saving || !saveTitle.trim()}
                  className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t('modal.saving') : `💾 ${t('modal.save')}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom status / viewport badge */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-md bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-gray-200 text-[11px] text-gray-600 font-mono dark:bg-gray-800/90 dark:text-gray-300 dark:ring-gray-700">
          {artifactId && (
            <>
              <span title="Artifact" className="text-emerald-600 dark:text-emerald-400 font-sans font-medium truncate max-w-32">
                📚 {artifactTitle}
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
            </>
          )}
          <span title="Zoom level">{zoomPercent}%</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span title="Object count">{objectCount} obj</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span title="Selected">{selectedIds.length > 0 ? `${selectedIds.length} sel` : '–'}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span title="ViewBox" className="text-gray-400 dark:text-gray-500">
            vb: {Math.round(viewBox.x)},{Math.round(viewBox.y)} {Math.round(viewBox.w)}×{Math.round(viewBox.h)}
          </span>
          <button
            type="button"
            onClick={resetView}
            className="ml-1 underline text-blue-500 hover:text-blue-700 dark:text-blue-400"
          >
            {t('statusBar.reset')}
          </button>
        </div>

        {/* Tips overlay */}
        <div className="absolute bottom-3 right-3 z-10 text-[10px] text-gray-400 dark:text-gray-500 text-right leading-relaxed">
          <span>{t('tips.shortcuts')}</span>
        </div>

        <SpatialCanvas ref={svgRef} />
        <CanvasToolbar />
      </div>

      {/* ---- Right sidebar ---- */}
      <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white p-4 flex flex-col gap-6 overflow-y-auto dark:border-gray-700 dark:bg-gray-800">
        {/* Palette */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('sidebar.tools')}
          </h2>
          <AssetPalette />
          {/* Place policy toggle */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlacePolicy(placePolicy === 'sticky' ? 'one-shot' : 'sticky')}
              className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {placePolicy === 'sticky' ? `📌 ${t('sidebar.stickyPlace')}` : `☝️ ${t('sidebar.oneShotPlace')}`}
            </button>
          </div>
        </section>

        {/* Background selector */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('sidebar.background')}
          </h2>
          <div className="flex flex-wrap gap-1">
            {SPORT_FIELD_VARIANTS.map((v) => {
              const isActive =
                (v.id === 'none' && background.type === 'grid') ||
                (background.type === 'sport-field' && background.variant === v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    v.id === 'none'
                      ? setBackground({ type: 'grid' })
                      : setBackground({ type: 'sport-field', variant: v.id, opacity: background.opacity ?? 1 })
                  }
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-700'
                      : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600'
                  }`}
                  title={v.label}
                >
                  {v.emoji} {v.label}
                </button>
              );
            })}
          </div>

          {/* Map backgrounds */}
          <h3 className="mt-3 mb-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            {t('sidebar.mapBackgrounds')}
          </h3>
          <div className="flex flex-wrap gap-1">
            {MAP_BG_VARIANTS.map((v) => {
              const isActive = background.type === 'sport-field' && background.variant === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    setBackground({ type: 'sport-field', variant: v.id, opacity: background.opacity ?? 1 })
                  }
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-700'
                      : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600'
                  }`}
                  title={v.label}
                >
                  {v.emoji} {v.label}
                </button>
              );
            })}
          </div>

          {/* Opacity slider (for sport-field or image backgrounds) */}
          {(background.type === 'sport-field' || background.type === 'image') && (
            <div className="mt-3 flex flex-col gap-1">
              <label className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{t('sidebar.opacity')}</span>
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
          <div className="mt-3 flex flex-col gap-1.5">
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
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                background.type === 'image'
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-700'
                  : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              📷 {t('sidebar.uploadImage')}
            </button>
            <Link
              href="/sandbox/spatial-capture"
              target="_blank"
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-center bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600 transition-colors"
            >
              🗺️ {t('sidebar.mapCapture')}
            </Link>
            {background.type === 'image' && background.src && (
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="truncate flex-1">
                  {background.imageWidth}×{background.imageHeight} px
                </span>
                <button
                  type="button"
                  onClick={() => setBackground({ type: 'grid' })}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title={t('sidebar.removeImage')}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Station list */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('sidebar.stations')}
          </h2>
          <StationListPanel />
        </section>

        {/* Inspector */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('sidebar.properties')}
          </h2>
          <InspectorPanel />
        </section>
      </div>
    </div>
  );
}
