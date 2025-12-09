'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getModuleNotes } from '../../config/module-notes';
import { getModuleById } from '../../config/sandbox-modules';
import { StatusFilterControl } from './StatusFilterControl';
import { GlobalControls } from '../controls/GlobalControls';
import { CodeBracketIcon, MapPinIcon, SwatchIcon } from '@heroicons/react/24/outline';

interface ContextPanelProps {
  moduleId: string;
  controls?: React.ReactNode;
  className?: string;
}

type TabId = 'controls' | 'notes' | 'code';

/**
 * "Where used" section showing components, routes, and tokens
 */
function WhereUsedSection({ moduleId }: { moduleId: string }) {
  const moduleInfo = getModuleById(moduleId);
  
  if (!moduleInfo) {
    return null;
  }

  const { module } = moduleInfo;
  const hasComponents = module.components && module.components.length > 0;
  const hasRoutes = module.routes && module.routes.length > 0;
  const hasTokens = module.tokens && module.tokens.length > 0;

  if (!hasComponents && !hasRoutes && !hasTokens) {
    return null;
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Var används
      </h4>

      {/* Components */}
      {hasComponents && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <CodeBracketIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Komponenter</span>
          </div>
          <ul className="space-y-1">
            {module.components!.map((component, idx) => (
              <li key={idx}>
                <code className="block truncate rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  {component}
                </code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Routes */}
      {hasRoutes && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Sidor / Routes</span>
          </div>
          <ul className="space-y-1">
            {module.routes!.map((route, idx) => (
              <li key={idx}>
                <a
                  href={route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate rounded bg-muted px-2 py-1 font-mono text-[10px] text-primary hover:bg-primary/10 hover:underline"
                >
                  {route}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tokens */}
      {hasTokens && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <SwatchIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Design Tokens</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {module.tokens!.map((token, idx) => (
              <span
                key={idx}
                className="inline-block rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ContextPanel({ moduleId, controls, className }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('controls');
  const notes = getModuleNotes(moduleId);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'controls', label: 'Controls' },
    { id: 'notes', label: 'Notes' },
    { id: 'code', label: 'Code' },
  ];

  return (
    <aside className={cn('flex h-full flex-col border-l border-border bg-card', className)}>
      {/* Tab header */}
      <div className="flex h-14 shrink-0 items-center border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'controls' && (
          <div className="space-y-6">
            {/* Global Controls - always show (viewport, theme, etc.) */}
            <GlobalControls />
            
            {/* Status filter */}
            <div className="border-t border-border pt-4">
              <StatusFilterControl />
            </div>
            
            {/* Module-specific controls */}
            {controls && (
              <div className="border-t border-border pt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Modul-inställningar
                </h4>
                {controls}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Where used section */}
            <WhereUsedSection moduleId={moduleId} />

            {/* Implementation Notes */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Implementation Notes
              </h3>
              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-relaxed">
                  {notes.notes}
                </pre>
              </div>
            </div>

            {/* Changelog */}
            {notes.changelog.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Changelog
                </h3>
                <ul className="space-y-2">
                  {notes.changelog.map((entry, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {entry.date}
                      </span>
                      <span className="text-foreground">{entry.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Usage Example
              </h3>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(notes.codeSnippet)}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
              <code>{notes.codeSnippet}</code>
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
}
