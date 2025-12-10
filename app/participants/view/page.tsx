/**
 * Participant View Page
 * 
 * Anonymous participant interface - displays session info and maintains presence via heartbeat.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParticipantHeartbeat } from '@/features/participants/hooks/useParticipantHeartbeat';
import { useParticipantBroadcast, type BroadcastEvent } from '@/features/participants/hooks/useParticipantBroadcast';

interface SessionInfo {
  sessionCode: string;
  displayName: string;
  participantToken: string;
  sessionId: string;
  hostName?: string;
}

export default function ParticipantViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastMessages, setBroadcastMessages] = useState<string[]>([]);
  
  // Load session info from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('participant_token');
    const storedSessionId = localStorage.getItem('participant_session_id');
    const storedSessionCode = localStorage.getItem('participant_session_code');
    const storedDisplayName = localStorage.getItem('participant_display_name');
    
    if (!storedToken || !storedSessionId || !storedSessionCode || !storedDisplayName) {
      // No stored session, redirect to join page
      const code = searchParams.get('code');
      router.push(code ? `/participants/join?code=${code}` : '/participants/join');
      return;
    }
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionInfo({
      participantToken: storedToken,
      sessionId: storedSessionId,
      sessionCode: storedSessionCode,
      displayName: storedDisplayName,
    });
    setLoading(false);
  }, [router, searchParams]);
  
  // Maintain heartbeat
  useParticipantHeartbeat({
    sessionId: sessionInfo?.sessionId || '',
    participantToken: sessionInfo?.participantToken || '',
    enabled: !!sessionInfo,
  });
  
  // Listen for broadcast events
  const handleBroadcastEvent = (event: BroadcastEvent) => {
    const message = formatBroadcastMessage(event);
    if (message) {
      setBroadcastMessages(prev => [...prev, message].slice(-5)); // Keep last 5 messages
    }
  };
  
  const { connected: broadcastConnected } = useParticipantBroadcast({
    sessionId: sessionInfo?.sessionId || '',
    onEvent: handleBroadcastEvent,
    enabled: !!sessionInfo,
  });
  
  // Format broadcast event into human-readable message
  const formatBroadcastMessage = (event: BroadcastEvent): string | null => {
    switch (event.type) {
      case 'session_paused':
        return '⏸️ Session paused by host';
      case 'session_resumed':
        return '▶️ Session resumed';
      case 'session_ended':
        return '🏁 Session ended by host';
      case 'host_message':
        return `💬 ${event.payload?.message || 'Message from host'}`;
      case 'participant_joined':
        return `👋 ${event.payload?.displayName || 'Someone'} joined`;
      case 'participant_left':
        return `👋 ${event.payload?.displayName || 'Someone'} left`;
      case 'role_changed':
        return `👤 Your role changed to ${event.payload?.newRole || 'unknown'}`;
      default:
        return null;
    }
  };
  
  const handleLeaveSession = () => {
    // Clear localStorage
    localStorage.removeItem('participant_token');
    localStorage.removeItem('participant_session_id');
    localStorage.removeItem('participant_session_code');
    localStorage.removeItem('participant_display_name');
    
    // Redirect to join page
    router.push('/participants/join');
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-sm text-zinc-500">Loading session...</p>
        </div>
      </div>
    );
  }
  
  if (!sessionInfo) {
    return null; // Will redirect
  }
  
  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                {sessionInfo.displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Session Code: <span className="font-mono font-semibold">{sessionInfo.sessionCode}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Broadcast status */}
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${broadcastConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-zinc-500">
                  {broadcastConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* Leave button */}
              <button
                onClick={handleLeaveSession}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
        
        {/* Broadcast messages */}
        {broadcastMessages.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">Recent Updates</h2>
            <div className="space-y-2">
              {broadcastMessages.map((message, index) => (
                <div
                  key={index}
                  className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                >
                  {message}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Main content area */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="text-center text-zinc-500">
            <svg
              className="mx-auto h-16 w-16 text-zinc-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900">
              Waiting for activities...
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Your host will start activities when everyone is ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
