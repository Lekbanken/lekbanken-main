/**
 * Demo Expired Page
 * Shown when demo session expires (after 2 hours)
 */

'use client';

import { useTranslations } from 'next-intl';
import { ClockIcon, ArrowPathIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trackSessionExpired, getDemoSessionDuration, clearDemoTracking } from '@/lib/analytics/demo-tracking';
import { useEffect } from 'react';

export default function DemoExpiredPage() {
  const t = useTranslations('demo.expired');

  // Track session expiry on mount
  useEffect(() => {
    const sessionId = typeof window !== 'undefined' 
      ? sessionStorage.getItem('demo_session_id') 
      : null;
    
    if (sessionId) {
      const duration = getDemoSessionDuration();
      trackSessionExpired(sessionId, duration);
      clearDemoTracking();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-background px-4 py-16">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardHeader>
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>

          <CardTitle className="text-2xl">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-base">
            {t('description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary CTA: Create Account */}
          <Button
            href="/auth/signup?source=demo_expired"
            className="w-full gap-2"
            size="lg"
          >
            <UserPlusIcon className="h-5 w-5" />
            {t('createAccount')}
          </Button>

          {/* Secondary CTA: Start Another Demo */}
          <form action="/auth/demo" method="POST" className="w-full">
            <Button
              type="submit"
              variant="outline"
              className="w-full gap-2"
              size="lg"
            >
              <ArrowPathIcon className="h-5 w-5" />
              {t('startAnother')}
            </Button>
          </form>

          {/* Premium Demo Option */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">
              {t('premiumPrompt')}
            </p>
            <Button
              href="/demo/upgrade"
              variant="ghost"
              size="sm"
            >
              {t('contactSales')}
            </Button>
          </div>

          {/* Footer */}
          <p className="text-sm text-muted-foreground pt-4">
            {t('haveAccount')}{' '}
            <Link
              href="/auth/login"
              className="text-primary hover:underline font-medium"
            >
              {t('login')}
            </Link>
          </p>

          {/* Back to Home */}
          <div className="pt-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              ← {t('backToHome')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
