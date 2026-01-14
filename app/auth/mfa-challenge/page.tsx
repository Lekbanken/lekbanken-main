/**
 * MFA Challenge Page
 * Displayed when user needs to verify MFA during login
 */

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { MFAChallengeClient } from './MFAChallengeClient';

export const dynamic = 'force-dynamic';

interface MFAChallengePageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function MFAChallengePage({ searchParams }: MFAChallengePageProps) {
  const supabase = await createServerRlsClient();
  const t = await getTranslations('auth.mfa.challenge');
  const params = await searchParams;
  const redirectTo = params.redirect || '/app';
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/');
  }
  
  // Get MFA factors
  const { data: factors } = await supabase.auth.mfa.listFactors();
  
  if (!factors?.totp || factors.totp.length === 0) {
    // No TOTP factors enrolled - redirect to destination
    redirect(redirectTo);
  }
  
  // Get first verified TOTP factor
  const verifiedFactor = factors.totp.find(f => f.status === 'verified');
  
  if (!verifiedFactor) {
    // No verified factors - redirect to destination
    redirect(redirectTo);
  }
  
  // Check current AAL level
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  
  if (aalData?.currentLevel === 'aal2') {
    // Already verified - redirect to destination
    redirect(redirectTo);
  }
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-lg p-6 md:p-8">
          <MFAChallengeClient factorId={verifiedFactor.id} redirectTo={redirectTo} />
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
