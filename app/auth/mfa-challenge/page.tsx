/**
 * MFA Challenge Page
 * Displayed when user needs to verify MFA during login
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { MFAChallengeClient } from './MFAChallengeClient';

export const dynamic = 'force-dynamic';

export default async function MFAChallengePage() {
  const supabase = await createServerRlsClient();
  const t = await getTranslations('auth.mfa.challenge');
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/');
  }
  
  // Get MFA factors
  const { data: factors } = await supabase.auth.mfa.listFactors();
  
  if (!factors?.totp || factors.totp.length === 0) {
    // No TOTP factors enrolled - redirect to app
    redirect('/app');
  }
  
  // Get first verified TOTP factor
  const verifiedFactor = factors.totp.find(f => f.status === 'verified');
  
  if (!verifiedFactor) {
    // No verified factors - redirect to app
    redirect('/app');
  }
  
  // Check current AAL level
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  
  if (aalData?.currentLevel === 'aal2') {
    // Already verified - redirect to app
    redirect('/app');
  }
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-lg p-6 md:p-8">
          <MFAChallengeClient factorId={verifiedFactor.id} />
        </div>
        
        {/* Help text */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            {t('needHelp')}{' '}
            <a 
              href="/support" 
              className="text-primary hover:underline"
            >
              {t('contactSupport')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
