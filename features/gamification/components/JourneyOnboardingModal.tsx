'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { trackJourneyEvent } from '@/lib/analytics/journey-tracking';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface JourneyOnboardingModalProps {
  onDecision: (enabled: boolean) => void;
  isSubmitting?: boolean;
}

const STEP_COUNT = 4;

export function JourneyOnboardingModal({ onDecision, isSubmitting }: JourneyOnboardingModalProps) {
  const t = useTranslations('gamification.onboarding');
  const [step, setStep] = useState(0);

  useEffect(() => {
    trackJourneyEvent('journey_onboarding_shown', { source: 'onboarding' });
  }, []);

  const steps = [
    { title: t('step1Title'), desc: t('step1Desc') },
    { title: t('step2Title'), desc: t('step2Desc') },
    { title: t('step3Title'), desc: t('step3Desc') },
    { title: t('step4Title'), desc: t('step4Desc') },
  ];

  const current = steps[step];

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        trackJourneyEvent('journey_onboarding_skipped', { source: 'onboarding' });
        onDecision(false);
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{current.title}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Step content — static images/illustrations placeholder */}
          <div className="rounded-lg bg-muted/50 border border-border flex items-center justify-center min-h-[160px] p-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">{current.title}</p>
              <p className="text-sm text-muted-foreground max-w-sm">{current.desc}</p>
            </div>
          </div>

          {/* Step indicator — dots */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
                aria-label={`Steg ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                {t('previous')}
              </Button>
            )}
            {step < STEP_COUNT - 1 ? (
              <Button variant="primary" onClick={() => setStep(step + 1)} className="flex-1">
                {t('next')}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  trackJourneyEvent('journey_onboarding_accepted', { source: 'onboarding' });
                  onDecision(true);
                }}
                disabled={isSubmitting}
                className="flex-1"
              >
                {t('activate')}
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              trackJourneyEvent('journey_onboarding_skipped', { source: 'onboarding' });
              onDecision(false);
            }}
            disabled={isSubmitting}
            className="w-full"
          >
            {t('skip')}
          </Button>
          <p className="text-xs text-muted-foreground text-center">{t('changeHint')}</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
