/**
 * ParticipantList Component
 * 
 * Real-time display of session participants with host controls.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParticipants } from '../hooks/useParticipants';
import { ParticipantRoleSelector } from './ParticipantRoleSelector';

interface ParticipantListProps {
  sessionId: string;
  sessionCode: string;
}

function timeAgo(date: string, t: (key: string, values?: Record<string, number>) => string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return t('timeAgo.seconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('timeAgo.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('timeAgo.hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('timeAgo.days', { count: days });
}

export function ParticipantList({ sessionId, sessionCode }: ParticipantListProps) {
  const t = useTranslations('play.participantHostList');
  const { 
    participants, 
    loading, 
    error,
    refetch,
    kickParticipant,
    blockParticipant,
  } = useParticipants({ sessionId });
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const handleKick = async (participantId: string, displayName: string) => {
    if (!confirm(t('confirm.kick', { name: displayName }))) return;
    try {
      setActionLoading(participantId);
      await kickParticipant(participantId);
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleBlock = async (participantId: string, displayName: string) => {
    if (!confirm(t('confirm.block', { name: displayName }))) return;
    try {
      setActionLoading(participantId);
      await blockParticipant(participantId);
    } finally {
      setActionLoading(null);
    }
  };
  
  const getStatusBadge = (status: string, lastSeen: string) => {
    const minutesAgo = (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60;
    
    if (status === 'kicked' || status === 'blocked') {
      return (
        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
          {status === 'kicked' ? t('status.kicked') : t('status.blocked')}
        </span>
      );
    }
    if (status === 'disconnected' || minutesAgo > 5) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">{t('status.disconnected')}</span>;
    }
    if (minutesAgo > 2) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">{t('status.idle')}</span>;
    }
    return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">{t('status.active')}</span>;
  };
  
  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
  }
  
  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{t('errors.title')}: {error.message}</div>;
  }
  
  const activeParticipants = participants.filter(p => p.status !== 'kicked' && p.status !== 'blocked');
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('header.title', { count: activeParticipants.length })}</h2>
        <p className="text-sm text-gray-600 mt-1">{t('header.code', { code: sessionCode })}</p>
      </div>
      
      {activeParticipants.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">{t('empty')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.role')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.joined')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">{p.display_name[0].toUpperCase()}</span>
                      </div>
                      <span className="font-medium">{p.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <ParticipantRoleSelector
                      participantId={p.id}
                      currentRole={p.role}
                      sessionId={sessionId}
                      disabled={actionLoading === p.id}
                      onRoleChange={() => refetch()}
                    />
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(p.status, p.last_seen_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{timeAgo(p.joined_at, t)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleKick(p.id, p.display_name)}
                        disabled={actionLoading === p.id}
                        className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                      >
                        {t('actions.kick')}
                      </button>
                      <button
                        onClick={() => handleBlock(p.id, p.display_name)}
                        disabled={actionLoading === p.id}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        {t('actions.block')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
