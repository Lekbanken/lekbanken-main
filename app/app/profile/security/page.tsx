/**
 * Security Settings Page - MFA Management
 * Allows users to enable/disable MFA, view trusted devices, and manage recovery codes
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { SecuritySettingsClient } from './SecuritySettingsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('auth.mfa.settings');
  return {
    title: `${t('title')} | Lekbanken`,
  };
}

export default async function SecuritySettingsPage() {
  const supabase = await createServerRlsClient();
  const t = await getTranslations('auth.mfa.settings');
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/');
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('title')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t('description')}
          </p>
        </div>
        
        {/* Client component for interactive MFA management */}
        <SecuritySettingsClient 
          userId={user.id}
          userEmail={user.email}
        />
    </div>
  );
}
