'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { JoinSessionForm } from '@/components/play';
import { joinSession } from '@/features/play-participant/api';
import { saveParticipantAuth } from '@/features/play-participant/tokenStorage';
import { Card } from '@/components/ui/card';
import { PlayIcon } from '@heroicons/react/24/solid';

const SESSION_STORAGE_KEY = 'lekbanken_participant_token';

export function PlayJoinClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (code: string, displayName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const normalizedCode = code.toUpperCase();
      const result = await joinSession({ sessionCode: normalizedCode, displayName });
      const token =
        // Back-compat (older client expectation)
        (result as { participantToken?: string }).participantToken ??
        // Current API shape
        (result as { participant?: { token?: string } }).participant?.token;
      
      // Store participant token for session persistence
      if (token) {
        sessionStorage.setItem(
          `${SESSION_STORAGE_KEY}_${normalizedCode}`,
          token
        );

        const participant = (result as { participant?: { id: string; sessionId: string; displayName: string } })
          .participant;
        if (participant?.id && participant?.sessionId) {
          saveParticipantAuth(normalizedCode, {
            token,
            participantId: participant.id,
            sessionId: participant.sessionId,
            displayName: participant.displayName,
          });
        }
      }

      // Navigate to session
      router.push(`/play/session/${normalizedCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte gå med i sessionen');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Hero section */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <PlayIcon className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Gå med i session
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          Ange koden som visas på skärmen och välj ett visningsnamn för att delta.
        </p>
      </div>

      {/* Join form card */}
      <Card variant="elevated" className="w-full max-w-md p-6 sm:p-8">
        <JoinSessionForm
          onSubmit={handleJoin}
          isLoading={isLoading}
          error={error}
        />
      </Card>

      {/* Help text */}
      <p className="mt-6 text-sm text-muted-foreground text-center max-w-sm">
        Sessionskoden är 6 tecken lång och visas av den som håller i sessionen.
      </p>
    </div>
  );
}
