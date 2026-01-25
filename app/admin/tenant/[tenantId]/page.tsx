'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TenantDashboardPage() {
  const t = useTranslations('admin.tenant.dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('welcome')}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('stats.members')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="mt-1 text-sm text-slate-500">{t('stats.totalMembers')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('stats.activeSessions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="mt-1 text-sm text-slate-500">{t('stats.last30Days')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('stats.subscription')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-primary">{t('status.active')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('stats.nextInvoice')}: --</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            {t('underDevelopment')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
