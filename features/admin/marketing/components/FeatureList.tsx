'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  PencilIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { MarketingFeature } from '@/lib/marketing/types';
import { AUDIENCE_OPTIONS, USE_CASE_OPTIONS, STATUS_OPTIONS } from '@/lib/marketing/types';

interface FeatureListProps {
  features: MarketingFeature[];
  onEdit: (feature: MarketingFeature) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
  isPending?: boolean;
}

export function FeatureList({ features, onEdit, onDelete, selectedId, isPending }: FeatureListProps) {
  const t = useTranslations('admin.nav.marketingAdmin');
  const tNav = useTranslations('admin.nav');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = features.filter(f => {
    const matchesSearch = !search || 
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.subtitle?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'secondary' => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };

  const getAudienceLabel = (audience: string) => 
    AUDIENCE_OPTIONS.find(o => o.value === audience)?.label || audience;
  
  const getUseCaseLabel = (useCase: string) =>
    USE_CASE_OPTIONS.find(o => o.value === useCase)?.label || useCase;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{tNav('marketingFeatures')} ({filtered.length})</CardTitle>
        </div>
        <div className="flex gap-2 mt-3">
          <Input
            placeholder={t('searchFeatures')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
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
            {search || statusFilter !== 'all' 
              ? 'Inga funktioner matchar filtret'
              : 'Inga funktioner än. Skapa en ny!'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((feature) => (
              <div
                key={feature.id}
                className={cn(
                  'flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer',
                  selectedId === feature.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}
                onClick={() => onEdit(feature)}
              >
                {/* Icon placeholder */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  {feature.isFeatured ? (
                    <StarIconSolid className="h-5 w-5" />
                  ) : (
                    <StarIcon className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground truncate">{feature.title}</h4>
                    <Badge variant={getStatusVariant(feature.status)} size="sm">
                      {STATUS_OPTIONS.find(o => o.value === feature.status)?.label}
                    </Badge>
                    {feature.isFeatured && (
                      <Badge variant="default" size="sm">Utvald</Badge>
                    )}
                  </div>
                  {feature.subtitle && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{feature.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" size="sm">{getAudienceLabel(feature.audience)}</Badge>
                    <Badge variant="outline" size="sm">{getUseCaseLabel(feature.useCase)}</Badge>
                    {feature.relatedGamesCount > 0 && (
                      <Badge variant="secondary" size="sm">~{feature.relatedGamesCount} lekar</Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(feature);
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
                      if (confirm(`Ta bort "${feature.title}"?`)) {
                        onDelete(feature.id);
                      }
                    }}
                    disabled={isPending}
                    className="p-1.5 text-destructive hover:text-destructive"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
