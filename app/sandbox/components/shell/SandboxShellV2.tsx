'use client';

import { useState } from 'react';
import { Bars3Icon, XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ModuleNav } from './ModuleNavV2';
import { ContextPanel } from './ContextPanel';
import { ViewportFrame } from './ViewportFrame';
import { SandboxThemeProvider } from './SandboxThemeProvider';

interface SandboxShellProps {
  children: React.ReactNode;
  moduleId: string;
  controls?: React.ReactNode;
  title?: string;
  description?: string;
}

export function SandboxShell({
  children,
  moduleId,
  controls,
  title,
  description,
}: SandboxShellProps) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <SandboxThemeProvider>
      <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Mobile left sidebar backdrop */}
      {leftOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setLeftOpen(false)}
        />
      )}

      {/* Mobile right panel backdrop */}
      {rightOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setRightOpen(false)}
        />
      )}

      {/* Left sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:relative lg:translate-x-0',
          leftOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setLeftOpen(false)}
          className="absolute right-2 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <ModuleNav onNavigate={() => setLeftOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setLeftOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">{title || 'Sandbox'}</span>
          <button
            type="button"
            onClick={() => setRightOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop header (optional breadcrumb) */}
        {(title || description) && (
          <header className="hidden shrink-0 border-b border-border bg-card px-6 py-4 lg:block">
            {title && <h1 className="text-xl font-bold text-foreground">{title}</h1>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </header>
        )}

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          <ViewportFrame>
            <div className="mx-auto max-w-5xl">{children}</div>
          </ViewportFrame>
        </main>
      </div>

      {/* Right context panel - Desktop */}
      <div className="hidden w-80 shrink-0 lg:block">
        <ContextPanel moduleId={moduleId} controls={controls} />
      </div>

      {/* Right context panel - Mobile (slide-in) */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-80 transform transition-transform duration-200 lg:hidden',
          rightOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <button
          type="button"
          onClick={() => setRightOpen(false)}
          className="absolute left-2 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <ContextPanel moduleId={moduleId} controls={controls} />
      </div>
    </div>
    </SandboxThemeProvider>
  );
}
