/**
 * MFA Challenge Client Component
 * Wrapper for client-side MFA challenge functionality
 */

'use client';

import { MFAChallenge } from '@/components/auth/MFAChallenge';

interface MFAChallengeClientProps {
  factorId: string;
  redirectTo?: string;
}

export function MFAChallengeClient({ factorId, redirectTo = '/app' }: MFAChallengeClientProps) {
  return (
    <MFAChallenge
      factorId={factorId}
      redirectUrl={redirectTo}
      showTrustDevice={true}
      trustDays={30}
    />
  );
}
