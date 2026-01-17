'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ComputerDesktopIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BoardToggleProps {
  sessionCode: string;
  boardUrl?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BoardToggle({
  sessionCode,
  boardUrl,
  disabled = false,
  className,
}: BoardToggleProps) {
  const t = useTranslations('play.boardToggle');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Generate board URL if not provided
  const url = boardUrl ?? `/play/board/${sessionCode}`;

  const handleOpenInNewWindow = () => {
    window.open(url, '_blank', 'width=1920,height=1080');
    setIsDialogOpen(false);
  };

  const handleOpenFullscreen = () => {
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.addEventListener('load', () => {
        newWindow.document.documentElement.requestFullscreen?.();
      });
    }
    setIsDialogOpen(false);
  };

  const handleCopyUrl = async () => {
    const fullUrl = window.location.origin + url;
    await navigator.clipboard.writeText(fullUrl);
    // Could add toast notification here
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('gap-2', className)}
        >
          <ComputerDesktopIcon className="h-5 w-5" />
          {t('showOnScreen')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ComputerDesktopIcon className="h-5 w-5 text-primary" />
            {t('publicBoard')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Session code display */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('sessionCode')}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-foreground tracking-wider">
              {sessionCode}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid gap-2">
            <Button
              variant="primary"
              onClick={handleOpenInNewWindow}
              className="gap-2"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              {t('openNewWindow')}
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenFullscreen}
              className="gap-2"
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              {t('openFullscreen')}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCopyUrl}
              className="gap-2"
            >
              {t('copyLink')}
            </Button>
          </div>

          {/* Instructions */}
          <p className="text-xs text-muted-foreground text-center">
            {t('instruction')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
