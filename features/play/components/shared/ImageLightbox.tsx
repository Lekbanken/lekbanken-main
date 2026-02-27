/**
 * ImageLightbox — fullscreen image overlay for artifact images
 *
 * Built from scratch (no external zoom lib) per GPT Option A.
 *
 * Features:
 * - Body scroll lock (iOS-safe pattern)
 * - Click-to-zoom toggle (fit → natural size)
 * - ESC / ✕ button / backdrop click to close
 * - a11y: role="dialog", aria-modal, focus trap (close button)
 * - z-[75] — above drawer (z-[61]) but below confirm dialogs (z-[80])
 *
 * Image source resolution:
 * - variant.metadata.imageUrl (direct URL — same pattern as hotspot/tile_puzzle)
 * - variant.body if it looks like a URL (fallback)
 * - future: variant.media_url (when API resolves media_ref → URL)
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Props
// =============================================================================

export interface ImageLightboxProps {
  /** Full image URL */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Whether the lightbox is open */
  open: boolean;
  /** Close callback */
  onClose: () => void;
  /** Optional caption below the image */
  caption?: string | null;
  /** i18n labels */
  labels?: {
    close?: string;
    zoomIn?: string;
    zoomOut?: string;
  };
}

// =============================================================================
// Body scroll lock (iOS Safari-safe)
// =============================================================================

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = 'none';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = '';

      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

// =============================================================================
// Component
// =============================================================================

export function ImageLightbox({
  src,
  alt = '',
  open,
  onClose,
  caption,
  labels,
}: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // --- Close handler: reset zoom + delegate ---
  const handleClose = useCallback(() => {
    setZoomed(false);
    onClose();
  }, [onClose]);

  // --- Scroll lock ---
  useBodyScrollLock(open);

  // --- Focus close button on open ---
  useEffect(() => {
    if (open) {
      // Small delay to ensure the element is mounted
      const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // --- ESC to close ---
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [open, handleClose]);

  // --- Backdrop click ---
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the backdrop itself, not the image
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  // --- Toggle zoom ---
  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setZoomed((z) => !z);
    },
    [],
  );

  if (!open) return null;

  const closeLabel = labels?.close ?? 'Close';
  const zoomLabel = zoomed
    ? (labels?.zoomOut ?? 'Zoom out')
    : (labels?.zoomIn ?? 'Zoom in');

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
    >
      {/* Close button */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={handleClose}
        className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label={closeLabel}
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      {/* Image container — overflow-auto enables pan when zoomed */}
      <div
        className={
          zoomed
            ? 'max-h-[100dvh] max-w-[100dvw] overflow-auto overscroll-contain'
            : 'flex max-h-[90vh] max-w-[90vw] items-center justify-center'
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          title={zoomLabel}
          onClick={handleImageClick}
          className={
            zoomed
              ? 'max-w-none cursor-zoom-out select-none'
              : 'max-h-[85vh] max-w-[90vw] cursor-zoom-in rounded-lg object-contain shadow-2xl select-none'
          }
          draggable={false}
        />
      </div>

      {/* Caption */}
      {caption && (
        <p className="absolute bottom-4 left-1/2 max-w-[80vw] -translate-x-1/2 truncate rounded-full bg-black/60 px-4 py-1.5 text-center text-sm text-white/90">
          {caption}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Utility: extract image URL from variant data
// =============================================================================

// Allowed image extensions for body-as-URL fallback.
// SVG intentionally excluded — potential XSS vector unless served with safe headers.
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif)$/i;

// Supabase Storage signed/public URL pattern
const SUPABASE_STORAGE_RE = /\/storage\/v1\/object\/(public|sign)\//;

/**
 * Validates a candidate string is a safe, parseable image URL.
 * Only http: and https: schemes are accepted — blocks javascript:, data:, etc.
 */
function isSafeHttpUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href; // normalized
    }
  } catch {
    // malformed URL — reject
  }
  return null;
}

/**
 * Extracts the best available image URL from a variant's data.
 *
 * Resolution order:
 * 1. variant.metadata.imageUrl (direct URL — same pattern as hotspot/tile_puzzle)
 * 2. variant.metadata.image_url (snake_case variant)
 * 3. variant.metadata.url
 * 4. variant.body if it looks like an image URL (extension whitelist or Supabase Storage path)
 *
 * Security: only http/https accepted. Parsed via `new URL()` — rejects
 * javascript:, data:, malformed strings, and non-image URLs in body.
 *
 * Returns null if no valid image URL can be determined.
 */
export function extractImageUrl(
  metadata: unknown,
  body: string | null | undefined,
): string | null {
  // 1. Check metadata fields (trusted source — director sets these)
  if (metadata && typeof metadata === 'object') {
    const meta = metadata as Record<string, unknown>;
    for (const key of ['imageUrl', 'image_url', 'url'] as const) {
      const val = meta[key];
      if (typeof val === 'string' && val.trim()) {
        const safe = isSafeHttpUrl(val.trim());
        if (safe) return safe;
      }
    }
  }

  // 2. Check body as URL (less trusted — apply stricter validation)
  if (body && typeof body === 'string') {
    const trimmed = body.trim();
    // Only accept if it's a single-line value that parses as http(s)
    if (!trimmed.includes('\n')) {
      const safe = isSafeHttpUrl(trimmed);
      if (safe) {
        const url = new URL(safe);
        const pathname = url.pathname.toLowerCase();
        // Must have a known image extension OR be a Supabase Storage URL
        if (IMAGE_EXTENSIONS.test(pathname) || SUPABASE_STORAGE_RE.test(pathname)) {
          return safe;
        }
      }
    }
  }

  return null;
}
