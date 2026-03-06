'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackJourneyEvent } from '@/lib/analytics/journey-tracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface JourneyToggleCardProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
}

export function JourneyToggleCard({ enabled, onToggle }: JourneyToggleCardProps) {
  const t = useTranslations('app.profile.sections.journey');
  const [optimistic, setOptimistic] = useState(enabled);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync local state when prop changes (e.g. after API data arrives)
  useEffect(() => {
    if (!isUpdating) {
      setOptimistic(enabled);
    }
  }, [enabled, isUpdating]);

  const handleToggle = async (checked: boolean) => {
    setOptimistic(checked);
    setIsUpdating(true);
    try {
      await onToggle(checked);
      trackJourneyEvent(checked ? 'journey_toggle_on' : 'journey_toggle_off', { source: 'profile' });
    } catch {
      // Rollback on failure
      setOptimistic(!checked);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            {t('title')}
          </span>
          <Switch
            checked={optimistic}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
            aria-label={t('toggleLabel')}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </CardContent>
    </Card>
  );
}
