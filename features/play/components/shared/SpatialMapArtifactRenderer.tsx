'use client';

/**
 * SpatialMapArtifactRenderer — Read-only viewer for spatial map artifacts.
 *
 * Used in:
 *   - ParticipantArtifactDrawer (play mode)
 *   - GameDetailArtifacts (game detail page)
 *
 * Auth strategy:
 *   - Authenticated users (leaders/admins): cookie-based auth (no token needed)
 *   - Participants: passes `x-participant-token` header via fetch()
 *   - Creates a blob URL from the fetched SVG to avoid header issues with <img>
 *   - Revokes blob URL on unmount to prevent memory leaks
 *
 * NOT stored in metadata: SVG URLs are derived from `spatial_artifact_id`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Hook: useSvgBlobUrl — fetch SVG with auth headers → blob URL
// =============================================================================

interface UseSvgBlobUrlOptions {
  /** The spatial artifact UUID */
  artifactId: string | null;
  /** Participant token (null for authenticated users) */
  participantToken?: string | null;
}

interface UseSvgBlobUrlResult {
  blobUrl: string | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useSvgBlobUrl({ artifactId, participantToken }: UseSvgBlobUrlOptions): UseSvgBlobUrlResult {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!artifactId) return;

    const controller = new AbortController();
    let url: string | null = null;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {};
        if (participantToken) {
          headers['x-participant-token'] = participantToken;
        }

        const res = await fetch(`/api/spatial-artifacts/${artifactId}/svg`, {
          headers,
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('no-access');
          }
          throw new Error(`HTTP ${res.status}`);
        }

        // Force correct MIME type for consistent rendering
        const text = await res.text();
        const blob = new Blob([text], { type: 'image/svg+xml' });
        url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message === 'no-access' ? 'no-access' : 'load-error');
      } finally {
        setLoading(false);
      }
    }

    void load();

    return () => {
      controller.abort();
      if (url) {
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
      }
    };
  }, [artifactId, participantToken, retryCount]);

  // Cleanup on unmount (in case effect cleanup didn't catch it)
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const retry = useCallback(() => setRetryCount((c) => c + 1), []);

  return { blobUrl, loading, error, retry };
}

// =============================================================================
// SpatialMapArtifactRenderer
// =============================================================================

export interface SpatialMapArtifactRendererProps {
  /** The spatial_artifact_id from artifact metadata */
  spatialArtifactId: string;
  /** Optional display title */
  title?: string | null;
  /** Participant token for auth (null for authenticated leaders/admins) */
  participantToken?: string | null;
  /** i18n labels */
  labels?: {
    openFull?: string;
    loadError?: string;
    noAccess?: string;
    loading?: string;
    retry?: string;
    close?: string;
  };
}

export function SpatialMapArtifactRenderer({
  spatialArtifactId,
  title,
  participantToken,
  labels,
}: SpatialMapArtifactRendererProps) {
  const { blobUrl, loading, error, retry } = useSvgBlobUrl({
    artifactId: spatialArtifactId,
    participantToken,
  });
  const [fullscreen, setFullscreen] = useState(false);

  const openFullLabel = labels?.openFull ?? 'Öppna karta';
  const loadErrorLabel = labels?.loadError ?? 'Kunde inte ladda kartan';
  const noAccessLabel = labels?.noAccess ?? 'Ingen åtkomst till kartan';
  const loadingLabel = labels?.loading ?? 'Laddar karta…';
  const retryLabel = labels?.retry ?? 'Försök igen';
  const closeLabel = labels?.close ?? 'Stäng';

  // --- Loading state ---
  if (loading) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
          <span>{loadingLabel}</span>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <MapIcon className="h-4 w-4" />
          <span>{error === 'no-access' ? noAccessLabel : loadErrorLabel}</span>
        </div>
        {error !== 'no-access' && (
          <button
            type="button"
            onClick={retry}
            className="text-xs text-primary hover:underline"
          >
            {retryLabel}
          </button>
        )}
      </div>
    );
  }

  // --- No SVG loaded (no artifact ID?) ---
  if (!blobUrl) return null;

  return (
    <>
      {/* Inline preview */}
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        {title && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-emerald-500/10">
            <MapIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-foreground truncate">{title}</span>
          </div>
        )}
        <button
          type="button"
          className="group relative w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset"
          onClick={() => setFullscreen(true)}
          aria-label={openFullLabel}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt={title ?? 'Spatial map'}
            className="w-full max-h-56 object-contain p-2 transition-transform group-hover:scale-[1.01]"
            draggable={false}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/5">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1">
              <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
              {openFullLabel}
            </span>
          </span>
        </button>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <SpatialMapFullscreenModal
          blobUrl={blobUrl}
          title={title}
          closeLabel={closeLabel}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}

// =============================================================================
// Fullscreen modal with pan/zoom
// =============================================================================

function SpatialMapFullscreenModal({
  blobUrl,
  title,
  closeLabel,
  onClose,
}: {
  blobUrl: string;
  title?: string | null;
  closeLabel?: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount
  useEffect(() => {
    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Spatial map'}
    >
      {/* Close button */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label={closeLabel ?? 'Stäng'}
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      {/* Image container with zoom toggle */}
      <div
        className={
          zoomed
            ? 'max-h-[100dvh] max-w-[100dvw] overflow-auto overscroll-contain'
            : 'flex max-h-[90vh] max-w-[90vw] items-center justify-center'
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt={title ?? 'Spatial map'}
          onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
          className={
            zoomed
              ? 'max-w-none cursor-zoom-out select-none'
              : 'max-h-[85vh] max-w-[90vw] cursor-zoom-in rounded-lg object-contain shadow-2xl select-none'
          }
          draggable={false}
        />
      </div>

      {/* Title */}
      {title && (
        <p className="absolute bottom-4 left-1/2 max-w-[80vw] -translate-x-1/2 truncate rounded-full bg-black/60 px-4 py-1.5 text-center text-sm text-white/90">
          🗺️ {title}
        </p>
      )}
    </div>
  );
}
