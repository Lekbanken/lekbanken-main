'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';
import { ParticipantList } from '@/features/participants/components/ParticipantList';
import { SessionControlPanel } from '@/features/participants/components/SessionControlPanel';
import { LiveProgressDashboard } from '@/features/participants/components/LiveProgressDashboard';
import type { Database } from '@/types/supabase';

type ParticipantSession = Database['public']['Tables']['participant_sessions']['Row'];
type SessionStatus = Database['public']['Enums']['participant_session_status'];

export default function HostDashboardPage() {
  const t = useTranslations('play.participantsHost');
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      const supabase = createBrowserClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('participant_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        setError(t('errors.sessionNotFound'));
        setLoading(false);
        return;
      }

      // Verify user is the host
      if (sessionData.host_user_id !== user.id) {
        setError(t('errors.notHost'));
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setLoading(false);

      // Subscribe to session updates
      const channel = supabase
        .channel(`session:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'participant_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload: { new: ParticipantSession }) => {
            setSession(payload.new);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchSession();
  }, [sessionId, router, t]);

  // Fetch participant count
  useEffect(() => {
    const fetchParticipantCount = async () => {
      const supabase = createBrowserClient();

      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .in('status', ['active', 'idle']);

      setParticipantCount(count || 0);

      // Subscribe to participant changes
      const channel = supabase
        .channel(`participants:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'participants',
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            // Refetch count
            const { count: newCount } = await supabase
              .from('participants')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', sessionId)
              .in('status', ['active', 'idle']);

            setParticipantCount(newCount || 0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    if (session) {
      fetchParticipantCount();
    }
  }, [session, sessionId]);

  const handleStatusChange = (newStatus: SessionStatus) => {
    if (session) {
      setSession({ ...session, status: newStatus });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || t('errors.sessionNotFound')}</p>
          <button
            onClick={() => router.push('/app/participants')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('actions.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('header.title')}
            </h1>
            <button
              onClick={() => router.push('/app/participants')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              {t('actions.backArrow')}
            </button>
          </div>
          <p className="text-gray-600">
            {t('header.subtitle')}
          </p>
        </div>

        {/* Session Control Panel */}
        <div className="mb-6">
          <SessionControlPanel
            sessionId={session.id}
            sessionCode={session.session_code}
            currentStatus={session.status}
            participantCount={participantCount}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('sessionInfo.title')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('sessionInfo.codeLabel')}</p>
              <p className="text-2xl font-mono font-bold">{session.session_code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('sessionInfo.participantsLabel')}</p>
              <p className="text-2xl font-bold">{participantCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('sessionInfo.createdLabel')}</p>
              <p className="text-sm">{dateFormatter.format(new Date(session.created_at))}</p>
            </div>
            {session.game_id && (
              <div>
                <p className="text-sm text-gray-600">{t('sessionInfo.gameIdLabel')}</p>
                <p className="text-sm font-mono">{session.game_id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Progress Dashboard */}
        <div className="mb-6">
          <LiveProgressDashboard sessionId={session.id} />
        </div>

        {/* Participant List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('participants.title')}</h2>
          <ParticipantList 
            sessionId={session.id} 
            sessionCode={session.session_code}
          />
        </div>
      </div>
    </div>
  );
}
