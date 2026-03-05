'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

type SecurityStatusCardProps = {
  emailVerified: boolean;
  mfaEnabled: boolean | null;
  mfaLoading: boolean;
  mfaError: string | null;
};

export function SecurityStatusCard({ emailVerified, mfaEnabled, mfaLoading, mfaError }: SecurityStatusCardProps) {
  const t = useTranslations('app.profile');
  const tCommon = useTranslations('common');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheckIcon className="h-5 w-5 text-primary" />
          {t('sections.security.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          {/* Email verification */}
          <div className="flex items-center gap-2">
            {emailVerified ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">{t('sections.security.emailVerified')}</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-amber-600">{t('sections.security.emailNotVerified')}</span>
              </>
            )}
          </div>

          {/* MFA status */}
          <div className="flex items-center gap-2">
            {mfaLoading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">{tCommon('actions.loading')}</span>
              </>
            ) : mfaEnabled === true ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">{t('sections.security.mfaEnabled')}</span>
              </>
            ) : mfaEnabled === false ? (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-amber-600">{t('sections.security.mfaDisabled')}</span>
                <Link href="/app/profile/security" className="text-sm text-primary hover:underline">
                  {t('sections.security.enableMfa')}
                </Link>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-amber-600">
                  MFA-status: {tCommon('messages.loadingError')}
                </span>
                <Link
                  href="/app/profile/security"
                  className="text-sm text-primary hover:underline"
                  title={mfaError || undefined}
                >
                  {t('nav.security')}
                </Link>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
