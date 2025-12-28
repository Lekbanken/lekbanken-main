'use client';

import { useState, useRef, useCallback, useEffect, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/solid';
import type { AudioConfig, AudioState } from '@/types/puzzle-modules';

// =============================================================================
// Audio Player Component
// =============================================================================

export interface AudioPlayerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onError' | 'onProgress'> {
  /** Audio source URL */
  src: string;
  /** Audio configuration */
  config?: Partial<AudioConfig>;
  /** Current state (for controlled mode) */
  state?: AudioState;
  /** Called when audio starts playing */
  onPlay?: () => void;
  /** Called when audio is paused */
  onPause?: () => void;
  /** Called when audio finishes */
  onEnded?: () => void;
  /** Called when user acknowledges */
  onAcknowledge?: () => void;
  /** Called on playback progress */
  onProgress?: (position: number, duration: number) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Title to display */
  title?: string;
}

/**
 * AudioPlayer - Audio playback with optional acknowledgment gate
 * 
 * Mobile-first with large touch targets and transcript support
 */
export function AudioPlayer({
  src,
  config = {},
  state: externalState,
  onPlay,
  onPause,
  onEnded,
  onAcknowledge,
  onProgress,
  onError,
  disabled = false,
  size = 'md',
  title,
  className,
  ...props
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Internal state
  const [internalState, setInternalState] = useState<AudioState>({
    isPlaying: false,
    hasPlayed: false,
    hasAcknowledged: false,
  });
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use external state if provided
  const state = externalState ?? internalState;
  const updateState = useCallback((updates: Partial<AudioState>) => {
    if (!externalState) {
      setInternalState(prev => ({ ...prev, ...updates }));
    }
  }, [externalState]);

  // Destructure config with defaults
  const {
    requireAck = false,
    ackButtonText = 'Jag har lyssnat',
    showTranscript: showTranscriptToggle = false,
    transcriptText,
    autoPlay = false,
    loop = false,
    requireHeadphones = false,
  } = config;

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && audioRef.current && !disabled) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked - common on mobile
      });
    }
  }, [autoPlay, disabled]);

  const handlePlay = useCallback(() => {
    if (audioRef.current && !disabled) {
      audioRef.current.play()
        .then(() => {
          updateState({ isPlaying: true, hasPlayed: true });
          onPlay?.();
        })
        .catch((err) => {
          const errorMsg = err instanceof Error ? err.message : 'Could not play audio';
          setError(errorMsg);
          onError?.(errorMsg);
        });
    }
  }, [disabled, onPlay, onError, updateState]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      updateState({ isPlaying: false });
      onPause?.();
    }
  }, [onPause, updateState]);

  const handleTogglePlay = useCallback(() => {
    if (state.isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [state.isPlaying, handlePlay, handlePause]);

  const handleEnded = useCallback(() => {
    updateState({ isPlaying: false });
    onEnded?.();
  }, [onEnded, updateState]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      onProgress?.(audioRef.current.currentTime, audioRef.current.duration);
      updateState({
        playbackPosition: audioRef.current.currentTime,
        duration: audioRef.current.duration,
      });
    }
  }, [onProgress, updateState]);

  const handleAcknowledge = useCallback(() => {
    updateState({ hasAcknowledged: true });
    onAcknowledge?.();
  }, [onAcknowledge, updateState]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = state.duration 
    ? ((state.playbackPosition ?? 0) / state.duration) * 100 
    : 0;

  const sizeStyles = {
    sm: { icon: 'h-8 w-8', button: 'h-12 w-12', text: 'text-sm' },
    md: { icon: 'h-10 w-10', button: 'h-16 w-16', text: 'text-base' },
    lg: { icon: 'h-12 w-12', button: 'h-20 w-20', text: 'text-lg' },
  };

  const styles = sizeStyles[size];

  // Acknowledged state
  if (state.hasAcknowledged) {
    return (
      <div className={cn('flex flex-col items-center gap-3 p-4', className)} {...props}>
        <CheckCircleIcon className="h-12 w-12 text-green-500" />
        <p className="text-sm text-muted-foreground">Bekräftat</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4 p-4', className)} {...props}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        loop={loop}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          setError('Kunde inte ladda ljudfilen');
          onError?.('Kunde inte ladda ljudfilen');
        }}
      />

      {/* Headphones warning */}
      {requireHeadphones && !state.hasPlayed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
          <SpeakerWaveIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-300">
            Hörlurar rekommenderas för bästa upplevelse
          </span>
        </div>
      )}

      {/* Title */}
      {title && (
        <h3 className={cn('font-medium text-center', styles.text)}>
          {title}
        </h3>
      )}

      {/* Play/Pause button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleTogglePlay}
          disabled={disabled || !!error}
          className={cn(
            'rounded-full flex items-center justify-center',
            'bg-primary text-primary-foreground',
            'transition-transform hover:scale-105 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            styles.button
          )}
          aria-label={state.isPlaying ? 'Pausa' : 'Spela'}
        >
          {state.isPlaying ? (
            <PauseIcon className={styles.icon} />
          ) : (
            <PlayIcon className={cn(styles.icon, 'ml-1')} />
          )}
        </button>
      </div>

      {/* Progress bar */}
      {state.hasPlayed && (
        <div className="space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(state.playbackPosition ?? 0)}</span>
            <span>{formatTime(state.duration ?? 0)}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Transcript toggle */}
      {showTranscriptToggle && transcriptText && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <DocumentTextIcon className="h-4 w-4" />
            {showTranscript ? 'Dölj transkript' : 'Visa transkript'}
          </button>
          
          {showTranscript && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm leading-relaxed">
              {transcriptText}
            </div>
          )}
        </div>
      )}

      {/* Acknowledge button */}
      {requireAck && state.hasPlayed && (
        <Button
          onClick={handleAcknowledge}
          disabled={disabled}
          className="w-full"
          size={size === 'lg' ? 'lg' : 'sm'}
        >
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          {ackButtonText}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Hook for Audio State Management
// =============================================================================

export interface UseAudioOptions {
  src: string;
  autoPlay?: boolean;
  loop?: boolean;
  onEnded?: () => void;
}

export interface UseAudioReturn {
  state: AudioState;
  play: () => Promise<void>;
  pause: () => void;
  seek: (position: number) => void;
  acknowledge: () => void;
  reset: () => void;
}
