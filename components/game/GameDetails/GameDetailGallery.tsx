'use client';

import Image from 'next/image';
import { PhotoIcon } from '@heroicons/react/24/outline';
import type { GameDetailGalleryProps } from './types';

/**
 * GameDetailGallery - Display image gallery
 *
 * Shows a grid of images for the game.
 * Receives raw gallery items with media relation from DB.
 */
export function GameDetailGallery({
  game,
  galleryItems = [],
  labels = {},
  className = '',
}: GameDetailGalleryProps) {
  // Filter items with valid URLs
  const validItems = galleryItems.filter(item => item.media?.url);

  // Don't render if no valid gallery items
  if (validItems.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Bilder';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <PhotoIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          {titleLabel}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {validItems.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border border-border/60 bg-muted"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={item.media!.url!}
                alt={item.media?.alt_text || game.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
