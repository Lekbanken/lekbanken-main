'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  GiftIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Textarea } from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AchievementRow, TenantOption, UserSearchResult } from '@/app/actions/achievements-admin';
import {
  awardAchievement,
  getTenantUserIds,
  searchUsersForAward,
} from '@/app/actions/achievements-admin';

interface AwardAchievementModalProps {
  open: boolean;
  achievement: AchievementRow;
  tenants: TenantOption[];
  onClose: () => void;
  onComplete: (inserted: number, duplicates: number) => void;
}

type AwardMode = 'tenant' | 'users';

export function AwardAchievementModal({
  open,
  achievement,
  tenants,
  onClose,
  onComplete,
}: AwardAchievementModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // Mode
  const [mode, setMode] = useState<AwardMode>('tenant');
  
  // Tenant mode
  const [selectedTenant, setSelectedTenant] = useState('');
  
  // Users mode
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  
  // Message
  const [message, setMessage] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMode('tenant');
      setSelectedTenant('');
      setUserSearch('');
      setSearchResults([]);
      setSelectedUsers([]);
      setMessage('');
      setError(null);
    }
  }, [open]);

  // User search with debounce
  useEffect(() => {
    if (mode !== 'users' || userSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsersForAward(userSearch);
        // Filter out already selected users
        const selectedIds = new Set(selectedUsers.map(u => u.id));
        setSearchResults(results.filter((u: UserSearchResult) => !selectedIds.has(u.id)));
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch, mode, selectedUsers]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearch('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter(u => u.id !== userId));
  };

  const handleSubmit = async () => {
    setError(null);

    let userIds: string[] = [];

    if (mode === 'tenant') {
      if (!selectedTenant) {
        setError('Välj en organisation');
        return;
      }

      // Fetch all user IDs for the tenant
      const result = await getTenantUserIds(selectedTenant);
      if (!result.success || !result.userIds) {
        setError(result.error || 'Kunde inte hämta användare');
        return;
      }
      userIds = result.userIds;

      if (userIds.length === 0) {
        setError('Inga användare hittades i denna organisation');
        return;
      }
    } else {
      if (selectedUsers.length === 0) {
        setError('Välj minst en användare');
        return;
      }
      userIds = selectedUsers.map(u => u.id);
    }

    startTransition(async () => {
      try {
        const result = await awardAchievement({
          achievementId: achievement.id,
          userIds,
          message: message || undefined,
        });

        if (result.success) {
          onComplete(result.insertedCount ?? 0, result.duplicateCount ?? 0);
        } else {
          setError(result.error || 'Kunde inte tilldela achievement');
        }
      } catch (err) {
        setError('Ett oväntat fel uppstod');
        console.error(err);
      }
    });
  };

  const selectedTenantName = tenants.find(t => t.id === selectedTenant)?.name;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-primary" />
            Tilldela achievement
          </DialogTitle>
          <DialogDescription>
            Tilldela &quot;{achievement.name}&quot; till användare.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('tenant')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                mode === 'tenant'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <BuildingOfficeIcon className="h-4 w-4" />
              Hel organisation
            </button>
            <button
              type="button"
              onClick={() => setMode('users')}
              className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                mode === 'users'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <UserGroupIcon className="h-4 w-4" />
              Specifika användare
            </button>
          </div>

          {/* Tenant Mode */}
          {mode === 'tenant' && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Organisation</Label>
              <select
                id="tenant"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Välj organisation...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              {selectedTenantName && (
                <p className="text-sm text-muted-foreground">
                  Alla användare i {selectedTenantName} kommer att få detta achievement.
                </p>
              )}
            </div>
          )}

          {/* Users Mode */}
          {mode === 'users' && (
            <div className="space-y-3">
              <Label>Sök användare</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Sök på namn eller e-post..."
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-background">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.full_name || 'Ingen namn'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {isSearching && (
                <p className="text-sm text-muted-foreground">Söker...</p>
              )}

              {userSearch.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className="text-sm text-muted-foreground">Inga användare hittades</p>
              )}

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Valda användare ({selectedUsers.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                      >
                        {user.full_name || user.email}
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(user.id)}
                          className="ml-1 rounded-full hover:bg-primary/20"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Meddelande (valfritt)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="T.ex. 'Grattis till avslutad kurs!'"
              rows={2}
            />
            <p className="text-sm text-muted-foreground">
              Detta meddelande kommer att visas för användaren när de får sitt achievement.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              (mode === 'tenant' && !selectedTenant) ||
              (mode === 'users' && selectedUsers.length === 0)
            }
          >
            {isPending ? 'Tilldelar...' : 'Tilldela'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
