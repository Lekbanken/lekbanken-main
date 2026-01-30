'use client';

/**
 * Unified GameCard Component
 *
 * EN komponent för alla spel-kort i Lekbanken.
 * Stödjer 7 varianter via `variant` prop.
 *
 * ANVÄNDNING:
 * ```tsx
 * import { GameCard } from '@/components/game/GameCard';
 * import { mapDbGameToSummary } from '@/lib/game-display';
 *
 * const summary = mapDbGameToSummary(dbGame);
 * <GameCard game={summary} variant="grid" />
 * ```
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md
 */

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  formatDuration,
  formatPlayers,
  formatAge,
  formatEnergyLevel,
  formatPlayMode,
  formatRating,
  validateGameSummary,
} from '@/lib/game-display';
import type { GameCardProps, GameCardFlags } from './types';
import { DEFAULT_FLAGS } from './types';

// =============================================================================
// ICONS (inline SVG för att undvika extra dependencies)
// =============================================================================

const HeartIcon = ({ filled, className }: { filled?: boolean; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
      clipRule="evenodd"
    />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
      clipRule="evenodd"
    />
  </svg>
);

const GripIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface GameImageProps {
  src?: string | null;
  alt: string;
  aspectRatio?: 'video' | 'square' | 'wide';
  className?: string;
}

function GameImage({ src, alt, aspectRatio = 'video', className }: GameImageProps) {
  const aspectClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    wide: 'aspect-[16/9]',
  }[aspectRatio];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20',
        aspectClass,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 360px, 100vw"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">
          🎮
        </div>
      )}
    </div>
  );
}

interface FavoriteButtonProps {
  isFavorite?: boolean;
  onFavorite?: (isFavorite: boolean) => void;
  className?: string;
}

function FavoriteButton({ isFavorite = false, onFavorite, className }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFavorite?.(!isFavorite);
      }}
      className={cn(
        'rounded-full bg-background/80 p-1.5 backdrop-blur transition-colors hover:bg-background',
        className
      )}
      aria-label={isFavorite ? 'Ta bort favorit' : 'Lägg till favorit'}
    >
      <HeartIcon
        filled={isFavorite}
        className={cn('h-4 w-4', isFavorite ? 'text-destructive' : 'text-muted-foreground')}
      />
    </button>
  );
}

interface RatingDisplayProps {
  rating?: number | null;
  className?: string;
}

function RatingDisplay({ rating, className }: RatingDisplayProps) {
  const formatted = formatRating(rating);
  if (!formatted) return null;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <StarIcon className="h-3.5 w-3.5 text-yellow-500" />
      <span className="text-sm font-medium">{formatted}</span>
    </div>
  );
}

// =============================================================================
// VARIANT: GRID (Default)
// =============================================================================

function GameCardGrid({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const playMode = formatPlayMode(game.playMode);
  const energy = formatEnergyLevel(game.energyLevel);
  const duration = formatDuration(game.durationMin, game.durationMax);
  const players = formatPlayers(game.minPlayers, game.maxPlayers);
  const age = formatAge(game.ageMin, game.ageMax);

  const content = (
    <div
      className={cn(
        'group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md',
        playMode?.border ?? 'border-border',
        className
      )}
    >
      {/* Image with overlays */}
      {flags.showImage && (
        <div className="relative">
          {/* Favorite button - top right */}
          {flags.showFavorite && (
            <FavoriteButton
              isFavorite={game.isFavorite}
              onFavorite={actions?.onFavorite}
              className="absolute right-3 top-3 z-10"
            />
          )}
          {/* PlayMode badge - bottom right in image */}
          {flags.showPlayMode && playMode && playMode.label !== 'Enkel lek' && (
            <div className="absolute bottom-2 right-2 z-10">
              <Badge size="sm" className={cn('border-0 shadow-sm', playMode.badge)}>
                {playMode.label}
              </Badge>
            </div>
          )}
          <GameImage src={game.coverUrl} alt={game.title} aspectRatio="video" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title + Rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('line-clamp-1 font-semibold text-foreground', playMode?.titleColor ?? 'group-hover:text-primary')}>
            {game.title}
          </h3>
          {flags.showRating && <RatingDisplay rating={game.rating} />}
        </div>

        {/* Purpose/Category */}
        {game.purpose && (
          <p className="mt-0.5 text-xs text-primary/80">{game.purpose}</p>
        )}

        {/* Description */}
        {flags.showDescription && game.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {game.shortDescription}
          </p>
        )}

        {/* Metadata row - text based */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {flags.showDuration && duration && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {duration}
            </span>
          )}
          {flags.showPlayers && players && (
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" />
              {players}
            </span>
          )}
          {flags.showEnergy && energy && (
            <span className={cn('inline-flex items-center gap-1 font-medium', energy.color)}>
              <BoltIcon className="h-3.5 w-3.5" />
              {energy.labelShort}
            </span>
          )}
          {flags.showAge && age && (
            <span>{age}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (actions?.href) {
    return (
      <Link href={actions.href} className="block">
        {content}
      </Link>
    );
  }

  if (actions?.onClick) {
    return (
      <button type="button" onClick={actions.onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// =============================================================================
// VARIANT: LIST
// =============================================================================

function GameCardList({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const playMode = formatPlayMode(game.playMode);
  const energy = formatEnergyLevel(game.energyLevel);
  const duration = formatDuration(game.durationMin, game.durationMax);
  const players = formatPlayers(game.minPlayers, game.maxPlayers);
  const age = formatAge(game.ageMin, game.ageMax);

  const content = (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border-l-4 border border-border/40 bg-card p-3 transition-all hover:shadow-md hover:bg-muted/30',
        playMode?.borderLeft ?? 'border-l-border',
        className
      )}
    >
      {/* Image - Compact square */}
      {flags.showImage && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
          <GameImage src={game.coverUrl} alt={game.title} aspectRatio="square" className="h-full w-full" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title row with metadata aligned right */}
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('line-clamp-1 text-sm font-semibold text-foreground', playMode?.titleColor ?? 'group-hover:text-primary')}>
            {game.title}
          </h3>
          {/* Metadata - aligned right on title row */}
          <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            {flags.showDuration && duration && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {duration}
              </span>
            )}
            {flags.showPlayers && players && (
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {players}
              </span>
            )}
            {flags.showEnergy && energy && (
              <span className={cn('inline-flex items-center gap-0.5 font-medium', energy.color)}>
                <BoltIcon className="h-3 w-3" />
                {energy.labelShort}
              </span>
            )}
            {flags.showAge && age && (
              <span>{age}</span>
            )}
          </div>
        </div>

        {/* Description */}
        {flags.showDescription && game.shortDescription && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {game.shortDescription}
          </p>
        )}
      </div>

      {/* Favorite button - right side */}
      {flags.showFavorite && (
        <FavoriteButton isFavorite={game.isFavorite} onFavorite={actions?.onFavorite} className="shrink-0" />
      )}
    </div>
  );

  if (actions?.href) {
    return (
      <Link href={actions.href} className="block">
        {content}
      </Link>
    );
  }

  if (actions?.onClick) {
    return (
      <button type="button" onClick={actions.onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// =============================================================================
// VARIANT: COMPACT
// =============================================================================

function GameCardCompact({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const duration = formatDuration(game.durationMin, game.durationMax);

  const content = (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition-all hover:shadow-md hover:border-primary',
        className
      )}
    >
      {/* Thumbnail */}
      {flags.showImage && (
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
          <GameImage src={game.coverUrl} alt={game.title} aspectRatio="square" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground group-hover:text-primary">
          {game.title}
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {duration && <span>{duration}</span>}
        </div>
      </div>

      {/* Rating */}
      {flags.showRating && <RatingDisplay rating={game.rating} />}
    </div>
  );

  if (actions?.href) {
    return (
      <Link href={actions.href} className="block">
        {content}
      </Link>
    );
  }

  if (actions?.onClick) {
    return (
      <button type="button" onClick={actions.onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// =============================================================================
// VARIANT: PICKER
// =============================================================================

function GameCardPicker({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const duration = formatDuration(game.durationMin, game.durationMax);

  return (
    <button
      type="button"
      onClick={actions?.onClick ?? actions?.onAdd}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/50',
        className
      )}
    >
      {/* Image */}
      {flags.showImage && (
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
          <GameImage src={game.coverUrl} alt={game.title} aspectRatio="square" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{game.title}</p>
        {flags.showDescription && game.shortDescription && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {game.shortDescription}
          </p>
        )}
      </div>

      {/* Duration badge */}
      {flags.showDuration && duration && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          {duration}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// VARIANT: BLOCK (for Planner drag-drop)
// =============================================================================

function GameCardBlock({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const duration = formatDuration(game.durationMin, game.durationMax);
  const energy = formatEnergyLevel(game.energyLevel);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2',
        className
      )}
    >
      {/* Drag handle */}
      {flags.isDraggable && (
        <div className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripIcon className="h-5 w-5" />
        </div>
      )}

      {/* Game badge */}
      <Badge variant="primary" size="sm" className="shrink-0">
        🎮 Lek
      </Badge>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{game.title}</span>
        {game.shortDescription && (
          <p className="truncate text-xs text-muted-foreground">{game.shortDescription}</p>
        )}
      </div>

      {/* Energy */}
      {flags.showEnergy && energy && (
        <span className={cn('text-xs', energy.color)}>{energy.labelShort}</span>
      )}

      {/* Duration */}
      {flags.showDuration && duration && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon className="h-3.5 w-3.5" />
          {duration}
        </span>
      )}

      {/* Actions */}
      {actions?.onClick && (
        <button
          type="button"
          onClick={actions.onClick}
          className="text-muted-foreground hover:text-foreground"
        >
          ✏️
        </button>
      )}
      {actions?.onRemove && (
        <button
          type="button"
          onClick={actions.onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          🗑️
        </button>
      )}
    </div>
  );
}

// =============================================================================
// VARIANT: MINI (for Related games)
// =============================================================================

function GameCardMini({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const energy = formatEnergyLevel(game.energyLevel);

  const content = (
    <div
      className={cn(
        'group rounded-2xl border border-border/60 bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      <h3 className="font-semibold text-foreground group-hover:text-primary line-clamp-1">
        {game.title}
      </h3>
      {game.shortDescription && (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {game.shortDescription}
        </p>
      )}
      {flags.showEnergy && energy && (
        <span
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            energy.bgColor,
            energy.color
          )}
        >
          {energy.labelShort}
        </span>
      )}
    </div>
  );

  if (actions?.href) {
    return (
      <Link href={actions.href} className="block">
        {content}
      </Link>
    );
  }

  if (actions?.onClick) {
    return (
      <button type="button" onClick={actions.onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// =============================================================================
// VARIANT: FEATURED (for Hero sections)
// =============================================================================

function GameCardFeatured({
  game,
  flags,
  actions,
  className,
}: GameCardProps & { flags: GameCardFlags }) {
  const playMode = formatPlayMode(game.playMode);
  const energy = formatEnergyLevel(game.energyLevel);
  const duration = formatDuration(game.durationMin, game.durationMax);
  const players = formatPlayers(game.minPlayers, game.maxPlayers);
  const age = formatAge(game.ageMin, game.ageMax);

  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border-2 bg-card shadow-lg transition-all hover:shadow-xl',
        playMode?.border ?? 'border-primary',
        className
      )}
    >
      {/* Top badges */}
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <Badge variant="primary">⭐ Utvald</Badge>
        {flags.showPlayMode && playMode && (
          <Badge size="sm" className={cn('border-0', playMode.badge)}>
            {playMode.label}
          </Badge>
        )}
      </div>

      {/* Favorite button */}
      {flags.showFavorite && (
        <FavoriteButton
          isFavorite={game.isFavorite}
          onFavorite={actions?.onFavorite}
          className="absolute right-4 top-4 z-10"
        />
      )}

      {/* Image */}
      {flags.showImage && (
        <GameImage src={game.coverUrl} alt={game.title} aspectRatio="wide" />
      )}

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary">
          {game.title}
        </h3>
        {flags.showDescription && game.shortDescription && (
          <p className="mt-2 line-clamp-2 text-muted-foreground">{game.shortDescription}</p>
        )}

        {/* Categories */}
        {flags.showCategories && game.categories && game.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {game.categories.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="outline" size="sm">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {age && <span>{age}</span>}
            {duration && <span>{duration}</span>}
            {players && <span>{players}</span>}
            {flags.showEnergy && energy && (
              <span className={energy.color}>{energy.labelShort}</span>
            )}
          </div>
          {flags.showRating && game.rating && (
            <RatingDisplay rating={game.rating} />
          )}
        </div>
      </div>
    </div>
  );

  if (actions?.href) {
    return (
      <Link href={actions.href} className="block">
        {content}
      </Link>
    );
  }

  if (actions?.onClick) {
    return (
      <button type="button" onClick={actions.onClick} className="block w-full text-left">
        {content}
      </button>
    );
  }

  return content;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Unified GameCard Component
 *
 * Renderar ett spelkort i vald variant.
 *
 * @example
 * // Grid variant (default)
 * <GameCard game={summary} variant="grid" />
 *
 * // List variant
 * <GameCard game={summary} variant="list" />
 *
 * // Picker variant (for Planner)
 * <GameCard game={summary} variant="picker" actions={{ onAdd: handleAdd }} />
 */
export function GameCard({
  game,
  variant = 'grid',
  flags: userFlags,
  actions,
  className,
  testId,
}: GameCardProps) {
  // Validate game in dev mode
  if (process.env.NODE_ENV === 'development') {
    validateGameSummary(game, 'GameCard');
  }

  // Merge user flags with defaults for this variant
  const flags: GameCardFlags = {
    ...DEFAULT_FLAGS[variant],
    ...userFlags,
  };

  // Add default href if not provided
  const effectiveActions = (!actions?.href && !actions?.onClick)
    ? { ...actions, href: `/app/games/${game.id}` }
    : actions ?? {};

  const props = { game, flags, actions: effectiveActions, className };

  const cardElement = (() => {
    switch (variant) {
      case 'list':
        return <GameCardList {...props} />;
      case 'compact':
        return <GameCardCompact {...props} />;
      case 'picker':
        return <GameCardPicker {...props} />;
      case 'block':
        return <GameCardBlock {...props} />;
      case 'mini':
        return <GameCardMini {...props} />;
      case 'featured':
        return <GameCardFeatured {...props} />;
      case 'grid':
      default:
        return <GameCardGrid {...props} />;
    }
  })();

  // Wrap with test ID if provided
  if (testId) {
    return <div data-testid={testId}>{cardElement}</div>;
  }

  return cardElement;
}

// Export individual variants for special cases
export {
  GameCardGrid,
  GameCardList,
  GameCardCompact,
  GameCardPicker,
  GameCardBlock,
  GameCardMini,
  GameCardFeatured,
};
