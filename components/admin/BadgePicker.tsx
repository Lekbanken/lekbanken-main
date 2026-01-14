'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TrophyIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button, Input } from '@/components/ui';
import { BadgePreviewEnhanced } from '@/features/admin/achievements/editor/components/BadgePreviewEnhanced';
import { extractBadgeItem } from '@/features/admin/achievements/export-utils';
import type { AchievementIconConfig, AchievementItem } from '@/features/admin/achievements/types';

export interface BadgeExportItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: AchievementIconConfig;
}

interface BadgePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (badge: BadgeExportItem) => void;
  currentBadgeId?: string | null;
}

export function BadgePicker({ open, onClose, onSelect, currentBadgeId }: BadgePickerProps) {
  const t = useTranslations('admin.gamification.achievements.badgePicker');
  const [badges, setBadges] = useState<BadgeExportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentBadgeId ?? null);

  // Load badges using the same API as the library
  useEffect(() => {
    if (!open) return;
    
    const loadBadges = async () => {
      setIsLoading(true);
      try {
        // Fetch from both global and possibly tenant scopes
        const globalRes = await fetch('/api/admin/award-builder/exports?scopeType=global');
        const globalJson = await globalRes.json().catch(() => ({}));
        
        const exports = globalJson?.exports ?? [];
        
        const allBadges: BadgeExportItem[] = [];
        for (const row of exports) {
          try {
            const item: AchievementItem = extractBadgeItem(row.id, row.export);
            allBadges.push({
              id: item.id,
              title: item.title || 'Unnamed Badge',
              subtitle: item.subtitle,
              description: item.description,
              icon: item.icon,
            });
          } catch (e) {
            // Skip invalid exports
            console.warn('Failed to parse badge export:', e);
          }
        }

        setBadges(allBadges);
      } catch (err) {
        console.error('Error loading badges:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBadges();
  }, [open]);

  // Filter badges based on search
  const filteredBadges = useMemo(() => {
    if (!search) return badges;
    const lowerSearch = search.toLowerCase();
    return badges.filter(badge => 
      badge.title.toLowerCase().includes(lowerSearch) ||
      badge.subtitle?.toLowerCase().includes(lowerSearch) ||
      badge.description?.toLowerCase().includes(lowerSearch)
    );
  }, [badges, search]);

  const handleSelect = () => {
    const selected = badges.find(b => b.id === selectedId);
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Badge Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 mt-4">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4 p-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredBadges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrophyIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? t('noSearchResults') : t('noBadges')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('createHint')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 p-1">
              {filteredBadges.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => setSelectedId(badge.id)}
                  className={`
                    relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all
                    ${selectedId === badge.id 
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                      : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
                    }
                  `}
                >
                  <div className="h-16 w-16">
                    <BadgePreviewEnhanced
                      icon={badge.icon}
                      size="sm"
                      showGlow={false}
                    />
                  </div>
                  <span className="text-xs font-medium text-center line-clamp-2">
                    {badge.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
          <p className="text-sm text-muted-foreground">
            {t('availableCount', { count: filteredBadges.length })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSelect} 
              disabled={!selectedId}
            >
              {t('select')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
