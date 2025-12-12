'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  MagnifyingGlassIcon,
  HomeIcon,
  UsersIcon,
  BuildingOffice2Icon,
  CubeIcon,
  SparklesIcon,
  CogIcon,
  ChartBarIcon,
  UserPlusIcon,
  PlusIcon,
  ArrowRightIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group: 'navigation' | 'actions' | 'search' | 'recent';
  requiredPermission?: string;
}

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCommandPalette({ open, onOpenChange }: AdminCommandPaletteProps) {
  const router = useRouter();
  const { can, isSystemAdmin } = useRbac();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Build command list based on permissions
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Navigation commands
    items.push({
      id: 'go-dashboard',
      label: 'Gå till Dashboard',
      description: 'Öppna admin-översikten',
      icon: <HomeIcon className="h-5 w-5" />,
      action: () => router.push('/admin'),
      keywords: ['home', 'start', 'översikt', 'dashboard'],
      group: 'navigation',
    });

    if (can('admin.users.list')) {
      items.push({
        id: 'go-users',
        label: 'Gå till Användare',
        description: 'Hantera användare och roller',
        icon: <UsersIcon className="h-5 w-5" />,
        action: () => router.push('/admin/users'),
        keywords: ['users', 'användare', 'members', 'medlemmar'],
        group: 'navigation',
      });
    }

    if (can('admin.tenants.list')) {
      items.push({
        id: 'go-organisations',
        label: 'Gå till Organisationer',
        description: 'Hantera hyresgäster och konton',
        icon: <BuildingOffice2Icon className="h-5 w-5" />,
        action: () => router.push('/admin/organisations'),
        keywords: ['orgs', 'tenants', 'organisationer', 'konton'],
        group: 'navigation',
      });
    }

    if (can('admin.products.list')) {
      items.push({
        id: 'go-products',
        label: 'Gå till Produkter',
        description: 'Konfigurera produkter och moduler',
        icon: <CubeIcon className="h-5 w-5" />,
        action: () => router.push('/admin/products'),
        keywords: ['products', 'produkter', 'modules', 'moduler'],
        group: 'navigation',
      });
    }

    if (can('admin.achievements.list')) {
      items.push({
        id: 'go-achievements',
        label: 'Gå till Achievements',
        description: 'Hantera badges och belöningar',
        icon: <SparklesIcon className="h-5 w-5" />,
        action: () => router.push('/admin/achievements'),
        keywords: ['achievements', 'badges', 'rewards', 'belöningar'],
        group: 'navigation',
      });
    }

    if (isSystemAdmin) {
      items.push({
        id: 'go-analytics',
        label: 'Gå till Analys',
        description: 'Visa statistik och rapporter',
        icon: <ChartBarIcon className="h-5 w-5" />,
        action: () => router.push('/admin/analytics'),
        keywords: ['analytics', 'stats', 'statistik', 'rapporter'],
        group: 'navigation',
      });

      items.push({
        id: 'go-settings',
        label: 'Gå till Inställningar',
        description: 'Systemkonfiguration',
        icon: <CogIcon className="h-5 w-5" />,
        action: () => router.push('/admin/settings'),
        keywords: ['settings', 'inställningar', 'config', 'konfiguration'],
        group: 'navigation',
      });
    }

    // Action commands
    if (can('admin.users.create')) {
      items.push({
        id: 'invite-user',
        label: 'Bjud in användare',
        description: 'Skicka inbjudan till ny användare',
        icon: <UserPlusIcon className="h-5 w-5" />,
        action: () => {
          router.push('/admin/users?action=invite');
        },
        keywords: ['invite', 'bjud in', 'ny användare', 'create user'],
        group: 'actions',
      });
    }

    if (can('admin.tenants.create')) {
      items.push({
        id: 'create-organisation',
        label: 'Skapa organisation',
        description: 'Lägg till ny hyresgäst',
        icon: <PlusIcon className="h-5 w-5" />,
        action: () => {
          router.push('/admin/organisations?action=create');
        },
        keywords: ['create', 'skapa', 'ny organisation', 'new tenant'],
        group: 'actions',
      });
    }

    if (can('admin.achievements.create')) {
      items.push({
        id: 'create-achievement',
        label: 'Skapa achievement',
        description: 'Designa ny badge',
        icon: <SparklesIcon className="h-5 w-5" />,
        action: () => {
          router.push('/admin/achievements?action=create');
        },
        keywords: ['create', 'skapa', 'ny badge', 'new achievement'],
        group: 'actions',
      });
    }

    return items;
  }, [can, isSystemAdmin, router]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const q = query.toLowerCase();
    return commands.filter((cmd) => {
      const searchableText = [
        cmd.label,
        cmd.description ?? '',
        ...(cmd.keywords ?? []),
      ].join(' ').toLowerCase();
      return searchableText.includes(q);
    });
  }, [commands, query]);

  // Group filtered commands
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      search: [],
      recent: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.group].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    return [
      ...groupedCommands.navigation,
      ...groupedCommands.actions,
      ...groupedCommands.search,
      ...groupedCommands.recent,
    ];
  }, [groupedCommands]);

  // Reset state when dialog opens/closes
  const wrappedOnOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Delay reset to avoid flash
      setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
      }, 200);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    onOpenChange(false);
    // Small delay to allow dialog to close smoothly
    setTimeout(() => {
      cmd.action();
    }, 100);
  }, [onOpenChange]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatList[selectedIndex]) {
          executeCommand(flatList[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [flatList, selectedIndex, executeCommand, onOpenChange]);

  const groupLabels: Record<string, string> = {
    navigation: 'Navigera',
    actions: 'Snabbåtgärder',
    search: 'Sök',
    recent: 'Senaste',
  };

  return (
    <Dialog open={open} onOpenChange={wrappedOnOpenChange}>
      <DialogContent 
        className="max-w-xl p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="Sök kommandon..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {flatList.length === 0 ? (
            <div className="py-12 text-center">
              <CommandLineIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                Inga kommandon hittades för &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <>
              {(['navigation', 'actions', 'search', 'recent'] as const).map((group) => {
                const items = groupedCommands[group];
                if (items.length === 0) return null;

                return (
                  <Fragment key={group}>
                    <div className="px-2 py-1.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {groupLabels[group]}
                      </span>
                    </div>
                    {items.map((cmd) => {
                      const index = flatList.indexOf(cmd);
                      const isSelected = index === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`
                            flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors
                            ${isSelected 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-foreground hover:bg-muted'
                            }
                          `}
                        >
                          <span className={`shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                            {cmd.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{cmd.label}</p>
                            {cmd.description && (
                              <p className={`text-xs truncate ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                                {cmd.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRightIcon className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↓</kbd>
              navigera
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↵</kbd>
              välj
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">⌘</kbd>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">K</kbd>
            öppna/stäng
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage command palette state with global keyboard shortcut
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}
