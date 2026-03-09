'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchGamificationSnapshot } from '@/features/gamification/api';
import type { GamificationPayload } from '@/features/gamification/types';
import { GamificationStandardPage } from '@/features/gamification/GamificationStandardPage';
import { JourneyOnboardingModal } from '@/features/gamification/components/JourneyOnboardingModal';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Journey view — only downloaded when enabled
// ssr: false justified: GamificationPage is already 'use client' with useState/useEffect/useCallback
const GamificationJourneyPage = dynamic(
  () =>
    import('@/features/gamification/GamificationPage').then((m) => ({
      default: m.GamificationPage,
    })),
  {
    ssr: false,
    loading: () => <GamificationDispatcherSkeleton />,
  }
);

function GamificationDispatcherSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 sm:p-4 lg:p-6 max-w-3xl mx-auto">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export default function GamificationDispatcher() {
  const [data, setData] = useState<GamificationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchGamificationSnapshot()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // Error handled by showing standard page with null data
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleDecision = useCallback(async (enabled: boolean) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gamification/journey-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      const result = await res.json() as { enabled: boolean; decisionAt: string };

      // Update local state so dispatcher re-renders with correct view
      setData((prev) =>
        prev
          ? {
              ...prev,
              journeyPreference: {
                enabled: result.enabled,
                decisionAt: result.decisionAt,
              },
            }
          : prev
      );
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  if (isLoading) return <GamificationDispatcherSkeleton />;

  const pref = data?.journeyPreference;

  // First visit — no decision made yet → show onboarding over standard view
  if (!pref?.decisionAt) {
    return (
      <>
        <GamificationStandardPage data={data} />
        <JourneyOnboardingModal onDecision={handleDecision} isSubmitting={isSubmitting} />
      </>
    );
  }

  // Journey enabled → lazy load full Journey view
  if (pref.enabled) {
    return <GamificationJourneyPage />;
  }

  // Standard view
  return <GamificationStandardPage data={data} />;
}
