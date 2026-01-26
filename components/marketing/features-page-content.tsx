'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowLeftIcon,
  SparklesIcon,
  Squares2X2Icon,
  ShareIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchPublishedFeaturesAction } from '@/components/marketing/actions';
import type { MarketingFeature, FeatureAudience, FeatureUseCase, FeatureContext } from '@/lib/marketing/types';

// =============================================================================
// Icon Mapping
// =============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  funnel: FunnelIcon,
  filter: FunnelIcon,
  'layout-grid': Squares2X2Icon,
  squares: Squares2X2Icon,
  share: ShareIcon,
  shield: ShieldCheckIcon,
  sparkles: SparklesIcon,
  clock: ClockIcon,
  document: DocumentArrowDownIcon,
  users: UsersIcon,
  'map-pin': MapPinIcon,
  mobile: DevicePhoneMobileIcon,
};

function FeatureIcon({ iconName, className }: { iconName?: string; className?: string }) {
  const key = (iconName?.toLowerCase() || 'sparkles');
  const IconComponent = ICON_MAP[key] || SparklesIcon;
  return <IconComponent className={className} />;
}

// =============================================================================
// Filter Configuration
// =============================================================================

interface FilterOption<T> {
  value: T | null;
  labelKey: string;
}

const AUDIENCE_OPTIONS: FilterOption<FeatureAudience>[] = [
  { value: null, labelKey: 'all' },
  { value: 'school', labelKey: 'school' },
  { value: 'business', labelKey: 'business' },
  { value: 'sports', labelKey: 'sports' },
  { value: 'event', labelKey: 'event' },
];

const USE_CASE_OPTIONS: FilterOption<FeatureUseCase>[] = [
  { value: null, labelKey: 'all' },
  { value: 'planning', labelKey: 'planning' },
  { value: 'execution', labelKey: 'execution' },
  { value: 'export', labelKey: 'export' },
  { value: 'collaboration', labelKey: 'collaboration' },
  { value: 'safety', labelKey: 'safety' },
];

const CONTEXT_OPTIONS: FilterOption<FeatureContext>[] = [
  { value: null, labelKey: 'all' },
  { value: 'indoor', labelKey: 'indoor' },
  { value: 'outdoor', labelKey: 'outdoor' },
  { value: 'digital', labelKey: 'digital' },
  { value: 'hybrid', labelKey: 'hybrid' },
];

// =============================================================================
// Feature Card
// =============================================================================

interface FeatureCardProps {
  feature: MarketingFeature;
  t: ReturnType<typeof useTranslations<'marketing'>>;
}

function FeatureCard({ feature, t }: FeatureCardProps) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-[#00c7b0]/10 transition-transform group-hover:scale-110">
          <FeatureIcon iconName={feature.iconName} className="h-6 w-6 text-primary" />
        </span>
        {feature.isFeatured && (
          <Badge variant="secondary" className="text-xs">
            {t('featuresPage.featured')}
          </Badge>
        )}
      </div>
      
      <div className="mt-4 flex-1">
        <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
        {feature.subtitle && (
          <p className="mt-1 text-sm font-medium text-primary/80">{feature.subtitle}</p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {feature.description}
        </p>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {t(`featuresPage.audiences.${feature.audience}`)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t(`featuresPage.useCases.${feature.useCase}`)}
        </Badge>
        {feature.relatedGamesCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ~{feature.relatedGamesCount} {t('featuresPage.relatedGames')}
          </span>
        )}
      </div>
    </article>
  );
}

// =============================================================================
// Skeleton Loader
// =============================================================================

function FeaturesPageSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Filter Pill Component
// =============================================================================

interface FilterPillProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function FilterPill({ label, isActive, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FeaturesPageContent() {
  const t = useTranslations('marketing');
  const [features, setFeatures] = useState<MarketingFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [audienceFilter, setAudienceFilter] = useState<FeatureAudience | null>(null);
  const [useCaseFilter, setUseCaseFilter] = useState<FeatureUseCase | null>(null);
  const [contextFilter, setContextFilter] = useState<FeatureContext | null>(null);

  useEffect(() => {
    async function loadFeatures() {
      try {
        const result = await fetchPublishedFeaturesAction();
        if (result.success && result.data) {
          setFeatures(result.data.features);
        }
      } catch (error) {
        console.error('Failed to load features:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadFeatures();
  }, []);

  // Filter and search logic
  const filteredFeatures = (() => {
    let result = features;
    
    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.title.toLowerCase().includes(query) ||
        f.subtitle?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query) ||
        f.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Audience filter
    if (audienceFilter) {
      result = result.filter(f => f.audience === audienceFilter || f.audience === 'all');
    }
    
    // Use case filter
    if (useCaseFilter) {
      result = result.filter(f => f.useCase === useCaseFilter);
    }
    
    // Context filter
    if (contextFilter) {
      result = result.filter(f => f.context === contextFilter || f.context === 'any');
    }
    
    return result;
  })();

  const hasActiveFilters = audienceFilter || useCaseFilter || contextFilter;

  const clearFilters = () => {
    setAudienceFilter(null);
    setUseCaseFilter(null);
    setContextFilter(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <Link 
            href="/#features" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('featuresPage.backToHome')}
          </Link>
          
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">{t('features.tagline')}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t('featuresPage.title')}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                {t('featuresPage.description')}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredFeatures.length} {t('featuresPage.featuresCount')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('featuresPage.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              {t('featuresPage.filters')}
              {hasActiveFilters && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {[audienceFilter, useCaseFilter, contextFilter].filter(Boolean).length}
                </span>
              )}
            </Button>
            
            {/* Clear filters */}
            {(hasActiveFilters || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <XMarkIcon className="h-4 w-4" />
                {t('featuresPage.clearFilters')}
              </Button>
            )}
          </div>
          
          {/* Filter panels */}
          {showFilters && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {/* Audience */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('featuresPage.filterLabels.audience')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map(opt => (
                    <FilterPill
                      key={opt.labelKey}
                      label={t(`featuresPage.audiences.${opt.labelKey}`)}
                      isActive={audienceFilter === opt.value}
                      onClick={() => setAudienceFilter(opt.value)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Use Case */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('featuresPage.filterLabels.useCase')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {USE_CASE_OPTIONS.map(opt => (
                    <FilterPill
                      key={opt.labelKey}
                      label={t(`featuresPage.useCases.${opt.labelKey}`)}
                      isActive={useCaseFilter === opt.value}
                      onClick={() => setUseCaseFilter(opt.value)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Context */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('featuresPage.filterLabels.context')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONTEXT_OPTIONS.map(opt => (
                    <FilterPill
                      key={opt.labelKey}
                      label={t(`featuresPage.contexts.${opt.labelKey}`)}
                      isActive={contextFilter === opt.value}
                      onClick={() => setContextFilter(opt.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {isLoading ? (
          <FeaturesPageSkeleton />
        ) : filteredFeatures.length === 0 ? (
          <div className="py-12 text-center">
            <SparklesIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              {t('featuresPage.noResults')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('featuresPage.noResultsDescription')}
            </p>
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              {t('featuresPage.clearFilters')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFeatures.map(feature => (
              <FeatureCard key={feature.id} feature={feature} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center lg:px-8">
          <h2 className="text-2xl font-semibold text-foreground">
            {t('featuresPage.cta.title')}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t('featuresPage.cta.description')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button size="lg" href="/auth/register">
              {t('featuresPage.cta.tryFree')}
            </Button>
            <Button variant="outline" size="lg" href="/#pricing">
              {t('featuresPage.cta.viewPricing')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
