'use client';

import { forwardRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTypewriter, type TypewriterSpeed } from './hooks/useTypewriter';
import { Button } from '@/components/ui/button';
import { ForwardIcon, XMarkIcon } from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface StoryOverlayProps {
  /** Whether the overlay is open */
  isOpen: boolean;
  /** Text to reveal with typewriter effect */
  text: string;
  /** Optional title above the text */
  title?: string;
  /** Speed preset */
  speed?: TypewriterSpeed;
  /** Visual theme */
  theme?: 'dark' | 'light' | 'dramatic';
  /** Show progress bar */
  showProgress?: boolean;
  /** Allow skip (host only by default) */
  allowSkip?: boolean;
  /** Allow participants to skip */
  allowParticipantSkip?: boolean;
  /** Allow close/dismiss after completion */
  allowClose?: boolean;
  /** Whether current user is host */
  isHost?: boolean;
  /** Callback when text animation completes */
  onComplete?: () => void;
  /** Callback when overlay is closed */
  onClose?: () => void;
  /** Callback when skipped */
  onSkip?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// StoryOverlay Component
// ============================================================================

export const StoryOverlay = forwardRef<HTMLDivElement, StoryOverlayProps>(
  (
    {
      isOpen,
      text,
      title,
      speed = 'dramatic',
      theme = 'dark',
      showProgress = true,
      allowSkip = true,
      allowParticipantSkip = false,
      allowClose = true,
      isHost = true,
      onComplete,
      onClose,
      onSkip,
      className,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const {
      displayedText,
      progress,
      isComplete,
      skip,
      reset,
    } = useTypewriter({
      text,
      speed,
      autoStart: isOpen,
      onComplete,
    });

    // Handle open/close transitions - synchronous setState is intentional for animation
    useEffect(() => {
      if (isOpen) {
        // Schedule state updates to avoid synchronous setState warning
        requestAnimationFrame(() => {
          setIsVisible(true);
          setIsClosing(false);
          reset();
        });
      } else {
        requestAnimationFrame(() => {
          setIsClosing(true);
        });
        const timer = setTimeout(() => {
          setIsVisible(false);
          setIsClosing(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [isOpen, reset]);

    const handleSkip = useCallback(() => {
      skip();
      onSkip?.();
    }, [skip, onSkip]);

    const handleClose = useCallback(() => {
      onClose?.();
    }, [onClose]);

    // Determine permissions
    const canSkip = allowSkip && (isHost || allowParticipantSkip);
    const canClose = allowClose && isComplete;

    // Don't render if not visible
    if (!isVisible) return null;

    // Theme styles
    const themeStyles = {
      dark: {
        overlay: 'bg-black/95',
        text: 'text-white',
        title: 'text-white/80',
        progress: 'bg-white/20',
        progressBar: 'bg-white',
        button: 'text-white/70 hover:text-white hover:bg-white/10',
      },
      light: {
        overlay: 'bg-white/95',
        text: 'text-foreground',
        title: 'text-foreground-secondary',
        progress: 'bg-foreground/10',
        progressBar: 'bg-primary',
        button: 'text-foreground-secondary hover:text-foreground hover:bg-foreground/5',
      },
      dramatic: {
        overlay: 'bg-gradient-to-b from-black via-black/95 to-primary/20',
        text: 'text-white',
        title: 'text-primary',
        progress: 'bg-primary/20',
        progressBar: 'bg-primary',
        button: 'text-white/70 hover:text-white hover:bg-white/10',
      },
    };

    const styles = themeStyles[theme];

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center p-6 md:p-12',
          styles.overlay,
          'transition-opacity duration-300',
          isClosing ? 'opacity-0' : 'opacity-100',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Story'}
      >
        {/* Close button (top right) */}
        {canClose && (
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              'absolute top-4 right-4 p-2 rounded-full transition-colors',
              styles.button
            )}
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}

        {/* Content container */}
        <div className="max-w-3xl w-full text-center space-y-6">
          {/* Title */}
          {title && (
            <h2
              className={cn(
                'text-sm md:text-base font-semibold uppercase tracking-widest',
                styles.title
              )}
            >
              {title}
            </h2>
          )}

          {/* Main text */}
          <div
            className={cn(
              'text-2xl md:text-4xl lg:text-5xl font-serif leading-relaxed',
              styles.text
            )}
            aria-live="polite"
          >
            {displayedText}
            {!isComplete && (
              <span
                className={cn(
                  'inline-block w-[3px] h-[1em] ml-1 animate-pulse',
                  theme === 'light' ? 'bg-primary' : 'bg-white'
                )}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Progress bar */}
          {showProgress && !isComplete && (
            <div className="w-full max-w-md mx-auto">
              <div className={cn('h-1 rounded-full overflow-hidden', styles.progress)}>
                <div
                  className={cn(
                    'h-full transition-all duration-100 ease-out',
                    styles.progressBar
                  )}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          {canSkip && !isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className={cn('gap-2', styles.button)}
            >
              <ForwardIcon className="h-4 w-4" />
              Hoppa över
            </Button>
          )}
          
          {canClose && isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className={cn('gap-2', styles.button)}
            >
              Fortsätt
            </Button>
          )}
        </div>
      </div>
    );
  }
);

StoryOverlay.displayName = 'StoryOverlay';

export default StoryOverlay;
