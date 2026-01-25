/**
 * Security Settings Page - MFA Management
 * Allows users to enable/disable MFA, view trusted devices, and manage recovery codes
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { SecuritySettingsClient } from './SecuritySettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Säkerhetsinställningar | Lekbanken',
  description: 'Hantera tvåfaktorsautentisering och säkerhetsinställningar',
};

export default async function SecuritySettingsPage() {
  const supabase = await createServerRlsClient();
  const t = await getTranslations('auth.mfa.settings');
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/');
  }
  
  // Get MFA factors
  const { data: factors } = await supabase.auth.mfa.listFactors();
  
  // Get MFA status from our API - variable is unused, remove to fix ESLint
  // const mfaStatus = null; - removed
  
  const hasTOTP = factors?.totp?.some(f => f.status === 'verified') ?? false;
  const totpFactor = factors?.totp?.find(f => f.status === 'verified');
  
  return (
    <div className="py-8">
      <div className="space-y-6">
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
          hasMFA={hasTOTP}
          factorId={totpFactor?.id}
          userEmail={user.email}
        />
      </div>
    </div>
  );
}
