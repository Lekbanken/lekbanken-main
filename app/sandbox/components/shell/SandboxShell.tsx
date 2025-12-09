'use client';

import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ModuleNav } from './ModuleNav';

interface SandboxShellProps {
  children: React.ReactNode;
  controls?: React.ReactNode;
  controlsTitle?: string;
}

export function SandboxShell({ children, controls, controlsTitle = 'Controls' }: SandboxShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (left) */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-2 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <ModuleNav onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content (center) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">UI Sandbox</span>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {/* Controls panel (right) */}
      {controls && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card lg:flex">
          {controlsTitle && (
            <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
              <h2 className="text-sm font-semibold text-foreground">{controlsTitle}</h2>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">{controls}</div>
        </aside>
      )}
    </div>
  );
}
