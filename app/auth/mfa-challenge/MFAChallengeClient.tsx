/**
 * MFA Challenge Client Component
 * Wrapper for client-side MFA challenge functionality
 */

'use client';

import { MFAChallenge } from '@/components/auth/MFAChallenge';

interface MFAChallengeClientProps {
  factorId: string;
}

export function MFAChallengeClient({ factorId }: MFAChallengeClientProps) {
  return (
    <MFAChallenge
      factorId={factorId}
      redirectUrl="/app"
      showTrustDevice={true}
      trustDays={30}
    />
  );
}
