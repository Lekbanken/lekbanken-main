'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MarketingFeature } from '@/lib/marketing/types';
import {
  FunnelIcon,
  Squares2X2Icon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface FeatureGridDynamicProps {
  initialFeatures: MarketingFeature[];
}

type RoleFilter = 'all' | 'admin' | 'leader' | 'participant';

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

// Static icon renderer - use element not component to avoid "created during render" error
function FeatureIcon({ iconName, className }: { iconName?: string; className?: string }) {
  const key = (iconName?.toLowerCase() || 'sparkles');
  const IconComponent = ICON_MAP[key] || SparklesIcon;
  return <IconComponent className={className} />;
}

// =============================================================================
// Role Filter Options
// =============================================================================

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'leader', label: 'Lekledare' },
  { value: 'participant', label: 'Deltagare' },
];

// =============================================================================
// Feature Card Component
// =============================================================================

interface FeatureCardProps {
  feature: MarketingFeature;
  isVisible: boolean;
}

function FeatureCard({ feature, isVisible }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300',
        'hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg',
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none absolute'
      )}
    >
      <div className="space-y-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-[#00c7b0]/10 transition-transform group-hover:scale-110">
          <FeatureIcon iconName={feature.iconName} className="h-5 w-5 text-primary" />
        </span>
        <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
        {feature.subtitle && (
          <p className="text-sm font-medium text-primary/80">{feature.subtitle}</p>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </div>
      {feature.relatedGamesCount > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            ~{feature.relatedGamesCount} relaterade lekar
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FeatureGridDynamic({ initialFeatures }: FeatureGridDynamicProps) {
  const t = useTranslations('marketing');
  const [features] = useState<MarketingFeature[]>(initialFeatures);
  const [activeRole, setActiveRole] = useState<RoleFilter>('leader');
  const [showAll, setShowAll] = useState(false);

  // Get featured features (only those marked as featured in admin)
  const featuredFeatures = features.filter(f => f.isFeatured);

  // Filter features based on role filter
  // Collapsed: show first 4 featured with active role
  // Expanded: show all featured with active role
  const filteredFeatures = (() => {
    // Apply role filter to featured features
    const roleFiltered = featuredFeatures.filter(feature => {
      return feature.tags.includes(activeRole);
    });
    
    if (!showAll) {
      // Collapsed view: show first 4 filtered features
      return roleFiltered.slice(0, 4);
    }
    
    return roleFiltered;
  })();

  return (
    <section
      id="features"
      className="bg-background py-16 sm:py-20"
      aria-labelledby="features-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:items-center sm:text-center">
          <p className="text-sm font-semibold text-primary">{t('features.tagline')}</p>
          <div>
            <h2
              id="features-title"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              {t('features.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
              {t('features.description')}
            </p>
          </div>
        </div>

        {/* Role Filter Tabs - Always visible */}
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2 rounded-lg bg-muted p-1">
            {ROLE_FILTERS.map(filter => (
              <button
                key={filter.value}
                onClick={() => setActiveRole(filter.value)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                  activeRole === filter.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredFeatures.map(feature => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              isVisible={true}
            />
          ))}
        </div>

        {/* Empty state - when no features match */}
        {filteredFeatures.length === 0 && (
          <div className="mt-8 text-center py-8">
            <p className="text-muted-foreground">
              {t('features.noFeaturesForFilter')}
            </p>
          </div>
        )}

        {/* Show All / Collapse button - show when more than 4 filtered features */}
        {featuredFeatures.filter(f => f.tags.includes(activeRole)).length > 4 && (
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAll(!showAll)}
              className="gap-2"
            >
              {showAll ? (
                <>
                  <ChevronUpIcon className="h-4 w-4" />
                  {t('features.showLess')}
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-4 w-4" />
                  {t('features.showMore')}
                </>
              )}
            </Button>
            
            {/* Link to dedicated features page - only shown when expanded */}
            {showAll && (
              <Button variant="ghost" size="lg" href="/features" className="gap-2">
                {t('features.exploreAll')}
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
