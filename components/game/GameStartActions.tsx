'use client';

/**
 * GameStartActions Component
 *
 * Unified CTA block for game actions. Used in GameDetails sidebar
 * and any context where the full action set is needed.
 *
 * STRUCTURE:
 * - Primary: "Starta lek" (Start session)
 * - Secondary: "Lägg till i plan" (Add to plan) - optional
 * - Tertiary: Like / Dislike buttons
 *
 * USAGE:
 * ```tsx
 * // GameDetails sidebar
 * <GameStartActions
 *   gameId="abc-123"
 *   gameName="Lek namn"
 *   initialLiked={false}
 * />
 *
 * // With add to plan
 * <GameStartActions
 *   gameId="abc-123"
 *   gameName="Lek namn"
 *   onAddToPlan={() => openPlannerModal()}
 * />
 * ```
 *
 * @see PLAY_IMPLEMENTATION_GUIDE_P0.md
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LikeButton } from '@/components/game/LikeButton';
import { createSession } from '@/features/play-participant/api';
import type { ReactionType } from '@/types/game-reaction';

// =============================================================================
// TYPES
// =============================================================================

export interface GameStartActionsProps {
  /** Game ID for session start and reactions */
  gameId: string;
  /** Game name for display and session creation */
  gameName: string;
  /** Initial liked state (from server) */
  initialLiked?: boolean;
  /** Initial reaction (alternative to initialLiked) */
  initialReaction?: ReactionType | null;
  /** Callback to add game to plan */
  onAddToPlan?: () => void;
  /** Show "Add to plan" button */
  showAddToPlan?: boolean;
  /** Show dislike button (feature flag, default off) */
  showDislike?: boolean;
  /** Show share button */
  showShare?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Custom labels */
  labels?: {
    startSession?: string;
    startingSession?: string;
    addToPlan?: string;
    share?: string;
    like?: string;
    dislike?: string;
  };
}

// =============================================================================
// ICONS
// =============================================================================

const PlayIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
      clipRule="evenodd"
    />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
    />
  </svg>
);

const ThumbDownIcon = ({ className, filled }: { className?: string; filled?: boolean }) => (
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
      d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384"
    />
  </svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

export function GameStartActions({
  gameId,
  gameName,
  initialLiked = false,
  initialReaction,
  onAddToPlan,
  showAddToPlan = false,
  showDislike = false,
  showShare = true,
  className,
  labels = {},
}: GameStartActionsProps) {
  const t = useTranslations('app.play.startSession');
  const tDetail = useTranslations('app.gameDetail');
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    startSession = t('startButton'),
    startingSession = t('starting'),
    addToPlan = 'Lägg till i plan',
    share = 'Dela',
  } = labels;

  // Handle start session
  const handleStartSession = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setError(null);

    try {
      const res = await createSession({ displayName: gameName, gameId });
      const sessionId = (res as { session?: { id?: string } }).session?.id;
      if (!sessionId) throw new Error(t('createFailed'));
      router.push(`/app/play/sessions/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createFailed'));
      setIsStarting(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: gameName,
          text: `Kolla in denna lek: ${gameName}`,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(window.location.href);
        }
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4 space-y-3">
        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* PRIMARY: Start Session */}
        <Button
          size="lg"
          className="w-full bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white font-bold shadow-sm"
          onClick={handleStartSession}
          disabled={isStarting}
        >
          <PlayIcon className="h-5 w-5 mr-2" />
          {isStarting ? startingSession : startSession}
        </Button>

        {/* SECONDARY: Director Mode Preview */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          loading={isOpeningPreview}
          onClick={() => {
            setIsOpeningPreview(true);
            router.push(`/app/games/${gameId}/director-preview`);
          }}
        >
          <EyeIcon className="h-5 w-5 mr-2" />
          {tDetail('directorPreview.button')}
        </Button>

        {/* SECONDARY: Add to Plan */}
        {showAddToPlan && onAddToPlan && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onAddToPlan}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {addToPlan}
          </Button>
        )}

        {/* TERTIARY: Like + Share + Dislike row */}
        <div className="flex items-center justify-center gap-2 pt-1">
          {/* Like button */}
          <LikeButton
            gameId={gameId}
            initialLiked={initialLiked}
            initialReaction={initialReaction}
            size="md"
            context="details"
          />

          {/* Share button */}
          {showShare && (
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md bg-muted p-2 transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={share}
            >
              <ShareIcon className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          {/* Dislike button - feature flagged, off by default */}
          {showDislike && (
            <button
              type="button"
              className="rounded-md bg-muted p-2 transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Gilla inte"
            >
              <ThumbDownIcon className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
