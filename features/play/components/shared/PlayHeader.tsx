'use client';

import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getPlayModeUI } from '@/lib/play-modes';
import type { PlayMode } from '@/features/admin/games/v2/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlayHeaderProps {
  title: string;
  playMode: PlayMode | null;
  sessionCode?: string;
  onBack?: () => void;
  timer?: {
    elapsedSeconds: number;
    isRunning: boolean;
  };
  rightContent?: React.ReactNode;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PlayHeader({
  title,
  playMode,
  sessionCode,
  onBack,
  timer,
  rightContent,
  className,
}: PlayHeaderProps) {
  const modeConfig = getPlayModeUI(playMode);
  const Icon = modeConfig.icon;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header
      className={cn(
        'flex items-center gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm',
        className
      )}
    >
      {/* Back button */}
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="shrink-0 px-2"
          aria-label="Tillbaka"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
      )}

      {/* Title and mode badge */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="truncate text-lg font-semibold text-foreground">{title}</h1>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-xs',
              modeConfig.bgClass,
              modeConfig.textClass,
              modeConfig.borderClass
            )}
          >
            <Icon className="h-3 w-3" />
            {modeConfig.labelShort}
          </Badge>
          {sessionCode && (
            <span className="font-mono text-xs text-muted-foreground">
              {sessionCode}
            </span>
          )}
        </div>
      </div>

      {/* Timer (if provided) */}
      {timer && (
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-medium',
            timer.isRunning
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <ClockIcon className="h-4 w-4" />
          {formatTime(timer.elapsedSeconds)}
        </div>
      )}

      {/* Custom right content */}
      {rightContent}
    </header>
  );
}
