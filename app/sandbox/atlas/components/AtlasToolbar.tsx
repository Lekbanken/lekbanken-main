'use client';

import { useMemo, type RefObject } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AtlasMode } from '../types';

interface AtlasToolbarProps {
  mode: AtlasMode;
  onModeChange: (mode: AtlasMode) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSync: () => void;
  lastSystemSyncAt: string | null;
  helpOpen: boolean;
  onHelpOpenChange: (open: boolean) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const modeOptions: { id: AtlasMode; label: string; description: string }[] = [
  { id: 'ux', label: 'UX', description: 'Frames and components' },
  { id: 'data', label: 'Data', description: 'Frames, endpoints, tables' },
  { id: 'quality', label: 'Quality', description: 'Frame review status' },
];

export function AtlasToolbar({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  onSync,
  lastSystemSyncAt,
  helpOpen,
  onHelpOpenChange,
  searchInputRef,
}: AtlasToolbarProps) {
  const lastSyncLabel = useMemo(() => {
    if (!lastSystemSyncAt) return 'Never';
    return new Date(lastSystemSyncAt).toLocaleString();
  }, [lastSystemSyncAt]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
          {modeOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={mode === option.id ? 'primary' : 'outline'}
              onClick={() => onModeChange(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="min-w-[220px] flex-1">
          <Input
            ref={searchInputRef}
            placeholder="Search nodes or routes"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs text-muted-foreground">
          <div className="font-medium text-foreground">System sync</div>
          <div>{lastSyncLabel}</div>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={onSync}>
          <ArrowPathIcon className="h-4 w-4" />
          Sync map
        </Button>

        <Popover open={helpOpen} onOpenChange={onHelpOpenChange}>
          <PopoverTrigger className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted">
            <QuestionMarkCircleIcon className="h-4 w-4" />
            Legend
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-4 text-xs">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Modes</h4>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {modeOptions.map((option) => (
                  <li key={option.id}>
                    <span className="font-semibold text-foreground">{option.label}:</span>{' '}
                    {option.description}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Relations</h4>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">uses</span>: frame uses a component
                </li>
                <li>
                  <span className="font-semibold text-foreground">reads / writes</span>: data access
                </li>
                <li>
                  <span className="font-semibold text-foreground">calls</span>: endpoint invocation
                </li>
                <li>
                  <span className="font-semibold text-foreground">navigates</span>: screen transition
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Shortcuts</h4>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">/</span>: focus search
                </li>
                <li>
                  <span className="font-semibold text-foreground">Esc</span>: clear selection
                </li>
                <li>
                  <span className="font-semibold text-foreground">?</span>: toggle this panel
                </li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
