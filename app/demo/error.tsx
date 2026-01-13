'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * Demo Error Page
 * Shown when errors occur during demo session
 * Route: /demo/error
 */

interface DemoErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DemoError({ error, reset }: DemoErrorProps) {
  const t = useTranslations('demo.error');
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[demo-error]', error);
    
    // Track error event - use optional chaining to avoid type issues
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const posthog = (window as any).posthog;
      if (posthog?.capture) {
        posthog.capture('demo_error', {
          error_message: error.message,
          error_digest: error.digest,
          is_demo: true,
        });
      }
    }
  }, [error]);

  // Determine error type for better UX
  const errorType = getErrorType(error, t);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-destructive/5 via-background to-background px-4 py-16">
      <Card className="max-w-md w-full text-center shadow-lg border-destructive/20">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          
          <CardTitle className="text-2xl">
            {errorType.title}
          </CardTitle>
          <CardDescription className="text-base">
            {errorType.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Retry Button */}
          {errorType.canRetry && (
            <Button
              onClick={reset}
              className="w-full gap-2"
              size="lg"
            >
              <ArrowPathIcon className="h-5 w-5" />
              {errorType.retryText}
            </Button>
          )}

          {/* Alternative Actions */}
          <div className="flex flex-col gap-2">
            <Button
              href="/demo"
              variant="outline"
              className="w-full"
            >
              {t('restartDemo')}
            </Button>
            
            <Button
              href="/"
              variant="ghost"
              className="w-full gap-2"
            >
              <HomeIcon className="h-4 w-4" />
              {t('backToHome')}
            </Button>
          </div>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                {t('technicalDetails')}
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          {/* Support Link */}
          <p className="text-sm text-muted-foreground pt-4">
            {t('persistentProblem')}{' '}
            <a
              href="/app/support"
              className="text-primary hover:underline"
            >
              {t('contactSupport')}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ErrorTypeInfo {
  title: string;
  description: string;
  canRetry: boolean;
  retryText: string;
}

type TranslationFunction = (key: string) => string;

function getErrorType(error: Error, t: TranslationFunction): ErrorTypeInfo {
  const message = error.message.toLowerCase();
  
  // Rate limit error
  if (message.includes('rate limit') || message.includes('too many')) {
    return {
      title: t('types.rateLimit.title'),
      description: t('types.rateLimit.description'),
      canRetry: true,
      retryText: t('retry'),
    };
  }
  
  // Auth/session error
  if (message.includes('auth') || message.includes('session') || message.includes('expired')) {
    return {
      title: t('types.session.title'),
      description: t('types.session.description'),
      canRetry: true,
      retryText: t('startNewDemo'),
    };
  }
  
  // Network error
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return {
      title: t('types.network.title'),
      description: t('types.network.description'),
      canRetry: true,
      retryText: t('retry'),
    };
  }
  
  // Database/server error
  if (message.includes('database') || message.includes('pool') || message.includes('server')) {
    return {
      title: t('types.server.title'),
      description: t('types.server.description'),
      canRetry: true,
      retryText: t('retry'),
    };
  }
  
  // Generic error
  return {
    title: t('types.generic.title'),
    description: t('types.generic.description'),
    canRetry: true,
    retryText: t('retry'),
  };
}
