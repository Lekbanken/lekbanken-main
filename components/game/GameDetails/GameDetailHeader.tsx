'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { GameDetailHeaderProps } from './types';

/**
 * GameDetailHeader - Title, cover image and back navigation
 *
 * Displays the main header section of a game detail page including:
 * - Back navigation link
 * - Optional label (e.g., "LEK")
 * - Game title
 * - Cover image (if available)
 */
export function GameDetailHeader({
  game,
  backLink = { href: '/app/browse', label: 'Tillbaka' },
  label = 'LEK',
  className = '',
}: GameDetailHeaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Back link */}
      <Link
        href={backLink.href}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {backLink.label}
      </Link>

      {/* Title section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {label && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mb-1">
              {label}
            </p>
          )}
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {game.title}
          </h1>
          {game.subtitle && (
            <p className="text-lg text-muted-foreground mt-1">
              {game.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Cover image */}
      {game.coverUrl && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
          <div className="relative aspect-[16/9]">
            <Image
              src={game.coverUrl}
              alt={game.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
