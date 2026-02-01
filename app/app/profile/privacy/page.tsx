'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheckIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function PrivacyPage() {
  const t = useTranslations('app.profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('sections.privacy.title')}</h1>
        <p className="text-muted-foreground">{t('sections.privacy.description')}</p>
      </div>

      {/* GDPR Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t('sections.privacy.gdprRights.title')}</CardTitle>
          </div>
          <CardDescription>{t('sections.privacy.gdprRights.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="font-medium mb-2">{t('sections.privacy.gdprRights.title')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>{t('sections.privacy.gdprRights.access')}</li>
              <li>{t('sections.privacy.gdprRights.rectification')}</li>
              <li>{t('sections.privacy.gdprRights.erasure')}</li>
              <li>{t('sections.privacy.gdprRights.portability')}</li>
              <li>{t('sections.privacy.gdprRights.restriction')}</li>
              <li>{t('sections.privacy.gdprRights.objection')}</li>
            </ul>
          </div>

          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <EnvelopeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-medium">{t('sections.privacy.contact.title')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('sections.privacy.contact.description')}
              </p>
              <a 
                href="mailto:privacy@lekbanken.se" 
                className="text-sm text-primary hover:underline"
              >
                privacy@lekbanken.se
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
