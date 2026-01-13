/**
 * Tenant MFA Users Page
 * View and manage MFA status for tenant users
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getServerAuthContext } from '@/lib/auth/server-context';
import TenantMFAUsersClient from './TenantMFAUsersClient';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantMFAUsersPage({ params }: PageProps) {
  const { tenantId } = await params;
  const t = await getTranslations('admin.tenant.security.mfa.users');
  
  const authContext = await getServerAuthContext('/admin');
  
  if (!authContext.user) {
    redirect('/auth/signin');
  }
  
  const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
  const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
  const tenantRole = membership?.role as string | null;
  
  // Check access
  const hasAccess = isSystemAdmin || tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';
  if (!hasAccess) {
    redirect('/admin');
  }
  
  const canManage = isSystemAdmin || tenantRole === 'owner' || tenantRole === 'admin';
  
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('pageDescription')}
          </p>
        </div>
      </div>
      
      <Suspense fallback={<UsersLoadingFallback />}>
        <TenantMFAUsersClient 
          tenantId={tenantId} 
          canManage={canManage}
        />
      </Suspense>
    </div>
  );
}

function UsersLoadingFallback() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="h-12 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 border-b border-gray-100 p-4 last:border-b-0 dark:border-gray-800">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
