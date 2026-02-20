'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  SparklesIcon,
  WrenchScrewdriverIcon,
  BugAntIcon,
  FlagIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchPublishedUpdatesAction } from './actions';
import type { MarketingUpdate, UpdateType } from '@/lib/marketing/types';

// =============================================================================
// Type Icons & Colors
// =============================================================================

function getTypeConfig(type: UpdateType, t: ReturnType<typeof useTranslations<'marketing'>>) {
  const configs: Record<UpdateType, { icon: typeof SparklesIcon; color: string }> = {
    feature: {
      icon: SparklesIcon,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    improvement: {
      icon: WrenchScrewdriverIcon,
      color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800',
    },
    fix: {
      icon: BugAntIcon,
      color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800',
    },
    milestone: {
      icon: FlagIcon,
      color: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-800',
    },
    content: {
      icon: DocumentTextIcon,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800',
    },
  };
  
  return {
    ...configs[type],
    label: t(`features.activity.types.${type}`),
  };
}

// =============================================================================
// Update Card Component
// =============================================================================

interface UpdateCardProps {
  update: MarketingUpdate;
  t: ReturnType<typeof useTranslations<'marketing'>>;
}

function UpdateCard({ update, t }: UpdateCardProps) {
  const config = getTypeConfig(update.type, t);
  const Icon = config.icon;
  
  const publishedDate = update.publishedAt ? new Date(update.publishedAt) : null;
  const formattedDate = publishedDate 
    ? new Intl.DateTimeFormat('sv-SE', { 
        day: 'numeric', 
        month: 'short',
        year: publishedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      }).format(publishedDate)
    : null;

  return (
    <div className="group relative flex gap-4 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-10 h-full w-px bg-border group-last:hidden" />
      
      {/* Icon */}
      <div className={cn(
        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
        config.color
      )}>
        <Icon className="h-5 w-5" />
      </div>
      
      {/* Content */}
      <div className="flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="outline" className={cn('text-xs font-medium', config.color)}>
            {config.label}
          </Badge>
          {formattedDate && (
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          )}
        </div>
        <h3 className="font-semibold text-foreground">{update.title}</h3>
        {update.body && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{update.body}</p>
        )}
        {update.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {update.tags.slice(0, 3).map(tag => (
              <span 
                key={tag} 
                className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Skeleton Loader
// =============================================================================

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ActivityFeed() {
  const t = useTranslations('marketing');
  const [updates, setUpdates] = useState<MarketingUpdate[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUpdates() {
      try {
        const result = await fetchPublishedUpdatesAction();
        if (result.success && result.data) {
          setUpdates(result.data.updates);
        }
      } catch (error) {
        console.error('Failed to load updates:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadUpdates();
  }, []);

  // Don't render section if no updates
  if (!isLoading && (!updates || updates.length === 0)) {
    return null;
  }

  return (
    <section
      id="activity"
      className="bg-muted/30 py-24 sm:py-32"
      aria-labelledby="activity-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:items-center sm:text-center mb-12">
          <p className="text-sm font-semibold text-primary">{t('features.activity.tagline')}</p>
          <div>
            <h2
              id="activity-title"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              {t('features.activity.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              {t('features.activity.description')}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mx-auto max-w-2xl">
          {isLoading ? (
            <ActivityFeedSkeleton />
          ) : (
            <div className="space-y-0">
              {updates?.slice(0, 5).map(update => (
                <UpdateCard key={update.id} update={update} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
