/**
 * Tenant Security - MFA Policy Administration
 * Allows tenant admins to configure MFA enforcement for their organization
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getServerAuthContext } from '@/lib/auth/server-context';
import TenantMFAPolicyClient from './TenantMFAPolicyClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MFA-policy | Säkerhet | Admin',
  description: 'Konfigurera tvåfaktorsautentisering för organisationen',
};

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantMFAPolicyPage({ params }: PageProps) {
  const { tenantId } = await params;
  const authContext = await getServerAuthContext('/admin');
  const t = await getTranslations('admin.tenant.security.mfa');

  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin');
  }

  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
  const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
  const tenantRole = membership?.role as string | null;
  
  // Only owner and admin can manage security settings
  const canManageSecurity = isSystemAdmin || tenantRole === 'owner' || tenantRole === 'admin';
  
  if (!canManageSecurity) {
    redirect(`/admin/tenant/${tenantId}`);
  }

  // Get tenant info
  const tenantName = membership?.tenant?.name || 'Organisation';

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            <a href={`/admin/tenant/${tenantId}`} className="hover:underline">
              {tenantName}
            </a>
            {' / '}
            <a href={`/admin/tenant/${tenantId}/settings`} className="hover:underline">
              {t('breadcrumb.settings')}
            </a>
            {' / '}
            <span className="text-foreground">{t('breadcrumb.security')}</span>
          </nav>
          <h1 className="text-2xl font-bold text-foreground">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t('pageDescription')}
          </p>
        </div>

        {/* Client component for interactive policy management */}
        <TenantMFAPolicyClient 
          tenantId={tenantId}
          isSystemAdmin={isSystemAdmin}
          canManage={canManageSecurity}
        />
      </div>
    </div>
  );
}
