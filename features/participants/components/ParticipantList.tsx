/**
 * ParticipantList Component
 * 
 * Real-time display of session participants with host controls.
 */

'use client';

import { useState } from 'react';
import { useParticipants } from '../hooks/useParticipants';

interface ParticipantListProps {
  sessionId: string;
  sessionCode: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds} sek sedan`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  return `${days} dagar sedan`;
}

export function ParticipantList({ sessionId, sessionCode }: ParticipantListProps) {
  const { 
    participants, 
    loading, 
    error,
    kickParticipant,
    blockParticipant,
    updateParticipantRole,
  } = useParticipants({ sessionId });
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const handleKick = async (participantId: string, displayName: string) => {
    if (!confirm(`Säker på att du vill kicka ${displayName}?`)) return;
    try {
      setActionLoading(participantId);
      await kickParticipant(participantId);
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleBlock = async (participantId: string, displayName: string) => {
    if (!confirm(`Blockera ${displayName}?`)) return;
    try {
      setActionLoading(participantId);
      await blockParticipant(participantId);
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleRoleChange = async (participantId: string, newRole: string) => {
    const validRoles = ['observer', 'player', 'team_lead', 'facilitator'] as const;
    if (!validRoles.includes(newRole as typeof validRoles[number])) return;
    
    try {
      setActionLoading(participantId);
      await updateParticipantRole(participantId, newRole as typeof validRoles[number]);
    } finally {
      setActionLoading(null);
    }
  };
  
  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      observer: 'Observatör',
      player: 'Spelare',
      team_lead: 'Lagledare',
      facilitator: 'Handledare',
    };
    return labels[role] || role;
  };
  
  const getStatusBadge = (status: string, lastSeen: string) => {
    const minutesAgo = (Date.now() - new Date(lastSeen).getTime()) / 1000 / 60;
    
    if (status === 'kicked' || status === 'blocked') {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">{status === 'kicked' ? 'Kickad' : 'Blockerad'}</span>;
    }
    if (status === 'disconnected' || minutesAgo > 5) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Frånkopplad</span>;
    }
    if (minutesAgo > 2) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Inaktiv</span>;
    }
    return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Aktiv</span>;
  };
  
  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
  }
  
  if (error) {
    return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">Fel: {error.message}</div>;
  }
  
  const activeParticipants = participants.filter(p => p.status !== 'kicked' && p.status !== 'blocked');
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Deltagare ({activeParticipants.length})</h2>
        <p className="text-sm text-gray-600 mt-1">Kod: <span className="font-mono font-bold text-lg">{sessionCode}</span></p>
      </div>
      
      {activeParticipants.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">Inga deltagare ännu</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namn</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gick med</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Åtgärder</th>
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
                  <td className="px-4 py-3 text-sm">{getRoleLabel(p.role)}</td>
                  <td className="px-4 py-3">{getStatusBadge(p.status, p.last_seen_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{timeAgo(p.joined_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value)}
                        disabled={actionLoading === p.id}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="observer">Observatör</option>
                        <option value="player">Spelare</option>
                        <option value="team_lead">Lagledare</option>
                        <option value="facilitator">Handledare</option>
                      </select>
                      <button
                        onClick={() => handleKick(p.id, p.display_name)}
                        disabled={actionLoading === p.id}
                        className="px-3 py-1 text-sm text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                      >
                        Kicka
                      </button>
                      <button
                        onClick={() => handleBlock(p.id, p.display_name)}
                        disabled={actionLoading === p.id}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      >
                        Blockera
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
