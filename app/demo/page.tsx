'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  SparklesIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Demo Landing Page
 * 
 * Purpose: Explain demo features and start demo session
 * Route: /demo
 */

// Feature keys for translation
const FREE_TIER_FEATURES = [
  { key: 'browseActivities', included: true },
  { key: 'createDemoSessions', included: true },
  { key: 'tryGamification', included: true },
  { key: 'explore2Hours', included: true },
  { key: 'exportData', included: false },
  { key: 'inviteTeam', included: false },
  { key: 'customBranding', included: false },
  { key: 'advancedAnalytics', included: false },
];

const PREMIUM_TIER_FEATURES = [
  { key: 'allActivities', included: true },
  { key: 'unlimitedSessions', included: true },
  { key: 'fullGamification', included: true },
  { key: 'extendedTime', included: true },
  { key: 'exportData', included: true },
  { key: 'inviteTeam', included: true },
  { key: 'customBranding', included: true },
  { key: 'advancedAnalytics', included: true },
];

// Feature names (these would ideally come from translations too)
const FEATURE_NAMES: Record<string, string> = {
  browseActivities: 'Bläddra i 15-20 utvalda aktiviteter',
  createDemoSessions: 'Skapa demo-sessioner',
  tryGamification: 'Prova gamification-features',
  explore2Hours: 'Utforska plattformen i 2 timmar',
  exportData: 'Exportera data',
  inviteTeam: 'Bjuda in teammedlemmar',
  customBranding: 'Anpassad branding',
  advancedAnalytics: 'Avancerad analys',
  allActivities: 'Tillgång till alla 1200+ aktiviteter',
  unlimitedSessions: 'Skapa obegränsade sessioner',
  fullGamification: 'Full gamification-svit',
  extendedTime: 'Förlängd demo-tid',
};

export default function DemoPage() {
  const router = useRouter();
  const t = useTranslations('demo');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartDemo() {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/auth/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.redirected) {
        // Successful redirect to demo app
        router.push(response.url);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Kunde inte starta demo. Försök igen.');
      }
    } catch (err) {
      console.error('Demo start error:', err);
      setError('Ett oväntat fel inträffade. Försök igen.');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary ring-1 ring-primary/20">
            <SparklesIcon className="h-4 w-4" />
            {t('landing.badge')}
          </div>
          
          <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('landing.title').split('–')[0]}
            <span className="bg-gradient-to-r from-primary to-[#00c7b0] bg-clip-text text-transparent">
              {t('landing.title').includes('–') ? '– ' + t('landing.title').split('–')[1] : ''}
            </span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground">
            {t('landing.description')}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={handleStartDemo}
              disabled={isStarting}
              className="gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            >
              {isStarting ? (
                <>
                  <ClockIcon className="h-5 w-5 animate-spin" />
                  {t('landing.startingDemo')}
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  {t('landing.startDemo')}
                </>
              )}
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              href="/demo/upgrade"
              className="gap-2"
            >
              <SparklesIcon className="h-5 w-5" />
              {t('tiers.premium.button')}
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
        <h2 className="mb-12 text-center text-2xl font-semibold text-foreground">
          {t('landing.compareTiers')}
        </h2>
        
        <div className="grid gap-8 md:grid-cols-2">
          {/* Free Tier Card */}
          <Card className="relative overflow-hidden border-2 border-primary/20">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-[#00c7b0]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayIcon className="h-6 w-6 text-primary" />
                {t('tiers.free.title')}
              </CardTitle>
              <CardDescription>
                {t('tiers.free.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{t('tiers.free.title').split(' ')[0]}</span>
                <span className="text-muted-foreground">/ 2 {t('landing.description').includes('timmar') ? 'timmar' : 'hours'}</span>
              </div>
              
              <ul className="space-y-3">
                {FREE_TIER_FEATURES.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-3">
                    {feature.included ? (
                      <CheckCircleIcon className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                      {FEATURE_NAMES[feature.key]}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="mt-8 w-full"
                onClick={handleStartDemo}
                disabled={isStarting}
              >
                {isStarting ? t('landing.startingDemo') : t('tiers.free.button')}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Tier Card */}
          <Card className="relative overflow-hidden border-2 border-[#ffd166]/40 bg-gradient-to-b from-[#ffd166]/5 to-transparent">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ffd166] to-[#ff9f1c]" />
            <div className="absolute right-4 top-4 rounded-full bg-[#ffd166]/20 px-3 py-1 text-xs font-medium text-[#ff9f1c]">
              Rekommenderas
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-[#ffd166]" />
                {t('tiers.premium.title')}
              </CardTitle>
              <CardDescription>
                {t('tiers.premium.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{t('tiers.free.title').split(' ')[0]}</span>
                <span className="text-muted-foreground">/ via sales</span>
              </div>
              
              <ul className="space-y-3">
                {PREMIUM_TIER_FEATURES.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 shrink-0 text-[#ffd166]" />
                    <span className="text-foreground">{FEATURE_NAMES[feature.key]}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="mt-8 w-full bg-[#ffd166] text-[#1a1a2e] hover:bg-[#ffc233]"
                href="/demo/upgrade"
              >
                {t('tiers.premium.button')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Privacy Notice */}
      <section className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h3 className="text-lg font-semibold text-foreground">{t('privacy.title')}</h3>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('privacy.description')}{' '}
            <a href="/privacy#demo-sessions" className="text-primary underline hover:no-underline">
              {t('upgrade.form.privacyPolicy')}
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
