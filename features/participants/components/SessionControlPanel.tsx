/**
 * SessionControlPanel Component
 * 
 * Host controls for managing participant session.
 * Displays session status and provides action buttons.
 */

'use client';

import { useState } from 'react';
import { useSessionControl } from '@/features/participants/hooks/useSessionControl';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

interface SessionControlPanelProps {
  sessionId: string;
  sessionCode: string;
  currentStatus: SessionStatus;
  participantCount: number;
  onStatusChange?: (newStatus: SessionStatus) => void;
}

export function SessionControlPanel({
  sessionId,
  sessionCode,
  currentStatus,
  participantCount,
  onStatusChange,
}: SessionControlPanelProps) {
  const [status, setStatus] = useState<SessionStatus>(currentStatus);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  const { 
    loading,
    pauseSession,
    resumeSession,
    lockSession,
    unlockSession,
    endSession,
  } = useSessionControl({
    sessionId,
    onSuccess: (action) => {
      // Update local status
      if (action === 'pause') setStatus('paused');
      if (action === 'resume' || action === 'unlock') setStatus('active');
      if (action === 'lock') setStatus('locked');
      if (action === 'end') setStatus('ended');
      
      if (onStatusChange) {
        let newStatus: SessionStatus = currentStatus;
        if (action === 'pause') newStatus = 'paused';
        if (action === 'resume' || action === 'unlock') newStatus = 'active';
        if (action === 'lock') newStatus = 'locked';
        if (action === 'end') newStatus = 'ended';
        onStatusChange(newStatus);
      }
    },
  });
  
  const handleEndSession = async () => {
    if (!showEndConfirm) {
      setShowEndConfirm(true);
      return;
    }
    
    try {
      await endSession('Session ended by host');
      setShowEndConfirm(false);
    } catch {
      // Error handled by hook
    }
  };
  
  const getStatusBadge = () => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aktiv' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pausad' },
      locked: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Låst' },
      ended: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Avslutad' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Avbruten' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Arkiverad' },
    };
    
    const badge = badges[status] || badges.active;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };
  
  if (status === 'ended' || status === 'cancelled' || status === 'archived') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Session Avslutad</h3>
            <p className="text-sm text-gray-600 mt-1">Kod: {sessionCode}</p>
          </div>
          {getStatusBadge()}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Session Kontroller</h3>
          <p className="text-sm text-gray-600 mt-1">
            Kod: <span className="font-mono font-bold">{sessionCode}</span> • {participantCount} deltagare
          </p>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Pause/Resume */}
        {status === 'active' && (
          <button
            onClick={() => pauseSession('Paused by host')}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
            Pausa
          </button>
        )}
        
        {status === 'paused' && (
          <button
            onClick={() => resumeSession('Resumed by host')}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            Återuppta
          </button>
        )}
        
        {/* Lock/Unlock */}
        {status !== 'locked' && (
          <button
            onClick={() => lockSession('No new participants allowed')}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lås Session
          </button>
        )}
        
        {status === 'locked' && (
          <button
            onClick={() => unlockSession('New participants allowed again')}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Lås Upp
          </button>
        )}
        
        {/* End Session */}
        {!showEndConfirm ? (
          <button
            onClick={handleEndSession}
            disabled={loading}
            className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Avsluta Session
          </button>
        ) : (
          <div className="col-span-2 space-y-2">
            <p className="text-sm text-center text-gray-700 font-medium">
              Är du säker? Detta avslutar sessionen för alla deltagare.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Avbryt
              </button>
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Avslutar...' : 'Ja, Avsluta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
