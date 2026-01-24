/**
 * Join Session Page
 * 
 * Anonymous participants can join a session using a 6-character code.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParticipantRejoin } from '@/features/participants/hooks/useParticipantRejoin';

export default function JoinSessionPage() {
  const t = useTranslations('participantJoin');
  const [sessionCode, setSessionCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  
  // Try to rejoin if token exists
  useParticipantRejoin({
    enabled: true,
    onSuccess: () => {
      // Redirect to participant view if rejoin successful
      router.push('/participants/view');
    },
    onError: () => {
      // Rejoin failed, stay on join page
    },
  });
  
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/participants/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: sessionCode.trim().toUpperCase(),
          displayName: displayName.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const status = response.status;
        if (status === 404) throw new Error(t('errors.invalidCode'));
        if (status === 403 && data?.error === 'Session is full') throw new Error(t('errors.sessionFull'));
        if (status === 410) throw new Error(t('errors.sessionEnded'));
        if (status === 403 && data?.error === 'Session is locked') throw new Error(t('errors.sessionLocked'));
        if (status === 403 && data?.code === 'SESSION_OFFLINE') throw new Error(t('errors.sessionOffline'));
        throw new Error(data.error || t('errors.joinFailed'));
      }
      
      // Save token to localStorage for rejoin
      localStorage.setItem('participant_token', data.participant.token);
      localStorage.setItem('participant_session_id', data.participant.sessionId);
      localStorage.setItem('participant_session_code', sessionCode.trim().toUpperCase());
      localStorage.setItem('participant_display_name', displayName.trim());
      localStorage.setItem('participant_status', data.participant.status ?? 'active');
      
      // Redirect to participant view
      router.push(`/participants/view`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.sessionCodeLabel')}
            </label>
            <input
              id="code"
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder={t('form.sessionCodePlaceholder')}
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              required
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.displayNameLabel')}
            </label>
            <input
              id="name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('form.displayNamePlaceholder')}
              maxLength={50}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading || sessionCode.length !== 6 || !displayName.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('actions.joining') : t('actions.join')}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>{t('footerHint')}</p>
        </div>
      </div>
    </div>
  );
}
