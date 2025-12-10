/**
 * Join Session Page
 * 
 * Anonymous participants can join a session using a 6-character code.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParticipantRejoin } from '@/features/participants/hooks/useParticipantRejoin';

export default function JoinSessionPage() {
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
        throw new Error(data.error || 'Kunde inte gå med i session');
      }
      
      // Save token to localStorage for rejoin
      localStorage.setItem('participant_token', data.participant.token);
      localStorage.setItem('participant_session_id', data.participant.sessionId);
      localStorage.setItem('participant_session_code', sessionCode.trim().toUpperCase());
      localStorage.setItem('participant_display_name', displayName.trim());
      
      // Redirect to participant view
      router.push(`/participants/view`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gå med i session</h1>
          <p className="text-gray-600">Ange sessionskoden du fick av din lärare</p>
        </div>
        
        <form onSubmit={handleJoin} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Sessionskod
            </label>
            <input
              id="code"
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              placeholder="H3K9QF"
              maxLength={6}
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              required
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Ditt namn
            </label>
            <input
              id="name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anna"
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
            {loading ? 'Går med...' : 'Gå med'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sessionskoden består av 6 bokstäver/siffror</p>
        </div>
      </div>
    </div>
  );
}
