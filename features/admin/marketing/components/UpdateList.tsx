'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PencilIcon,
  TrashIcon,
  RocketLaunchIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  BugAntIcon,
  FlagIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MarketingUpdate, UpdateType } from '@/lib/marketing/types';
import { UPDATE_TYPE_OPTIONS, STATUS_OPTIONS } from '@/lib/marketing/types';

interface UpdateListProps {
  updates: MarketingUpdate[];
  onEdit: (update: MarketingUpdate) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  selectedId?: string;
  isPending?: boolean;
}

const TYPE_ICONS: Record<UpdateType, typeof SparklesIcon> = {
  feature: SparklesIcon,
  improvement: WrenchScrewdriverIcon,
  fix: BugAntIcon,
  milestone: FlagIcon,
  content: DocumentTextIcon,
};

const TYPE_COLORS: Record<UpdateType, string> = {
  feature: 'bg-primary/10 text-primary',
  improvement: 'bg-blue-500/10 text-blue-600',
  fix: 'bg-red-500/10 text-red-600',
  milestone: 'bg-amber-500/10 text-amber-600',
  content: 'bg-green-500/10 text-green-600',
};

export function UpdateList({ updates, onEdit, onDelete, onPublish, selectedId, isPending }: UpdateListProps) {
  const t = useTranslations('admin.nav.marketingAdmin');
  const tNav = useTranslations('admin.nav');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = updates.filter(u => {
    const matchesSearch = !search || 
      u.title.toLowerCase().includes(search.toLowerCase()) ||
      u.body?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesType = typeFilter === 'all' || u.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'secondary' => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{tNav('marketingUpdates')} ({filtered.length})</CardTitle>
        </div>
        <div className="flex gap-2 mt-3">
          <Input
            placeholder={t('searchUpdates')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Alla typer</option>
            {UPDATE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Alla status</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Inga uppdateringar matchar filtret'
              : 'Inga uppdateringar än. Skapa en ny!'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((update) => {
              const Icon = TYPE_ICONS[update.type] || SparklesIcon;
              const colorClass = TYPE_COLORS[update.type] || TYPE_COLORS.feature;

              return (
                <div
                  key={update.id}
                  className={cn(
                    'flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer',
                    selectedId === update.id && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                  onClick={() => onEdit(update)}
                >
                  {/* Icon */}
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0', colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground truncate">{update.title}</h4>
                      <Badge variant={getStatusVariant(update.status)} size="sm">
                        {STATUS_OPTIONS.find(o => o.value === update.status)?.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" size="sm">
                        {UPDATE_TYPE_OPTIONS.find(o => o.value === update.type)?.label}
                      </Badge>
                      {update.publishedAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(update.publishedAt)}
                        </span>
                      )}
                    </div>
                    {update.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{update.body}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {update.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPublish(update.id);
                        }}
                        disabled={isPending}
                        title="Publicera"
                      >
                        <RocketLaunchIcon className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(update);
                      }}
                      disabled={isPending}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Ta bort "${update.title}"?`)) {
                          onDelete(update.id);
                        }
                      }}
                      disabled={isPending}
                      className="p-1.5 text-destructive hover:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
