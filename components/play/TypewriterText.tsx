'use client';

import { forwardRef, useEffect, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useTypewriter, type TypewriterSpeed } from './hooks/useTypewriter';
import { useSound } from './hooks/useSound';
import { Button } from '@/components/ui/button';
import { ForwardIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';

export interface TypewriterTextProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Text to reveal with typewriter effect */
  text: string;
  /** Speed preset */
  speed?: TypewriterSpeed;
  /** Show progress bar below text */
  showProgress?: boolean;
  /** Allow skip button (host only) */
  allowSkip?: boolean;
  /** Allow participants (not just host) to skip */
  allowParticipantSkip?: boolean;
  /** Allow pause/resume (host only) */
  allowPause?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback when skipped */
  onSkip?: () => void;
  /** Show blinking cursor at end */
  showCursor?: boolean;
  /** Variant for styling */
  variant?: 'default' | 'story' | 'message';
  /** Whether the current user is the host */
  isHost?: boolean;
  /** Enable typewriter click sound (plays every 3rd character) */
  soundEnabled?: boolean;
  /** Sound volume (0-1) */
  soundVolume?: number;
}

/**
 * TypewriterText - Reveals text character-by-character for dramatic effect
 * 
 * Mobile-first, respects reduced-motion preferences
 */
export const TypewriterText = forwardRef<HTMLDivElement, TypewriterTextProps>(
  (
    {
      text,
      speed = 'normal',
      showProgress = true,
      allowSkip = false,
      allowParticipantSkip = false,
      allowPause = false,
      onComplete,
      onSkip,
      showCursor = true,
      variant = 'default',
      isHost = true,
      soundEnabled = false,
      soundVolume = 0.3,
      className,
      ...props
    },
    ref
  ) => {
    const {
      displayedText,
      progress,
      isAnimating,
      isComplete,
      skip,
      pause,
      resume,
    } = useTypewriter({
      text,
      speed,
      onComplete,
    });

    const { playClick, setVolume } = useSound();
    const lastLengthRef = useRef(0);

    // Set volume when it changes
    useEffect(() => {
      setVolume(soundVolume);
    }, [soundVolume, setVolume]);

    // Play click sound every 3rd character
    useEffect(() => {
      if (!soundEnabled || !isAnimating) return;
      
      const currentLength = displayedText.length;
      const prevLength = lastLengthRef.current;
      
      // Only play if we added characters (not on skip/reset)
      if (currentLength > prevLength) {
        // Play every 3rd character to avoid being too noisy
        if (currentLength % 3 === 0) {
          playClick();
        }
      }
      
      lastLengthRef.current = currentLength;
    }, [displayedText, soundEnabled, isAnimating, playClick]);

    const handleSkip = () => {
      skip();
      onSkip?.();
    };

    // Determine if skip button should show
    const canSkip = allowSkip && (isHost || allowParticipantSkip);
    // Pause is always host-only
    const canPause = allowPause && isHost;

    const variantStyles = {
      default: 'text-foreground',
      story: 'text-xl md:text-2xl font-medium text-foreground leading-relaxed',
      message: 'text-base text-foreground bg-muted rounded-lg p-4',
    };

    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        {...props}
      >
        {/* Text Display */}
        <div
          className={cn(
            'whitespace-pre-wrap break-words',
            variantStyles[variant]
          )}
          aria-live="polite"
          aria-atomic="false"
        >
          {displayedText}
          {showCursor && !isComplete && (
            <span 
              className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && !isComplete && (
          <div className="mt-4 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100 ease-out"
              style={{ width: `${progress * 100}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {/* Host Controls */}
        {(canSkip || canPause) && !isComplete && (
          <div className="mt-4 flex items-center gap-2">
            {canPause && (
              <Button
                variant="ghost"
                size="sm"
                onClick={isAnimating ? pause : resume}
                className="gap-1.5"
              >
                {isAnimating ? (
                  <>
                    <PauseIcon className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only">Pausa</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only">Fortsätt</span>
                  </>
                )}
              </Button>
            )}
            {canSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="gap-1.5"
              >
                <ForwardIcon className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Hoppa över</span>
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

TypewriterText.displayName = 'TypewriterText';
