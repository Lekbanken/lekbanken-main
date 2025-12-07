'use client';

import { Button } from '@/components/ui';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

type QuickActionsBarProps = {
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onCopy?: () => void;
  onExport?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength?: number;
};

/**
 * Floating action bar with undo/redo/reset and utility buttons.
 * Shows keyboard shortcuts in tooltips.
 */
export function QuickActionsBar({
  onUndo,
  onRedo,
  onReset,
  onCopy,
  onExport,
  canUndo,
  canRedo,
}: QuickActionsBarProps) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm p-1.5">
      {/* Undo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        className="h-8 w-8 p-0"
        title="Ångra (Ctrl+Z)"
      >
        <ArrowUturnLeftIcon className="h-4 w-4" />
      </Button>

      {/* Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        className="h-8 w-8 p-0"
        title="Gör om (Ctrl+Y)"
      >
        <ArrowUturnRightIcon className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-4 w-px bg-border/50" />

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        title="Återställ till ursprungligt (Ctrl+Shift+R)"
      >
        <ArrowPathIcon className="h-4 w-4" />
      </Button>

      {onCopy && (
        <>
          <div className="mx-1 h-4 w-px bg-border/50" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-8 w-8 p-0"
            title="Kopiera konfiguration"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </Button>
        </>
      )}

      {onExport && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="h-8 w-8 p-0"
          title="Exportera JSON"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
