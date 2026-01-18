/**
 * ShortcutHelpPanel Component
 * 
 * Modal/panel showing all available keyboard shortcuts for Director Mode.
 * Organized by category for easy reference.
 * 
 * Backlog B.2: Keyboard shortcuts for Director Mode
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CommandLineIcon,
  ArrowRightIcon,
  PlayIcon,
  BoltIcon,
  RadioIcon,
  EyeIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import type {
  DirectorShortcut,
  ShortcutCategory,
} from '@/features/play/hooks/useDirectorShortcuts';
import { SHORTCUT_CATEGORY_LABELS } from '@/features/play/hooks/useDirectorShortcuts';

// =============================================================================
// Types
// =============================================================================

export interface ShortcutHelpPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** All available shortcuts */
  shortcuts: DirectorShortcut[];
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_ICONS: Record<ShortcutCategory, React.ReactNode> = {
  navigation: <ArrowRightIcon className="h-4 w-4" />,
  playback: <PlayIcon className="h-4 w-4" />,
  triggers: <BoltIcon className="h-4 w-4" />,
  signals: <RadioIcon className="h-4 w-4" />,
  artifacts: <EyeIcon className="h-4 w-4" />,
  view: <EyeIcon className="h-4 w-4" />,
  system: <CogIcon className="h-4 w-4" />,
};

const CATEGORY_ORDER: ShortcutCategory[] = [
  'navigation',
  'playback',
  'triggers',
  'signals',
  'artifacts',
  'view',
  'system',
];

// =============================================================================
// Helper: Format shortcut key display
// =============================================================================

function formatKey(
  shortcut: DirectorShortcut,
  t: ReturnType<typeof useTranslations<'play.shortcutHelpPanel'>>
): React.ReactNode {
  const parts: React.ReactNode[] = [];
  
  if (shortcut.modifiers.ctrl) {
    parts.push(
      <kbd key="ctrl" className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
        {t('keys.ctrl')}
      </kbd>
    );
  }
  if (shortcut.modifiers.alt) {
    parts.push(
      <kbd key="alt" className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
        {t('keys.alt')}
      </kbd>
    );
  }
  if (shortcut.modifiers.shift) {
    parts.push(
      <kbd key="shift" className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
        {t('keys.shift')}
      </kbd>
    );
  }
  if (shortcut.modifiers.meta) {
    parts.push(
      <kbd key="meta" className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
        {t('keys.meta')}
      </kbd>
    );
  }
  
  // Format the key nicely
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'ArrowRight') keyDisplay = '→';
  else if (keyDisplay === 'ArrowLeft') keyDisplay = '←';
  else if (keyDisplay === 'ArrowUp') keyDisplay = '↑';
  else if (keyDisplay === 'ArrowDown') keyDisplay = '↓';
  else if (keyDisplay === 'Space') keyDisplay = t('keys.space');
  else if (keyDisplay === 'Escape') keyDisplay = t('keys.escape');
  else if (keyDisplay === 'Enter') keyDisplay = t('keys.enter');
  
  parts.push(
    <kbd key="key" className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
      {keyDisplay}
    </kbd>
  );
  
  return (
    <div className="flex items-center gap-1">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground text-xs">{t('keys.plus')}</span>}
          {part}
        </React.Fragment>
      ))}
    </div>
  );
}

// =============================================================================
// Sub-Component: ShortcutRow
// =============================================================================

interface ShortcutRowProps {
  shortcut: DirectorShortcut;
  t: ReturnType<typeof useTranslations<'play.shortcutHelpPanel'>>;
}

function ShortcutRow({ shortcut, t }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded">
      <span className="text-sm">{t(`actions.${shortcut.descriptionKey}` as Parameters<typeof t>[0])}</span>
      {formatKey(shortcut, t)}
    </div>
  );
}

// =============================================================================
// Sub-Component: CategorySection
// =============================================================================

interface CategorySectionProps {
  category: ShortcutCategory;
  shortcuts: DirectorShortcut[];
  t: ReturnType<typeof useTranslations<'play.shortcutHelpPanel'>>;
}

function CategorySection({ category, shortcuts, t }: CategorySectionProps) {
  if (shortcuts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {CATEGORY_ICONS[category]}
        {t(`categories.${SHORTCUT_CATEGORY_LABELS[category]}` as Parameters<typeof t>[0])}
        <Badge variant="default" className="text-xs">
          {shortcuts.length}
        </Badge>
      </div>
      <div className="border rounded-lg divide-y">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.action} shortcut={shortcut} t={t} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ShortcutHelpPanel({
  open,
  onOpenChange,
  shortcuts,
  className,
}: ShortcutHelpPanelProps) {
  const t = useTranslations('play.shortcutHelpPanel');
  
  // Group shortcuts by category
  const groupedShortcuts = CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = shortcuts.filter((s) => s.category === category);
      return acc;
    },
    {} as Record<ShortcutCategory, DirectorShortcut[]>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CommandLineIcon className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea maxHeight="60vh" className="pr-4">
          <div className="space-y-6">
            {CATEGORY_ORDER.map((category) => (
              <CategorySection
                key={category}
                category={category}
                shortcuts={groupedShortcuts[category]}
                t={t}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {t('pressToShow')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// KeyboardShortcutIndicator - For inline display on buttons
// =============================================================================

export interface KeyboardShortcutIndicatorProps {
  /** The keyboard shortcut to display */
  shortcut: DirectorShortcut;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional className */
  className?: string;
}

export function KeyboardShortcutIndicator({
  shortcut,
  size = 'sm',
  className,
}: KeyboardShortcutIndicatorProps) {
  const parts: string[] = [];
  
  if (shortcut.modifiers.ctrl) parts.push('⌃');
  if (shortcut.modifiers.alt) parts.push('⌥');
  if (shortcut.modifiers.shift) parts.push('⇧');
  if (shortcut.modifiers.meta) parts.push('⌘');
  
  // Format the key
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'ArrowRight') keyDisplay = '→';
  else if (keyDisplay === 'ArrowLeft') keyDisplay = '←';
  else if (keyDisplay === 'ArrowUp') keyDisplay = '↑';
  else if (keyDisplay === 'ArrowDown') keyDisplay = '↓';
  else if (keyDisplay === 'Space') keyDisplay = '␣';
  else if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  else if (keyDisplay === 'Enter') keyDisplay = '↵';
  
  parts.push(keyDisplay);
  
  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1 py-0.5' 
    : 'text-xs px-1.5 py-0.5';
  
  return (
    <span
      className={`
        inline-flex items-center font-mono bg-muted text-muted-foreground rounded
        ${sizeClasses}
        ${className}
      `}
    >
      {parts.join('')}
    </span>
  );
}
